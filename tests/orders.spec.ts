import { test, expect, Page, Route } from '@playwright/test';

const USER = { id: 2, username: 'shopper', email: 'shopper@email.com', role: 'user' };

const laptop = { product_id: 1, quantity: 1, price_at_order: 15000000, name: 'Laptop', slug: 'laptop', category: 'Electronics', image: null };
const keyboard = { product_id: 2, quantity: 1, price_at_order: 1500000, name: 'Keyboard', slug: 'keyboard', category: 'Accessories', image: null };
const mouse = { product_id: 3, quantity: 1, price_at_order: 500000, name: 'Mouse', slug: 'mouse', category: 'Accessories', image: null };

// Orders are mocked per test with page.route so cancelling in one browser
// doesn't leak into another. The real backend only returns the caller's orders.
function seedOrders() {
    return [
        { id: 11, user_id: 2, email: 'shopper@email.com', total_price: 16500015, shipping_cost: 15, status: 'pending',
          ordered_at: new Date(Date.now() - 2 * 60_000).toUTCString(), items: [laptop, keyboard],
          first_name: 'Farras', last_name: 'Ahmad', phone: '081234567890', address: 'Jl. Kopi No. 1', apartment: 'Unit 5',
          city: 'Jakarta Selatan', province: 'DKI Jakarta', postal_code: '12345', country: 'Indonesia',
          shipping_method: 'fast', payment_method: 'qris', note: 'Please wrap it' },
        { id: 10, user_id: 2, total_price: 1500000, shipping_cost: 0, status: 'completed',
          ordered_at: new Date(Date.now() - 3 * 86_400_000).toUTCString(), items: [keyboard] },
        { id: 9, user_id: 2, total_price: 500000, shipping_cost: 0, status: 'cancelled',
          ordered_at: new Date(Date.now() - 30 * 86_400_000).toUTCString(), items: [mouse] },
    ];
}

async function setup(page: Page, orders = seedOrders()) {
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'fake-token');
    }, USER);

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    const json = (route: Route, status: number, body: unknown) =>
        route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });

    await page.route(/:4000\/orders(\/\d+)?$/, async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        if (req.headers()['authorization'] !== 'Bearer fake-token') return json(route, 401, { msg: 'Missing Authorization Header' });

        const idMatch = req.url().match(/\/orders\/(\d+)$/);
        const order = idMatch ? orders.find((o) => o.id === Number(idMatch[1])) : undefined;
        if (req.method() === 'GET' && !idMatch) {
            return json(route, orders.length ? 200 : 404, orders.length ? orders : { error: 'No available order' });
        }
        if (!order) return json(route, 404, { error: 'Order not found' });
        if (req.method() === 'GET') return json(route, 200, order);
        if (req.method() === 'PUT') {
            order.status = JSON.parse(req.postData() ?? '{}').status;
            return json(route, 200, order);
        }
        return route.continue();
    });
}

test('upcoming tab lists pending orders with product info and progress', async ({ page }) => {
    await setup(page);
    await page.goto('/orders');

    await expect(page.getByTestId('orders-tab-upcoming')).toHaveText('Upcoming Orders (1)');
    await expect(page.getByTestId('orders-tab-previous')).toHaveText('Previous Orders (2)');

    const order = page.getByTestId('order-11');
    await expect(order).toContainText('Order no #11');
    await expect(order).toContainText('Laptop & 1 more');
    await expect(page.getByTestId('order-total-11')).toHaveText('$16,500,015.00');
    await expect(order).toContainText('2 Items');
    await expect(order).toContainText('2 minutes ago');
    await expect(order.getByRole('listitem').filter({ hasText: 'Processing' })).toHaveAttribute('aria-current', 'step');
    await expect(page.getByTestId('order-details-11')).toHaveAttribute('href', '/orders/11');
});

test('previous tab lists completed and cancelled orders without a cancel button', async ({ page }) => {
    await setup(page);
    await page.goto('/orders');
    await page.getByTestId('orders-tab-previous').click();

    await expect(page.getByTestId('order-status-10')).toHaveText('Completed');
    await expect(page.getByTestId('order-status-9')).toHaveText('Cancelled');
    await expect(page.getByTestId('cancel-order-10')).toHaveCount(0);
    await expect(page.getByTestId('cancel-order-9')).toHaveCount(0);
});

test('cancelling a pending order asks for confirmation and moves it to previous orders', async ({ page }) => {
    await setup(page);
    await page.goto('/orders');

    await page.getByTestId('cancel-order-11').click();
    await page.getByRole('button', { name: 'Keep order' }).click();
    await expect(page.getByTestId('order-11')).toBeVisible();

    await page.getByTestId('cancel-order-11').click();
    await page.getByTestId('confirm-cancel-11').click();

    await expect(page.getByTestId('orders-tab-upcoming')).toHaveText('Upcoming Orders (0)');
    await expect(page.getByTestId('orders-empty')).toContainText('no upcoming orders');

    await page.getByTestId('orders-tab-previous').click();
    await expect(page.getByTestId('order-status-11')).toHaveText('Cancelled');
});

test('no orders at all shows the empty state', async ({ page }) => {
    await setup(page, []);
    await page.goto('/orders');
    await expect(page.getByTestId('orders-empty')).toBeVisible();
});

test('order detail shows items, totals, customer details and activity', async ({ page: browserPage }) => {
    await setup(browserPage);
    // Direct visit: Next keeps the previous route mounted (hidden) after client navigation,
    // which would make test ids like cancel-order-11 match twice.
    await browserPage.goto('/orders/11');
    const page = browserPage.getByTestId('order-detail-page');

    await expect(page.getByRole('heading', { name: 'Order Number #11' })).toBeVisible();
    await expect(page.getByTestId('order-item-1')).toContainText('Laptop');
    await expect(page.getByTestId('order-item-1')).toContainText('Electronics');
    await expect(page.getByTestId('order-item-2')).toContainText('Qty: 1');
    await expect(page.getByTestId('order-subtotal')).toHaveText('$16,500,000.00');
    await expect(page.getByTestId('order-shipping')).toHaveText('$15.00');
    await expect(page.getByTestId('order-total')).toHaveText('$16,500,015.00');
    await expect(page.getByTestId('order-note')).toHaveText('Please wrap it');

    const details = page.getByTestId('customer-details');
    await expect(details).toContainText('Farras Ahmad');
    await expect(details).toContainText('shopper@email.com');
    await expect(details).toContainText('Jl. Kopi No. 1, Unit 5');
    await expect(details).toContainText('DKI Jakarta');
    await expect(details).toContainText('Fast');
    await expect(details).toContainText('QRIS');
    await expect(page.getByTestId('order-status')).toHaveText('pending');

    const activity = page.getByTestId('order-activity');
    await expect(activity.getByRole('listitem')).toHaveCount(2);
    await expect(activity.getByRole('listitem').first()).toContainText('Order Processing');
    await expect(activity.getByRole('listitem').last()).toContainText('Order Placed');

    // Cancelling from the detail page updates status and activity.
    await page.getByTestId('cancel-order-11').click();
    await page.getByTestId('confirm-cancel-11').click();
    await expect(page.getByTestId('order-status')).toHaveText('cancelled');
    await expect(activity.getByRole('listitem').first()).toContainText('Order Cancelled');
    await expect(page.getByTestId('cancel-order-11')).toHaveCount(0);
});

test('older orders without checkout details show N/A', async ({ page }) => {
    await setup(page);
    await page.goto('/orders/10');
    await expect(page.getByTestId('customer-details')).toContainText('N/A');
    await expect(page.getByTestId('order-activity').getByRole('listitem')).toHaveCount(3);
});

test('unknown or foreign order shows not found', async ({ page }) => {
    await setup(page);
    await page.goto('/orders/999');
    await expect(page.getByTestId('order-not-found')).toContainText('Order not found');
});
