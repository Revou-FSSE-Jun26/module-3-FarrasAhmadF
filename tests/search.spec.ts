import { test, expect } from '@playwright/test';

// Mock server products: Laptop ($15,000,000), Keyboard ($1,500,000), Mouse ($500,000, sold out).

test('search overlay opens from the header and blocks the page', async ({ page }) => {
    await page.goto('/');
    const overlay = page.getByTestId('search-overlay');
    await expect(overlay).toBeHidden();

    await page.getByTestId('nav-search').click();
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('search-overlay-input')).toBeFocused();

    // Esc closes it, and focus returns to the search icon.
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
    await expect(page.getByTestId('nav-search')).toBeFocused();

    await page.getByTestId('nav-search').click();
    await page.getByTestId('search-overlay-close').click();
    await expect(overlay).toBeHidden();
});

test('typing shows live suggestions that link to the product', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-search').click();

    await page.getByTestId('search-overlay-input').fill('key');
    const suggestions = page.getByTestId('search-suggestions');
    await expect(suggestions).toContainText('Keyboard');
    await expect(suggestions).not.toContainText('Laptop');
    await expect(page.getByTestId('search-view-all')).toHaveAttribute('href', '/products/search?q=key');

    await suggestions.getByRole('link', { name: /Keyboard/ }).click();
    await expect(page).toHaveURL('/products/keyboard');
    await expect(page.getByTestId('search-overlay')).toBeHidden();

    await page.getByTestId('nav-search').click();
    await page.getByTestId('search-overlay-input').fill('zzz');
    await expect(page.getByTestId('search-no-suggestions')).toContainText('No products match');
});

test('Enter goes to /products/search?q= with results and filters', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-search').click();
    await page.getByTestId('search-overlay-input').fill('o');
    await page.keyboard.press('Enter');

    // "o" matches Laptop, Keyboard and Mouse.
    await expect(page).toHaveURL('/products/search?q=o');
    await expect(page.getByTestId('search-page-input')).toHaveValue('o');
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(3);

    // Price filter.
    await page.getByTestId('price-max').fill('2000000');
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(2);
    await page.getByTestId('price-min').fill('1000000');
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(1);
    await expect(page.getByTestId('product-2')).toBeVisible();

    // Invalid range shows an error and doesn't filter.
    await page.getByTestId('price-min').fill('5000000');
    await expect(page.getByTestId('price-error')).toContainText('must be lower');
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(3);

    // Availability still works on search results.
    await page.getByRole('button', { name: 'Clear all' }).click();
    await page.getByRole('checkbox', { name: /Out of stock/ }).check();
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(1);
    await expect(page.getByTestId('product-3')).toBeVisible();
});

test('search page works from a direct URL and searches again', async ({ page }) => {
    await page.goto('/products/search?q=LAPTOP');
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(1);
    await expect(page.getByTestId('product-1')).toBeVisible();

    await page.getByTestId('search-page-input').fill('mouse');
    await page.getByTestId('search-page-input').press('Enter');
    await expect(page).toHaveURL('/products/search?q=mouse');
    await expect(page.getByTestId('product-3')).toBeVisible();
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(1);
});

test('no results and empty query states', async ({ page }) => {
    await page.goto('/products/search?q=espresso');
    await expect(page.getByTestId('search-empty').filter({ visible: true })).toContainText('No results for “espresso”');

    // Next may keep a hidden copy of the streamed segment in dev, so only check the visible one.
    await page.goto('/products/search');
    await expect(page.getByTestId('search-prompt').filter({ visible: true })).toBeVisible();
});

test('price filter on /products too', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(3);
    // Retry: on a direct load the input can be typed into before React hydrates.
    await expect(async () => {
        // Clear first: re-filling the same value wouldn't fire React's onChange.
        await page.getByTestId('price-min').fill('');
        await page.getByTestId('price-min').fill('1000000');
        await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(2, { timeout: 1000 });
    }).toPass();
});
