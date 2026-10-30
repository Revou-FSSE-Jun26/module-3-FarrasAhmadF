import { test, expect } from '@playwright/test';

test('sold out product disables add to cart', async ({ page }) => {
    await page.goto('/products/mouse');
    await expect(page.getByTestId('product-name')).toHaveText('Mouse');
    await expect(page.getByTestId('add-to-cart-3')).toBeDisabled();
    await expect(page.getByTestId('add-to-cart-3')).toHaveText('Sold Out');
});

test('unknown slug shows not found page', async ({ page }) => {
    await page.goto('/products/does-not-exist');
    await expect(page.getByRole('heading', { name: 'Product not found' })).toBeVisible();
});
