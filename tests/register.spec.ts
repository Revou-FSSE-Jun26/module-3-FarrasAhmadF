import { test, expect } from '@playwright/test'

// test('empty form shows every required-field error', async ({page}) => {
//     await page.goto('/register');
//     await expect(page.getByTestId('username-error')).toBeVisible();
//     await expect(page.getByTestId('username-error')).toHaveText('Username is required');
//     await expect(page.getByTestId('email-error')).toBeVisible();
//     await expect(page.getByTestId('email-error')).toHaveText('Enter a valid email address');
//     await expect(page.getByTestId('password-error')).toBeVisible();
//     await expect(page.getByTestId('password-error')).toHaveText('Password must be at least 8 characters');
// })

// test('invalid email shows the email error', async ({page}) => {
//     await page.goto('/register');
//     await page.getByTestId('username-input').fill('jhon');
//     await page.getByTestId('email-input').fill('not-an-email');
//     await page.getByTestId('password-input').fill('secret123');
//     await page.getByTestId('confirm-password-input').fill('secret123');
//     await expect(page.getByTestId('email-error')).toBeVisible;
//     await expect(page.getByTestId('email-error')).toHaveText('Enter a valid email address');
// })

// test('mismatched passwords shows the confirm-password error', async ({page}) => {
//     await page.goto('/register');
//     await page.getByTestId('username-input').fill('jhon');
//     await page.getByTestId('email-input').fill('jhon-test@email.com');
//     await page.getByTestId('password-input').fill('secret123');
//     await page.getByTestId('confirm-password-input').fill('secret999');
//     await expect(page.getByTestId('confirm-password-error')).toBeVisible;
//     await expect(page.getByTestId('confirm-password-error')).toHaveText('Passwords do not match');
// })

// test('errors clear as the user corrects each field', async ({page}) => {
//     await page.goto('/register');
//     await expect(page.getByTestId('username-error')).toBeVisible();
//     await page.getByTestId('username-input').fill('john');
//     await expect(page.getByTestId('username-error')).toBeHidden();
// })

test('a user can register, log in, and log out', async ({page}) => {
    const stamp = Date.now();
    const email = `test${stamp}@email.com`;
    const username = `test${stamp}`;

    await page.goto('/register');
    await page.getByTestId('username-input').fill(username);
    await page.getByTestId('email-input').fill(email);
    await page.getByTestId('password-input').fill('password123');
    await page.getByTestId('confirm-password-input').fill('password123');
    await page.getByTestId('register-submit').click();

    await expect(page).toHaveURL('/login', {timeout: 10000});
    await expect(page.getByRole('heading', {name: 'Login'})).toBeVisible();

    await page.getByTestId('email-login').fill(email);
    await page.getByTestId('password-login').fill('password123');
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL('/');
    await page.getByTestId('nav-account').click();
    await expect(page.getByTestId('nav-username')).toHaveText(`Hi, ${username}`);
    await page.getByTestId('nav-logout').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('nav-account')).toHaveCount(0);
    await expect(page.getByTestId('nav-login')).toBeVisible();
})