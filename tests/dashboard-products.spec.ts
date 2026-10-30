import { test, expect, Page, Route } from '@playwright/test';

const ADMIN = { id: 1, username: 'admin', email: 'admin@email.com', role: 'admin' };

// 23 products: odd ids active, every 5th inactive. Product 20 is "in an order" (DELETE -> 409).
function seed() {
    return Array.from({ length: 23 }, (_, i) => {
        const id = i + 1;
        return {
            id,
            name: `Coffee Item ${String(id).padStart(2, '0')}`,
            slug: `coffee-item-${id}`,
            category_id: 1,
            category: 'Coffee Grinder',
            price: id * 10,
            stock_quantity: 5,
            created_at: '2026-01-01T00:00:00Z',
            image: null,
            is_active: id % 5 !== 0,
        };
    });
}

async function setup(page: Page, { role = 'admin' } = {}) {
    const products = seed();
    const calls: string[] = [];
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'admin-token');
        // Reset the sidebar only on the first load of the test, not on reload.
        if (!sessionStorage.getItem('seeded')) {
            localStorage.removeItem('admin-sidebar-open');
            sessionStorage.setItem('seeded', '1');
        }
    }, { ...ADMIN, role });

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    const json = (route: Route, status: number, body: unknown) =>
        route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });

    // Only intercept API calls (port 4000), not the /dashboard/products page itself.
    await page.route(/:4000\/products/, async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        calls.push(`${req.method()} ${url.pathname}${url.search}`);
        if (req.headers()['authorization'] !== 'Bearer admin-token') return json(route, 401, { msg: 'Missing Authorization Header' });

        if (req.method() === 'GET' && url.pathname === '/products' && url.searchParams.get('include_inactive') === 'true') {
            return json(route, 200, products);
        }
        const restore = url.pathname.match(/^\/products\/restore\/(\d+)$/);
        if (restore && req.method() === 'PUT') {
            const p = products.find((x) => x.id === Number(restore[1]))!;
            p.is_active = true;
            return json(route, 200, { message: 'Product restored successfully', product: p });
        }
        const del = url.pathname.match(/^\/products\/(\d+)$/);
        if (del && req.method() === 'DELETE') {
            const id = Number(del[1]);
            if (id === 20) return json(route, 409, { error: 'Product cannot be deleted because it is still used in one or more orders' });
            products.find((x) => x.id === id)!.is_active = false;
            return json(route, 200, { message: 'Product deleted successfully' });
        }
        return route.continue();
    });

    page.on('dialog', (d) => d.accept());
    return { calls };
}

const rows = (page: Page) => page.getByTestId(/^admin-product-\d+$/);

test('lists products with status badges and paginates', async ({ page }) => {
    const { calls } = await setup(page);
    await page.goto('/dashboard/products');

    await expect(page.getByRole('heading', { name: 'Product List' })).toBeVisible();
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByTestId('showing')).toHaveText('Showing 1 to 10 of 23 entries');
    await expect(page.getByTestId('admin-status-1')).toHaveText('Active');
    await expect(page.getByTestId('admin-status-5')).toHaveText('Deactive');
    await expect(page.getByTestId('admin-price-3')).toHaveText('$30.00');
    await expect(page.getByTestId('edit-3')).toHaveAttribute('href', '/dashboard/products/3');
    await expect(page.getByTestId('add-product')).toHaveAttribute('href', '/dashboard/products/new');
    expect(calls).toContain('GET /products?include_inactive=true');

    await page.getByTestId('page-3').click();
    await expect(rows(page)).toHaveCount(3);
    await expect(page.getByTestId('showing')).toHaveText('Showing 21 to 23 of 23 entries');

    await page.getByTestId('page-size').selectOption('25');
    await expect(rows(page)).toHaveCount(23);
});

test('search and sort', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/products');

    await page.getByTestId('product-search').fill('item 1');
    await expect(page.getByTestId('showing')).toHaveText('Showing 1 to 10 of 10 entries');

    await page.getByTestId('product-search').fill('');
    await page.getByTestId('sort-price').click(); // asc
    await page.getByTestId('sort-price').click(); // desc
    await expect(rows(page).first()).toContainText('Coffee Item 23');

    await page.getByTestId('product-search').fill('nothing like this');
    await expect(page.getByTestId('products-empty')).toBeVisible();
});

test('deactivate and reactivate a product', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/products');

    await page.getByTestId('deactivate-1').click();
    await expect(page.getByTestId('admin-status-1')).toHaveText('Deactive');
    await expect(page.getByTestId('toast-success')).toContainText('deactivated');

    await page.getByTestId('activate-1').click();
    await expect(page.getByTestId('admin-status-1')).toHaveText('Active');
    await expect(page.getByTestId('toast-success')).toContainText('activated');
});

test('bulk deactivate reports products the backend refuses', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/products');
    await page.getByTestId('page-size').selectOption('25');

    await expect(page.getByTestId('bulk-deactivate')).toBeDisabled();
    await page.getByRole('checkbox', { name: 'Select Coffee Item 02' }).check();
    await page.getByRole('checkbox', { name: 'Select Coffee Item 20' }).check(); // already inactive: skipped
    await page.getByRole('checkbox', { name: 'Select Coffee Item 21' }).check();
    await expect(page.getByTestId('bulk-deactivate')).toHaveText('Deactivate (2)');
    await page.getByTestId('bulk-deactivate').click();

    await expect(page.getByTestId('admin-status-2')).toHaveText('Deactive');
    await expect(page.getByTestId('admin-status-21')).toHaveText('Deactive');
    await expect(page.getByTestId('toast-success')).toHaveText('2 product(s) deactivated');
});

test('backend refusal shows an error and keeps the product active', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/products');
    await page.getByTestId('page-size').selectOption('25');
    // Product 20 is inactive in the seed; activate it first, then try to deactivate (409).
    await page.getByTestId('activate-20').click();
    await expect(page.getByTestId('admin-status-20')).toHaveText('Active');
    await page.getByTestId('deactivate-20').click();
    await expect(page.getByTestId('toast-error')).toContainText('still used in one or more orders');
    await expect(page.getByTestId('admin-status-20')).toHaveText('Active');
});

test('admin sidebar closes without blocking the page and can be reopened', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/products');

    const sidebar = page.getByTestId('admin-sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Product Management' })).toHaveAttribute('aria-current', 'page');
    // Page stays interactive while the sidebar is open.
    await page.getByTestId('product-search').fill('Item 03');
    await expect(rows(page)).toHaveCount(1);

    await page.getByTestId('admin-sidebar-close').click();
    await expect(sidebar).toBeHidden();

    // State survives navigation.
    await page.reload();
    await expect(page.getByTestId('admin-sidebar')).toBeHidden();
    await page.getByTestId('admin-sidebar-open').click();
    await expect(page.getByTestId('admin-sidebar')).toBeVisible();
    await expect(page.getByTestId('admin-sidebar').getByRole('link', { name: 'User Management' })).toHaveAttribute('href', '/dashboard/users');
});

test('non-admins are redirected away', async ({ page }) => {
    await setup(page, { role: 'user' });
    await page.goto('/dashboard/products');
    await expect(page).toHaveURL('/');
});
