import { test, expect } from '@playwright/test';
import { logout, uniqueId } from './helpers';

test('a new visitor can register, log in and log out', async ({ page }) => {
    const id = uniqueId();
    const username = `e2e${id}`;
    const email = `e2e${id}@email.com`;
    const password = 'Password123';

    await page.goto('/register');
    await page.getByTestId('username-input').fill(username);
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill(password);
    await page.getByTestId('confirm-password-input').fill(password);
    await page.getByTestId('register-submit').click();

    await expect(page.getByText('Registration successful')).toBeVisible();
    await expect(page).toHaveURL('/login');

    await page.getByTestId('email-login').fill(email);
    await page.getByTestId('password-login').fill('WrongPassword1');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();

    await page.getByTestId('password-login').fill(password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL('/');

    await page.getByTestId('nav-account').click();
    await expect(page.getByTestId('nav-username')).toHaveText(`Hi, ${username}`);
    await page.keyboard.press('Escape');

    await logout(page);
    await expect(page.getByTestId('nav-account')).toHaveCount(0);
});
