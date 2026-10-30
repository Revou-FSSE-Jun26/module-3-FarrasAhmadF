import { test, expect, Route } from '@playwright/test';

const ACCOUNTS = {
    'admin@email.com': { id: 1, username: 'admin', email: 'admin@email.com', role: 'admin' },
    'jhon@email.com': { id: 2, username: 'jhon', email: 'jhon@email.com', role: 'user' },
};

test.beforeEach(async ({ page }) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
    await page.route(/:4000\/auth\/login$/, async (route: Route) => {
        const req = route.request();
        if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
        const { email, password } = req.postDataJSON();
        const user = ACCOUNTS[email as keyof typeof ACCOUNTS];
        const ok = user && password === 'Password123';
        await route.fulfill({
            status: ok ? 200 : 401,
            contentType: 'application/json',
            headers: cors,
            body: JSON.stringify(ok ? { success: true, access_token: 't', user } : { success: false }),
        });
    });
});

test('login page shows both demo accounts next to the form', async ({ page }) => {
    await page.goto('/login');
    const panel = page.getByTestId('demo-accounts');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('demo-admin')).toContainText('admin@email.com');
    await expect(page.getByTestId('demo-admin')).toContainText('Password123');
    await expect(page.getByTestId('demo-user')).toContainText('jhon@email.com');
    await expect(page.getByTestId('demo-user')).toContainText('Password123');
});

test('"Use this account" fills the form and admin lands on the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('use-admin').click();
    await expect(page.getByTestId('email-login')).toHaveValue('admin@email.com');
    await expect(page.getByTestId('password-login')).toHaveValue('Password123');
    await expect(page.getByTestId('login-submit')).toBeFocused();
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL('/dashboard');
});

test('demo user logs in to the shop', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('use-user').click();
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL('/');
    await page.getByTestId('nav-account').click();
    await expect(page.getByTestId('nav-username')).toHaveText('Hi, jhon');
});
