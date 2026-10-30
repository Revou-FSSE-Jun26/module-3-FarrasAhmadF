import { test, expect } from '@playwright/test';

const login = (role: string) => ({ id: 1, username: role === 'admin' ? 'boss' : 'shopper', email: `${role}@email.com`, role });

test('admins get a dashboard link in the header', async ({ page }) => {
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 't');
    }, login('admin'));
    await page.goto('/');

    const link = page.getByTestId('nav-dashboard');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/dashboard');
    await link.click();
    await expect(page).toHaveURL('/dashboard');
});

test('regular users and guests do not see the dashboard link', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('nav-login')).toBeVisible();
    await expect(page.getByTestId('nav-dashboard')).toHaveCount(0);

    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 't');
    }, login('user'));
    await page.goto('/');
    await expect(page.getByTestId('nav-username')).toBeVisible();
    await expect(page.getByTestId('nav-dashboard')).toHaveCount(0);
});
