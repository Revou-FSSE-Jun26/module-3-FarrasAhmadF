import { test, expect } from '@playwright/test';

const USER = {
    id: 2,
    username: 'shopper',
    email: 'shopper@email.com',
    role: 'user',
};

test('a shopper can browse products, add to cart, and checkout', async ({ page }) => {
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'fake-token');
    }, USER);

    await page.goto('/products');
    const laptop = page.getByTestId('product-1');
    await expect(laptop).toBeVisible();
    await expect(laptop).toContainText('Laptop');

    await expect(page.getByTestId('nav-cart')).toBeVisible();

    await page.getByTestId('add-to-cart-1').click();

    await page.getByTestId('nav-cart').click();
    await expect(page).toHaveURL('/cart');

    const cartItem = page.getByTestId('cart-item-1');
    await expect(cartItem).toBeVisible();
    await expect(cartItem).toContainText('Laptop');
    await expect(page.getByTestId('cart-total')).toHaveText('15.000.000');

    await page.getByTestId('checkout-button').click();
    await expect(page.getByTestId('checkout-success')).toBeVisible();
    await expect(page.getByTestId('checkout-success')).toContainText('Order placed successfully');
    await expect(page.getByTestId('cart-item-1')).toBeHidden();
});
