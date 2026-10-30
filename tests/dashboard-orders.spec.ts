import { test, expect, Page, Route } from '@playwright/test';

const ADMIN = { id: 1, username: 'boss', email: 'boss@email.com', role: 'admin' };

const item = (product_id: number, name: string, quantity = 1, price = 10) =>
    ({ product_id, name, quantity, price_at_order: price, slug: name.toLowerCase(), category: 'Coffee Grinder', image: null });

// 13 orders. Local-time timestamps (no "Z") so the date filter test doesn't depend on the runner's timezone.
function seed() {
    return Array.from({ length: 13 }, (_, i) => {
        const id = 100 + i + 1;
        const status = id === 102 ? 'completed' : id === 103 ? 'cancelled' : 'pending';
        return {
            id,
            user_id: 2,
            username: 'shopper',
            email: 'shopper@email.com',
            first_name: id === 101 ? 'Farras' : null,
            last_name: id === 101 ? 'Ahmad' : null,
            total_price: id * 10,
            shipping_cost: 0,
            status,
            payment_method: id === 101 ? 'qris' : null,
            ordered_at: `2026-03-${String(i + 1).padStart(2, '0')}T10:00:00`,
            items: id === 101 ? [item(1, 'RevoGrinder II', 2), item(2, 'RevoScale Mini')] : [item(3, 'RevoKettle KS2')],
        };
    });
}

async function setup(page: Page) {
    const orders = seed();
    const requests: { method: string; path: string; body: unknown }[] = [];
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'admin-token');
    }, ADMIN);

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    const json = (route: Route, status: number, body: unknown) =>
        route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });

    await page.route(/:4000\/orders/, async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        requests.push({ method: req.method(), path: url.pathname, body: req.postDataJSON?.() ?? null });
        if (req.headers()['authorization'] !== 'Bearer admin-token') return json(route, 401, { msg: 'Missing Authorization Header' });

        const one = url.pathname.match(/^\/orders\/(\d+)$/);
        if (req.method() === 'GET' && url.pathname === '/orders') return json(route, 200, orders);
        const order = one ? orders.find((o) => o.id === Number(one[1])) : undefined;
        if (one && !order) return json(route, 404, { error: 'not found' });
        if (req.method() === 'GET' && order) return json(route, 200, order);
        if (req.method() === 'PUT' && order) {
            if (order.status !== 'pending') return json(route, 400, { error: 'Cannot update a completed or cancelled order' });
            order.status = req.postDataJSON().status;
            return json(route, 200, order);
        }
        return route.continue();
    });
    page.on('dialog', (d) => d.accept());
    return { requests };
}

const rows = (page: Page) => page.getByTestId(/^admin-order-\d+$/);

test('one row per order with customer, amount and status', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/orders');

    await expect(page.getByRole('heading', { name: 'Orders List' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Product Name/ })).toHaveCount(0);
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByTestId('showing')).toHaveText('Showing 1 to 10 of 13 entries');
    // Newest first.
    await expect(rows(page).first()).toContainText('#113');

    await page.getByTestId('page-2').click();
    const multi = page.getByTestId('admin-order-101');
    await expect(multi).toContainText('3 items');
    await expect(multi).toContainText('RevoGrinder II & 1 more');
    await expect(page.getByTestId('admin-customer-101')).toHaveText('Farras Ahmad');
    await expect(page.getByTestId('admin-customer-102')).toHaveText('shopper'); // falls back to username
    await expect(page.getByTestId('admin-amount-101')).toHaveText('$1,010.00');
    await expect(multi).toContainText('Paid by QRIS');
    await expect(page.getByTestId('admin-status-103')).toHaveText('cancelled');
    await expect(page.getByTestId('details-101')).toHaveAttribute('href', '/dashboard/orders/101');
});

test('search, status and date filters', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/orders');

    await page.getByTestId('order-search').fill('#101');
    await expect(rows(page)).toHaveCount(1);
    await page.getByTestId('order-search').fill('scale mini');
    await expect(rows(page)).toHaveCount(1);
    await page.getByTestId('clear-filters').click();
    await expect(rows(page)).toHaveCount(10);

    await page.getByTestId('status-filter').selectOption('completed');
    await expect(rows(page)).toHaveCount(1);
    await page.getByTestId('status-filter').selectOption('all');

    await page.getByTestId('date-from').fill('2026-03-02');
    await page.getByTestId('date-to').fill('2026-03-04');
    await expect(rows(page)).toHaveCount(3);
    await page.getByTestId('date-to').fill('2026-02-01');
    await expect(page.getByTestId('orders-empty')).toContainText('No orders match');
});

test('quick actions change status; final orders have no menu', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/orders');

    await page.getByTestId('more-113').click();
    await page.getByTestId('complete-113').click();
    await expect(page.getByTestId('admin-status-113')).toHaveText('completed');
    await expect(page.getByTestId('toast-success')).toHaveText('Order #113 marked as completed');
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ status: 'completed' });
    await expect(page.getByTestId('more-113')).toBeDisabled();

    await page.getByTestId('more-112').click();
    await page.getByTestId('cancel-112').click();
    await expect(page.getByTestId('admin-status-112')).toHaveText('cancelled');

    // Escape closes the menu without doing anything.
    await page.getByTestId('more-111').click();
    await expect(page.getByTestId('complete-111')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('complete-111')).toHaveCount(0);
});

test('admin order detail lets the admin update the status', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/orders/101');

    await expect(page.getByRole('heading', { name: 'Order Number #101' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Orders List' })).toHaveAttribute('href', '/dashboard/orders');
    await expect(page.getByTestId('customer-details')).toContainText('shopper (#2)');
    // Customer-only buttons are hidden for admins.
    await expect(page.getByTestId('message-cs')).toHaveCount(0);
    await expect(page.getByTestId('cancel-order-101')).toHaveCount(0);

    await expect(page.getByTestId('save-status')).toBeDisabled();
    await page.getByTestId('status-select').selectOption('completed');
    await page.getByTestId('save-status').click();

    await expect(page.getByTestId('status-final')).toContainText('completed');
    await expect(page.getByTestId('order-activity').getByRole('listitem').first()).toContainText('Order Completed');
    expect(requests.find((r) => r.method === 'PUT')?.body).toEqual({ status: 'completed' });
});

test('final orders cannot be edited on the detail page', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/orders/103');
    await expect(page.getByTestId('status-final')).toContainText('cancelled');
    await expect(page.getByTestId('status-select')).toHaveCount(0);
});

test('unknown order shows not found with a link back to the list', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/orders/999');
    await expect(page.getByTestId('order-not-found')).toContainText('Order not found');
    await expect(page.getByRole('link', { name: 'Back to Orders List' })).toHaveAttribute('href', '/dashboard/orders');
});
