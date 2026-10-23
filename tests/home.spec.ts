import { test, expect } from '@playwright/test';

test('home page heading is visible and Product link navigates', async ({page}) => {
    await page.goto('/');
    
    await expect(page.getByTestId("home-heading")).toBeVisible();

    await page.getByTestId("nav-login").click();

    await expect(page).toHaveURL('/login')
});