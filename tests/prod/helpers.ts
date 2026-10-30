import { expect, Page } from '@playwright/test';

export const ADMIN = {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@email.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'Password123',
};

export const USER = {
    email: process.env.E2E_USER_EMAIL ?? 'jhon@email.com',
    password: process.env.E2E_USER_PASSWORD ?? 'Password123',
};

export const uniqueId = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export async function login(page: Page, email: string, password: string) {
    await page.goto('/login');
    await page.getByTestId('email-login').fill(email);
    await page.getByTestId('password-login').fill(password);
    await page.getByTestId('login-submit').click();
    await expect(page).not.toHaveURL(/\/login/);
}

export async function logout(page: Page) {
    await page.getByTestId('nav-account').click();
    await page.getByTestId('nav-logout').click();
    await expect(page.getByTestId('nav-login')).toBeVisible();
}
