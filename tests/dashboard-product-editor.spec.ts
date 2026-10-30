import { test, expect, Page, Route } from '@playwright/test';

const ADMIN = { id: 1, username: 'admin', email: 'admin@email.com', role: 'admin' };

async function setup(page: Page) {
    const product = {
        id: 5, name: 'RevoGrinder II', slug: 'revogrinder-ii', category_id: 1, category: 'Electronics',
        price: 149.99, stock_quantity: 3, description: 'Hand grinder', image: null as string | null,
        created_at: '2026-01-01T00:00:00Z', is_active: false,
    };
    const requests: { method: string; path: string; body: unknown }[] = [];

    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'admin-token');
    }, ADMIN);

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    const json = (route: Route, status: number, body: unknown) =>
        route.fulfill({ status, contentType: 'application/json', headers: cors, body: JSON.stringify(body) });

    await page.route(/:4000\/products/, async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        requests.push({ method: req.method(), path: url.pathname + url.search, body: req.postDataJSON?.() ?? null });

        if (req.method() === 'GET' && url.pathname === '/products/5') return json(route, 200, product);
        if (req.method() === 'GET' && url.pathname === '/products/999') return json(route, 404, { error: 'not found' });
        if (req.method() === 'GET' && url.pathname === '/products') return json(route, 200, [product]);
        if (req.method() === 'PUT' && url.pathname === '/products/5') {
            Object.assign(product, req.postDataJSON());
            return json(route, 200, product);
        }
        if (req.method() === 'POST' && url.pathname === '/products') {
            return json(route, 201, { ...req.postDataJSON(), id: 6, is_active: true });
        }
        return route.continue();
    });
    page.on('dialog', (d) => d.accept());
    return { requests };
}

test('loads an (inactive) product and saves edits', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/products/5');

    await expect(page.getByRole('heading', { name: /Edit Product/ })).toBeVisible();
    await expect(page.getByTestId('editor-status')).toHaveText('Deactive');
    await expect(page.getByTestId('editor-name')).toHaveValue('RevoGrinder II');
    await expect(page.getByTestId('editor-category_id')).toHaveValue('1');
    await expect(page.getByTestId('editor-price')).toHaveValue('149.99');
    await expect(page.getByTestId('editor-stock_quantity')).toHaveValue('3');
    await expect(page.getByTestId('editor-description-count')).toHaveText('12/500');
    expect(requests.some((r) => r.path === '/products/5?include_inactive=true')).toBe(true);

    // Nothing changed yet.
    await expect(page.getByTestId('save-product')).toBeDisabled();

    await page.getByTestId('editor-price').fill('129,50'); // comma becomes a dot
    await expect(page.getByTestId('editor-price')).toHaveValue('129.50');
    await page.getByTestId('editor-image').fill('https://example.com/grinder.jpg');
    await expect(page.getByTestId('unsaved')).toBeVisible();
    await page.getByTestId('save-product').click();

    await expect(page.getByTestId('editor-success')).toHaveText('Product saved');
    await expect(page.getByTestId('unsaved')).toHaveCount(0);
    const put = requests.find((r) => r.method === 'PUT');
    expect(put?.body).toMatchObject({ name: 'RevoGrinder II', category_id: 1, price: 129.5, stock_quantity: 3, image: 'https://example.com/grinder.jpg' });
});

test('validates fields before saving', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/products/5');
    await expect(page.getByTestId('editor-name')).toHaveValue('RevoGrinder II');

    await page.getByTestId('editor-name').fill('');
    await page.getByTestId('editor-price').fill('0');
    await page.getByTestId('editor-image').fill('not-a-url');
    await page.getByTestId('editor-description').fill('x'.repeat(501));
    await page.getByTestId('save-product').click();

    await expect(page.getByText('Product name is required')).toBeVisible();
    await expect(page.getByText('Price must be greater than 0')).toBeVisible();
    await expect(page.getByText('Image must be a URL starting with http:// or https://')).toBeVisible();
    await expect(page.getByText('Description cannot exceed 500 characters')).toBeVisible();
    // Focus goes to the first invalid field in page order (the image card is on the left).
    await expect(page.getByTestId('editor-image')).toBeFocused();
    expect(requests.some((r) => r.method === 'PUT')).toBe(false);
});

test('remove image clears the URL', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/products/5');
    await page.getByTestId('editor-image').fill('https://example.com/grinder.jpg');
    await page.getByTestId('editor-preview').hover();
    await page.getByTestId('editor-remove-image').click();
    await expect(page.getByTestId('editor-image')).toHaveValue('');
    await expect(page.getByTestId('editor-preview')).toContainText('No image');
});

test('unknown product shows not found', async ({ page }) => {
    await setup(page);
    await page.goto('/dashboard/products/999');
    await expect(page.getByTestId('editor-not-found')).toContainText('Product not found');
});

test('add new product creates it and returns to the list', async ({ page }) => {
    const { requests } = await setup(page);
    await page.goto('/dashboard/products/new');
    await expect(page.getByRole('heading', { name: 'Add New Product' })).toBeVisible();

    await page.getByTestId('editor-name').fill('Gooseneck Kettle');
    await page.getByTestId('editor-category_id').selectOption('1');
    await page.getByTestId('editor-price').fill('39.99');
    await page.getByTestId('editor-stock_quantity').fill('12');
    await page.getByTestId('editor-description').fill('Precise pour');
    await page.getByTestId('save-product').click();

    await expect(page).toHaveURL('/dashboard/products');
    const post = requests.find((r) => r.method === 'POST');
    expect(post?.body).toMatchObject({ name: 'Gooseneck Kettle', category_id: 1, price: 39.99, stock_quantity: 12 });
});
