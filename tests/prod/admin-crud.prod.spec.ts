import { test, expect, Page } from '@playwright/test';
import { ADMIN, login, uniqueId } from './helpers';

async function findRow(page: Page, name: string) {
    await page.goto('/dashboard/products');
    await expect(page.getByRole('heading', { name: 'Product List' })).toBeVisible();
    await page.getByTestId('product-search').fill(name);
    const row = page.getByTestId(/^admin-product-\d+$/).filter({ hasText: name });
    await expect(row).toHaveCount(1);
    const testId = await row.getAttribute('data-testid');
    return { row, id: testId!.replace('admin-product-', '') };
}

test('an admin creates, edits and deletes a product', async ({ page }) => {
    const name = `E2E Test Product ${uniqueId()}`;
    page.on('dialog', (d) => d.accept());

    await login(page, ADMIN.email, ADMIN.password);
    await expect(page).toHaveURL('/dashboard');

    await page.goto('/dashboard/products');
    await page.getByTestId('add-product').click();
    await expect(page).toHaveURL('/dashboard/products/new');
    await page.getByTestId('editor-name').fill(name);
    const category = page.getByTestId('editor-category_id');
    await expect(category.locator('option:not([disabled])').first()).toBeAttached();
    const categoryValue = await category.locator('option:not([disabled])').first().getAttribute('value');
    await category.selectOption(categoryValue!);
    await page.getByTestId('editor-price').fill('12.50');
    await page.getByTestId('editor-stock_quantity').fill('7');
    await page.getByTestId('editor-description').fill('Created by the production E2E test.');
    await page.getByTestId('save-product').click();
    await expect(page).toHaveURL('/dashboard/products');

    const created = await findRow(page, name);
    await expect(page.getByTestId(`admin-price-${created.id}`)).toHaveText('$12.50');
    await expect(page.getByTestId(`admin-status-${created.id}`)).toHaveText('Active');

    await page.getByTestId(`edit-${created.id}`).click();
    await expect(page).toHaveURL(`/dashboard/products/${created.id}`);
    await expect(page.getByTestId('editor-name')).toHaveValue(name);
    await page.getByTestId('editor-price').fill('15.75');
    await page.getByTestId('editor-stock_quantity').fill('3');
    await page.getByTestId('save-product').click();
    await expect(page.getByTestId('editor-success')).toHaveText('Product saved');

    const edited = await findRow(page, name);
    await expect(page.getByTestId(`admin-price-${edited.id}`)).toHaveText('$15.75');

    await page.getByTestId(`deactivate-${edited.id}`).click();
    await expect(page.getByTestId(`admin-status-${edited.id}`)).toHaveText('Deactive');
    await expect(page.getByTestId('toast-success')).toContainText('deactivated');

    await page.goto(`/products/search?q=${encodeURIComponent(name)}`);
    await expect(page.getByTestId('search-empty').filter({ visible: true })).toBeVisible();
});
