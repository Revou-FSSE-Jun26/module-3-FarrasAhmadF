import { test, expect } from '@playwright/test';

const USER = {
    id: 2,
    username: 'shopper',
    email: 'shopper@email.com',
    role: 'user',
};

test('a shopper can add to cart, manage it in the drawer, and go to checkout', async ({ page }) => {
    await page.addInitScript((user) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'fake-token');
    }, USER);

    await page.goto('/products');
    const laptop = page.getByTestId('product-1');
    await expect(laptop).toContainText('Laptop');

    // Clicking a product card opens its detail page (by slug).
    await laptop.click();
    await expect(page).toHaveURL('/products/laptop');
    await expect(page.getByTestId('product-name')).toHaveText('Laptop');
    await expect(page.getByTestId('product-price')).toHaveText('$15,000,000.00');

    // Adding to cart opens the drawer without leaving the page.
    const drawer = page.getByTestId('cart-drawer');
    await expect(drawer).toBeHidden();
    await page.getByTestId('add-to-cart-1').click();
    await expect(drawer).toBeVisible();
    await expect(page).toHaveURL('/products/laptop');
    await expect(drawer.getByTestId('cart-item-1')).toContainText('Laptop');
    await expect(drawer.getByTestId('cart-total')).toHaveText('$15,000,000.00');

    // Quantity controls update the subtotal.
    await drawer.getByTestId('cart-increase-1').click();
    await expect(drawer.getByTestId('cart-qty-1')).toHaveText('2');
    await expect(drawer.getByTestId('cart-total')).toHaveText('$30,000,000.00');
    await drawer.getByTestId('cart-decrease-1').click();
    await expect(drawer.getByTestId('cart-qty-1')).toHaveText('1');

    // Escape closes it; the header icon reopens it.
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await page.getByTestId('nav-cart').click();
    await expect(drawer).toBeVisible();

    // Logged-in users go to /checkout.
    await drawer.getByTestId('checkout-button').click();
    await expect(page).toHaveURL('/checkout');
    await expect(drawer).toBeHidden();
});

test('guests can use the drawer but must log in to check out', async ({ page }) => {
    await page.goto('/products/laptop');
    await page.getByTestId('add-to-cart-1').click();

    const drawer = page.getByTestId('cart-drawer');
    await expect(drawer.getByTestId('cart-item-1')).toBeVisible();
    await expect(drawer.getByTestId('checkout-button')).toHaveCount(0);

    await drawer.getByTestId('login-to-checkout').click();
    await expect(page).toHaveURL('/login?next=%2Fcheckout');
});

test('removing the last item shows the empty state', async ({ page }) => {
    await page.goto('/products/keyboard');
    await page.getByTestId('add-to-cart-2').click();

    const drawer = page.getByTestId('cart-drawer');
    await drawer.getByTestId('cart-remove-2').click();
    await expect(drawer).toContainText('Your cart is empty.');
    await expect(drawer).toContainText('(0 items)');
});

test('the /cart page shows the same cart as the drawer', async ({ page }) => {
    await page.goto('/products/keyboard');
    await page.getByTestId('add-to-cart-2').click();
    await page.getByTestId('cart-close').click();

    await page.goto('/cart');
    const cartPage = page.getByTestId('cart-page');
    await expect(cartPage.getByTestId('cart-item-2')).toContainText('Keyboard');
    await expect(cartPage.getByTestId('cart-total')).toHaveText('$1,500,000.00');
});
