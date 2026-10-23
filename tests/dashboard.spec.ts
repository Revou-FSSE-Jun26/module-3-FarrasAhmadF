import { test, expect, Route } from '@playwright/test';

const ADMIN_USER = {
    id: 1,
    username: 'admin',
    email: 'admin@email.com',
    role: 'admin',
};

test('an admin can create, edit, and delete a product', async ({ page }) => {
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'fake-admin-token');
    }, ADMIN_USER);

    let products: Array<{
        id: number;
        name: string;
        price: number;
        stock_quantity: number;
        category_id: number;
        created_at: string;
    }> = [];
    let nextId = 7;

    await page.route('**/products**', async (route: Route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());
        const match = url.pathname.match(/\/products\/(\d+)$/);
        const id = match ? Number(match[1]) : null;

        if (method === 'GET' && id === null) {
            await route.fulfill({ json: products });
            return;
        }

        if (method === 'POST' && id === null) {
            const body = request.postDataJSON();
            const created = {
                id: nextId++,
                name: body.name,
                price: body.price,
                stock_quantity: body.stock_quantity,
                category_id: body.category_id,
                created_at: new Date().toISOString(),
            };
            products.push(created);
            await route.fulfill({ status: 201, json: created });
            return;
        }

        if (method === 'PUT' && id !== null) {
            const body = request.postDataJSON();
            const idx = products.findIndex((p) => p.id === id);
            products[idx] = { ...products[idx], ...body };
            await route.fulfill({ json: products[idx] });
            return;
        }

        if (method === 'DELETE' && id !== null) {
            products = products.filter((p) => p.id !== id);
            await route.fulfill({ status: 204, body: '' });
            return;
        }

        await route.continue();
    });

    page.on('dialog', (d) => d.accept());

    await page.goto('/dashboard');

    await page.getByTestId('add-product-button').click();
    await page.getByTestId('name-input').fill('Mouse');
    await page.getByTestId('price-input').fill('99000');
    await page.getByTestId('category-id-input').fill('2');
    await page.getByTestId('stock-quantity-input').fill('10');
    await page.getByTestId('save-product').click();

    await expect(page.getByTestId('toast-success')).toBeVisible();
    const row = page.getByTestId('product-row-7');
    await expect(row).toBeVisible();
    await expect(row).toContainText('Mouse');
    await expect(row).toContainText('Rp 99.000');

    await page.getByTestId('edit-product-7').click();
    await page.getByTestId('price-input').fill('79000');
    await page.getByTestId('save-product').click();

    await expect(page.getByTestId('product-row-7')).toContainText('Rp 79.000');

    await page.getByTestId('delete-product-7').click();
    await expect(page.getByTestId('product-row-7')).toBeHidden();
});
