import { test, expect, Page, Route } from '@playwright/test';

const ADMIN = { id: 1, username: 'admin', email: 'admin@email.com', role: 'admin' };

// 12 categories. Even ids have products (can't be deactivated), id 3 starts inactive.
function seed() {
    return Array.from({ length: 12 }, (_, i) => {
        const id = i + 1;
        return {
            id,
            name: `Category ${String(id).padStart(2, '0')}`,
            description: id === 1 ? 'Hand and electric grinders' : null,
            image: null,
            is_active: id !== 3,
            product_count: id % 2 === 0 ? id : 0,
            created_at: '2026-01-01T00:00:00Z',
        };
    });
}

async function setup(page: Page) {
    const categories = seed();
    const requests: { method: string; path: string; body: unknown }[] = [];
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'admin-token');
    }, ADMIN);

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    const json = (route: Route, status: number, body: unknown) =>
        route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });

    await page.route(/:4000\/categories/, async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        requests.push({ method: req.method(), path: url.pathname + url.search, body: req.postDataJSON?.() ?? null });
        if (req.headers()['authorization'] !== 'Bearer admin-token') return json(route, 401, { msg: 'Missing Authorization Header' });

        const one = url.pathname.match(/^\/categories\/(\d+)$/);
        const restore = url.pathname.match(/^\/categories\/restore\/(\d+)$/);
        const find = (id: string) => categories.find((c) => c.id === Number(id));

        if (req.method() === 'GET' && url.pathname === '/categories') return json(route, 200, categories);
        if (req.method() === 'GET' && one) {
            const c = find(one[1]);
            return c ? json(route, 200, c) : json(route, 404, { error: 'not found' });
        }
        if (req.method() === 'DELETE' && one) {
            const c = find(one[1])!;
            if (c.product_count > 0) return json(route, 409, { error: `Category cannot be deactivated because it still has ${c.product_count} active product(s)` });
            c.is_active = false;
            return json(route, 200, { message: 'Category deleted successfully' });
        }
        if (req.method() === 'PUT' && restore) {
            const c = find(restore[1])!;
            c.is_active = true;
            return json(route, 200, { message: 'Category restored successfully', category: c });
        }
        if (req.method() === 'PUT' && one) {
            const c = find(one[1])!;
            Object.assign(c, req.postDataJSON());
            return json(route, 200, c);
        }
        if (req.method() === 'POST' && url.pathname === '/categories') {
            return json(route, 201, { ...req.postDataJSON(), id: 13, is_active: true, product_count: 0 });
        }
        return route.continue();
    });
    page.on('dialog', (d) => d.accept());
    return { requests };
}

const rows = (page: Page) => page.getByTestId(/^admin-category-\d+$/);

test('lists categories with product counts, status and pagination', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/categories');

    await expect(page.getByRole('heading', { name: 'Category List' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Number of Product\(s\)/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Price/ })).toHaveCount(0);
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByTestId('showing')).toHaveText('Showing 1 to 10 of 12 entries');
    await expect(page.getByTestId('admin-count-4')).toHaveText('4');
    await expect(page.getByTestId('admin-status-3')).toHaveText('Deactive');
    await expect(page.getByTestId('admin-category-1')).toContainText('Hand and electric grinders');
    await expect(page.getByTestId('edit-2')).toHaveAttribute('href', '/dashboard/categories/2');
    await expect(page.getByTestId('add-category')).toHaveAttribute('href', '/dashboard/categories/new');
    expect(requests.some((r) => r.path === '/categories?include_inactive=true')).toBe(true);

    await page.getByTestId('page-2').click();
    await expect(rows(page)).toHaveCount(2);

    await page.getByTestId('sort-count').click(); // asc
    await page.getByTestId('sort-count').click(); // desc
    await page.getByTestId('page-1').click();
    await expect(rows(page).first()).toContainText('Category 12');
});

test('categories with active products cannot be deactivated', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/categories');
    await expect(page.getByTestId('deactivate-2')).toBeDisabled();
    await expect(page.getByTestId('deactivate-2')).toHaveAttribute('title', /2 active product/);
});

test('deactivate and reactivate an empty category', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/categories');

    await page.getByTestId('deactivate-1').click();
    await expect(page.getByTestId('admin-status-1')).toHaveText('Deactive');
    await page.getByTestId('activate-1').click();
    await expect(page.getByTestId('admin-status-1')).toHaveText('Active');
});

test('bulk deactivate skips categories that still have products', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/categories');

    await page.getByRole('checkbox', { name: 'Select Category 01' }).check();
    await page.getByRole('checkbox', { name: 'Select Category 02' }).check();
    await page.getByRole('checkbox', { name: 'Select Category 05' }).check();
    await expect(page.getByTestId('bulk-deactivate')).toHaveText('Deactivate (3)');
    await page.getByTestId('bulk-deactivate').click();

    await expect(page.getByTestId('admin-status-1')).toHaveText('Deactive');
    await expect(page.getByTestId('admin-status-5')).toHaveText('Deactive');
    await expect(page.getByTestId('admin-status-2')).toHaveText('Active');
    await expect(page.getByTestId('toast-error')).toContainText('2 deactivated');
    await expect(page.getByTestId('toast-error')).toContainText('skipped Category 02');
});

test('edit a category', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/categories/1');

    await expect(page.getByRole('heading', { name: /Edit Category/ })).toBeVisible();
    await expect(page.getByTestId('editor-name')).toHaveValue('Category 01');
    await expect(page.getByTestId('editor-product-count')).toHaveText('0 active products');
    await expect(page.getByTestId('save-category')).toBeDisabled();

    await page.getByTestId('editor-name').fill('Coffee Grinder');
    await page.getByTestId('editor-image').fill('https://example.com/grinder.jpg');
    await page.getByTestId('save-category').click();

    await expect(page.getByTestId('editor-success')).toHaveText('Category saved');
    const put = requests.find((r) => r.method === 'PUT');
    expect(put?.body).toMatchObject({ name: 'Coffee Grinder', description: 'Hand and electric grinders', image: 'https://example.com/grinder.jpg' });
});

test('category editor validates before saving', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/categories/1');
    await expect(page.getByTestId('editor-name')).toHaveValue('Category 01');

    await page.getByTestId('editor-name').fill('');
    await page.getByTestId('editor-image').fill('not-a-url');
    await page.getByTestId('save-category').click();

    await expect(page.getByText('Category name is required')).toBeVisible();
    await expect(page.getByText('Image must be a URL starting with http:// or https://')).toBeVisible();
    expect(requests.some((r) => r.method === 'PUT')).toBe(false);
});

test('add a new category and return to the list', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/categories/new');
    await expect(page.getByRole('heading', { name: 'Add New Category' })).toBeVisible();

    await page.getByTestId('editor-name').fill('Pour-over');
    await page.getByTestId('editor-description').fill('Drippers and filters');
    await page.getByTestId('save-category').click();

    await expect(page).toHaveURL('/dashboard/categories');
    expect(requests.find((r) => r.method === 'POST')?.body).toMatchObject({ name: 'Pour-over', description: 'Drippers and filters', image: '' });
});

test('unknown category shows not found', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/categories/999');
    await expect(page.getByTestId('editor-not-found')).toContainText('Category not found');
});
