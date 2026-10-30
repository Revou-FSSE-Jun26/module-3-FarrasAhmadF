import { test, expect } from '@playwright/test';

test('errors stay hidden until a field is typed in or left', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByTestId('username-input')).toBeVisible();

    // Fresh form: no errors yet.
    await expect(page.getByTestId('username-error')).toBeHidden();
    await expect(page.getByTestId('email-error')).toBeHidden();

    // Leaving an empty field reveals its error.
    await page.getByTestId('username-input').focus();
    await page.getByTestId('email-input').focus();
    await expect(page.getByTestId('username-error')).toHaveText('Username is required');
    await expect(page.getByTestId('password-error')).toBeHidden();

    // Typing an invalid value shows the error; fixing it hides it.
    await page.getByTestId('email-input').fill('not-an-email');
    await expect(page.getByTestId('email-error')).toHaveText('Enter a valid email address');
    await page.getByTestId('email-input').fill('jhon@email.com');
    await expect(page.getByTestId('email-error')).toBeHidden();
});

test('submitting an incomplete form reveals all remaining errors', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByTestId('password-error')).toBeHidden();

    await page.getByTestId('register-submit').click();

    await expect(page.getByTestId('username-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('password-error')).toHaveText('Password must be at least 8 characters');
    await expect(page).toHaveURL('/register');
});
