import { test, expect } from '@playwright/test';

test('categories page shows tiles that link to filtered products', async ({ page }) => {
    await page.goto('/categories');

    const accessories = page.getByTestId('category-2');
    await expect(page.getByTestId(/^category-\d+$/)).toHaveCount(3);
    await expect(accessories).toContainText('Accessories');

    await accessories.click();
    await expect(page).toHaveURL('/products?category=2');

    // Only the Accessories products (Keyboard, Mouse) are shown, and the checkbox is ticked.
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(2);
    await expect(page.getByTestId('product-1')).toBeHidden();
    await expect(page.getByRole('checkbox', { name: /Accessories/ })).toBeChecked();

    // Unticking the filter clears it from the URL and shows everything again.
    await page.getByRole('checkbox', { name: /Accessories/ }).uncheck();
    await expect(page).toHaveURL('/products');
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(3);
});
