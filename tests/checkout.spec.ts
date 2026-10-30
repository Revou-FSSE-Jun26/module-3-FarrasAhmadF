import { test, expect, Page } from '@playwright/test';

const USER = { id: 2, username: 'shopper', email: 'shopper@email.com', role: 'user' };
// Laptop from the mock server (id 1, $15,000,000).
const CART = [{ id: 1, name: 'Laptop', slug: 'laptop', category_id: 1, price: 15000000, stock_quantity: 5, created_at: '2026-01-01T00:00:00Z', quantity: 1 }];

async function seed(page: Page, { loggedIn = true, cart = CART, note = '' } = {}) {
    await page.addInitScript(({ user, cart, loggedIn, note }) => {
        if (loggedIn) {
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', 'fake-token');
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.setItem('cart-note', note);
    }, { user: USER, cart, loggedIn, note });
}

async function fillAddress(page: Page) {
    await page.getByTestId('checkout-firstName').fill('Farras');
    await page.getByTestId('checkout-lastName').fill('Ahmad');
    await page.getByTestId('checkout-address').fill('Jl. Kopi No. 1');
    await page.getByTestId('checkout-city').fill('Jakarta Selatan');
    await page.getByTestId('checkout-province').selectOption('DKI Jakarta');
    await page.getByTestId('checkout-postalCode').fill('12345');
    await page.getByTestId('checkout-phone').fill('081234567890');
}

test('shows the order summary and reveals shipping methods once the address is filled', async ({ page }) => {
    await seed(page, { note: 'Please wrap it' });
    await page.goto('/checkout');

    await expect(page.getByTestId('checkout-email')).toHaveText('shopper@email.com');
    await expect(page.getByTestId('summary-item-1')).toContainText('Laptop');
    await expect(page.getByTestId('summary-note')).toHaveText('Please wrap it');
    await expect(page.getByTestId('summary-shipping')).toHaveText('Enter shipping address');
    await expect(page.getByTestId('shipping-placeholder')).toBeVisible();

    await fillAddress(page);
    await expect(page.getByTestId('shipping-regular')).toBeChecked();
    // Subtotal is over $50, so Reguler is free.
    await expect(page.getByTestId('summary-shipping')).toHaveText('FREE');
    await expect(page.getByTestId('summary-total')).toHaveText('$15,000,000.00');

    await page.getByTestId('shipping-fast').check();
    await expect(page.getByTestId('summary-shipping')).toHaveText('$15.00');
    await expect(page.getByTestId('summary-total')).toHaveText('$15,000,015.00');
});

test('submitting an empty form shows errors and does not place an order', async ({ page }) => {
    await seed(page);
    await page.goto('/checkout');
    await expect(page.getByTestId('checkout-form')).toBeVisible();
    await expect(page.getByText('Enter a first name')).toBeHidden();

    await page.getByTestId('pay-now').click();
    await expect(page.getByText('Enter a first name')).toBeVisible();
    await expect(page.getByText('Enter a valid 5-digit postal code')).toBeVisible();
    await expect(page.getByText('Enter a valid card number')).toBeVisible();
    // Focus moves to the first invalid field.
    await expect(page.getByTestId('checkout-firstName')).toBeFocused();
    await expect(page.getByTestId('checkout-success')).toHaveCount(0);
});

test('payment methods: GoPay asks for a phone number, QRIS needs nothing', async ({ page }) => {
    await seed(page);
    await page.goto('/checkout');

    await page.getByText('GoPay', { exact: true }).click();
    await expect(page.getByTestId('checkout-cardNumber')).toHaveCount(0);
    await page.getByTestId('checkout-gopayPhone').fill('123');
    await page.getByTestId('checkout-gopayPhone').blur();
    await expect(page.getByText('Enter the phone number linked to your GoPay')).toBeVisible();

    await page.getByText('QRIS', { exact: true }).click();
    await expect(page.getByTestId('checkout-gopayPhone')).toHaveCount(0);
    await expect(page.getByTestId('qris-info')).toBeVisible();
});

test('a valid checkout with a card places the order and clears the cart', async ({ page }) => {
    await seed(page);
    await page.goto('/checkout');
    await fillAddress(page);

    // Auto-formatting of card number and expiry.
    await page.getByTestId('checkout-cardNumber').fill('4242424242424242');
    await expect(page.getByTestId('checkout-cardNumber')).toHaveValue('4242 4242 4242 4242');
    await page.getByTestId('checkout-cardExpiry').fill('1239');
    await expect(page.getByTestId('checkout-cardExpiry')).toHaveValue('12/39');
    await page.getByTestId('checkout-cardCvc').fill('123');
    await page.getByTestId('checkout-cardName').fill('Farras Ahmad');

    await page.getByTestId('pay-now').click();
    await expect(page.getByTestId('checkout-success')).toContainText('Order #1 placed successfully');

    // Cart is empty afterwards.
    await page.getByTestId('nav-cart').click();
    await expect(page.getByTestId('cart-drawer')).toContainText('Your cart is empty.');
});

test('a valid checkout with QRIS places the order', async ({ page }) => {
    await seed(page);
    await page.goto('/checkout');
    await fillAddress(page);
    await page.getByText('QRIS', { exact: true }).click();
    await page.getByTestId('pay-now').click();
    await expect(page.getByTestId('checkout-success')).toBeVisible();
});

test('empty cart shows an empty state', async ({ page }) => {
    await seed(page, { cart: [] });
    await page.goto('/checkout');
    await expect(page.getByTestId('checkout-empty')).toContainText('Your cart is empty.');
});

test('guests are sent to login and come back to checkout afterwards', async ({ page }) => {
    await seed(page, { loggedIn: false });
    await page.goto('/checkout');
    await expect(page).toHaveURL('/login?next=%2Fcheckout');
});
