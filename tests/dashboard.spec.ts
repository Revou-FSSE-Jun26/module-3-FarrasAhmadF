import { test, expect, Page, Route } from '@playwright/test';

const ADMIN = { id: 1, username: 'boss', email: 'boss@email.com', role: 'admin' };
// "Now" = 20 Mar 2026, 12:00 WIB. Last 30 days = 19 Feb..20 Mar; previous = 20 Jan..18 Feb.
const NOW = new Date('2026-03-20T05:00:00Z');

const item = (product_id: number, name: string, category: string, quantity: number, price: number) =>
    ({ product_id, name, category, quantity, price_at_order: price, slug: name.toLowerCase(), image: null });

const ORDERS = [
    { id: 1, user_id: 2, username: 'ana', status: 'completed', total_price: 100, ordered_at: '2026-03-19T03:00:00Z',
      payment_method: 'qris', shipping_method: 'fast', province: 'DKI Jakarta',
      items: [item(1, 'RevoGrinder', 'Coffee Grinder', 2, 40), item(2, 'RevoScale', 'Coffee Scale', 1, 20)] },
    { id: 2, user_id: 2, username: 'ana', status: 'completed', total_price: 50, ordered_at: '2026-03-10T03:00:00Z',
      payment_method: 'card', shipping_method: 'regular', province: 'Jawa Barat',
      items: [item(1, 'RevoGrinder', 'Coffee Grinder', 1, 50)] },
    { id: 3, user_id: 3, username: 'budi', first_name: 'Budi', last_name: 'S', status: 'pending', total_price: 30, ordered_at: '2026-03-01T03:00:00Z',
      payment_method: 'gopay', shipping_method: 'cargo', province: 'DKI Jakarta',
      items: [item(2, 'RevoScale', 'Coffee Scale', 1, 30)] },
    { id: 4, user_id: 3, username: 'budi', status: 'cancelled', total_price: 70, ordered_at: '2026-03-15T03:00:00Z',
      payment_method: 'card', shipping_method: 'fast', province: 'Bali',
      items: [item(3, 'RevoKettle', 'Coffee Kettle', 1, 70)] },
    // Previous period.
    { id: 5, user_id: 2, username: 'ana', status: 'completed', total_price: 40, ordered_at: '2026-02-10T03:00:00Z',
      items: [item(1, 'RevoGrinder', 'Coffee Grinder', 1, 40)] },
    // 18 Feb 18:00 UTC = 19 Feb 01:00 WIB -> counts in the CURRENT period (WIB grouping).
    { id: 6, user_id: 2, username: 'ana', status: 'completed', total_price: 10, ordered_at: '2026-02-18T18:00:00Z',
      items: [item(1, 'RevoGrinder', 'Coffee Grinder', 1, 10)] },
].map((o) => ({ shipping_cost: 0, ...o }));

const PRODUCTS = [
    { id: 1, name: 'RevoGrinder', stock_quantity: 3, is_active: true },
    { id: 2, name: 'RevoScale', stock_quantity: 0, is_active: true },
    { id: 3, name: 'RevoKettle', stock_quantity: 10, is_active: true }, // only in a cancelled order
    { id: 4, name: 'Arabica Gayo', stock_quantity: 20, is_active: true },
    { id: 5, name: 'Old Filter', stock_quantity: 0, is_active: false },
];

const USERS = [
    { id: 1, role: 'admin', created_at: '2026-03-01T03:00:00Z' },
    { id: 2, role: 'user', created_at: '2026-03-05T03:00:00Z' },
    { id: 3, role: 'user', created_at: '2026-02-01T03:00:00Z' },
];

async function setup(page: Page) {
    await page.clock.setFixedTime(NOW);
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'admin-token');
    }, ADMIN);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
    const json = (route: Route, body: unknown) =>
        route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });

    await page.route(/:4000\/(orders|products|users)/, async (route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const url = new URL(req.url());
        if (url.pathname === '/orders') return json(route, ORDERS);
        if (url.pathname === '/products' && url.searchParams.get('include_inactive') === 'true') return json(route, PRODUCTS);
        if (url.pathname === '/users' && url.searchParams.get('include_inactive') === 'true') return json(route, USERS);
        return route.continue();
    });
}

test('store performance KPIs for the last 30 days (WIB)', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Store Overview' })).toBeVisible();
    await expect(page.getByTestId('period-30d')).toHaveAttribute('aria-pressed', 'true');

    // Completed only: orders 1, 2 and 6 (6 is in range because of WIB) = $160.
    await expect(page.getByTestId('kpi-revenue-value')).toHaveText('$160.00');
    await expect(page.getByTestId('kpi-revenue')).toContainText('From 3 completed orders');
    await expect(page.getByTestId('kpi-revenue')).toContainText('300.0%');
    await expect(page.getByTestId('kpi-orders-value')).toHaveText('5');
    await expect(page.getByTestId('kpi-orders')).toContainText('1 still pending');
    await expect(page.getByTestId('kpi-aov-value')).toHaveText('$53.33');
    // Admin accounts don't count as customers.
    await expect(page.getByTestId('kpi-customers-value')).toHaveText('1');
});

test('sales breakdowns', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard');

    await expect(page.getByTestId('status-chart')).toContainText('Cancellation rate 20.0%');
    await expect(page.getByTestId('status-legend')).toContainText('completed3');
    // Cancelled orders are excluded from payment/shipping/province.
    await expect(page.getByTestId('payment-breakdown')).toContainText('QRIS');
    await expect(page.getByTestId('payment-breakdown')).toContainText('Not recorded');
    await expect(page.getByTestId('province-breakdown')).toContainText('DKI Jakarta2');
    await expect(page.getByTestId('province-breakdown')).not.toContainText('Bali');
    await expect(page.getByTestId('revenue-chart').locator('svg').first()).toBeVisible();
});

test('product insight and needs action', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard');

    const top = page.getByTestId('top-products').getByRole('row');
    await expect(top.nth(1)).toContainText('RevoGrinder');
    await expect(top.nth(1)).toContainText('$140.00');
    await expect(top.nth(2)).toContainText('RevoScale');

    const alerts = page.getByTestId('stock-alerts');
    await expect(alerts).toContainText('RevoScale');
    await expect(alerts).toContainText('Out of stock');
    await expect(alerts).toContainText('3 left');
    await expect(alerts).not.toContainText('Old Filter'); // inactive

    const neverSold = page.getByTestId('never-sold');
    await expect(neverSold).toContainText('Arabica Gayo');
    await expect(neverSold).toContainText('RevoKettle'); // only ever in a cancelled order
    await expect(neverSold).not.toContainText('RevoGrinder');

    const action = page.getByTestId('needs-action');
    await expect(action).toContainText('#3');
    await expect(action).toContainText('Budi S');
    await expect(action.getByRole('link')).toHaveAttribute('href', '/dashboard/orders/3');
});

test('switching period recalculates', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard');
    await expect(page.getByTestId('kpi-revenue-value')).toHaveText('$160.00');

    // Last 7 days = 14..20 Mar: only order 1 completed; previous 7 days has order 2 ($50).
    await page.getByTestId('period-7d').click();
    await expect(page.getByTestId('kpi-revenue-value')).toHaveText('$100.00');
    await expect(page.getByTestId('kpi-revenue')).toContainText('100.0%');
    await expect(page.getByTestId('kpi-orders-value')).toHaveText('2');
    await expect(page.getByTestId('kpi-customers')).toContainText('No data for previous 7 days');

    await page.getByTestId('period-12m').click();
    await expect(page.getByTestId('kpi-revenue-value')).toHaveText('$200.00');
});
