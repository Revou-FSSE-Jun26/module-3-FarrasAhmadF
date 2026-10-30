import { test, expect, Page } from '@playwright/test';

const login = (page: Page, role: 'user' | 'admin') =>
    page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 't');
    }, { id: 2, username: role === 'admin' ? 'boss' : 'jhon', email: `${role}@email.com`, role });

test('guests see a login icon, no account menu and no Support link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('nav-login')).toHaveAttribute('href', '/login');
    await expect(page.getByTestId('nav-account')).toHaveCount(0);
    await expect(page.getByTestId('nav-orders')).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link')).toHaveText(['Shop All', 'Collection']);
});

test('account menu shows the user and links to My Orders', async ({ page }) => {
    await login(page, 'user');
    await page.goto('/');

    const button = page.getByTestId('nav-account');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    const menu = page.getByTestId('account-menu');
    await expect(menu.getByTestId('nav-username')).toHaveText('Hi, jhon');
    await expect(menu).toContainText('user@email.com');
    // Focus starts on the first item; arrows move between items.
    await expect(page.getByTestId('nav-orders')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByTestId('nav-logout')).toBeFocused();

    // Escape closes it and returns focus to the button.
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(button).toBeFocused();

    // Outside click closes it too.
    await button.click();
    await page.getByRole('heading', { name: 'A Sensational New Release' }).click();
    await expect(menu).toHaveCount(0);

    await button.click();
    await page.getByTestId('nav-orders').click();
    await expect(page).toHaveURL('/orders');
    await expect(menu).toHaveCount(0);
});

test('admins keep the dashboard icon in the header next to the account menu', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/');
    await expect(page.getByTestId('nav-dashboard')).toHaveAttribute('href', '/dashboard');
    await page.getByTestId('nav-account').click();
    await expect(page.getByTestId('nav-orders')).toBeVisible();
});
