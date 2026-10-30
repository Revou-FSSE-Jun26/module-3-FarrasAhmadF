import { test, expect } from '@playwright/test';

// Mock categories: Electronics (1), Accessories (2), Coffee Grinder (3).

test('collection tiles link to their category', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('collection-grinder')).toHaveAttribute('href', '/products?category=3');
    // No "scale" / "kettle" category in the mock: those tiles fall back to all collections.
    await expect(page.getByTestId('collection-scale')).toHaveAttribute('href', '/categories');
    await expect(page.getByTestId('collection-kettle')).toHaveAttribute('href', '/categories');

    await page.getByTestId('collection-grinder').click();
    await expect(page).toHaveURL('/products?category=3');
    await expect(page.getByRole('checkbox', { name: /Coffee Grinder/ })).toBeChecked();
});

test('header nav says Collection and links to /categories', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Collection' });
    await expect(link).toHaveAttribute('href', '/categories');
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'RevoCoffee' })).toHaveCount(0);
});
