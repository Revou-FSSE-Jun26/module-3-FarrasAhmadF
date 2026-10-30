import { test, expect } from '@playwright/test';
import { USER, login } from './helpers';

test('a shopper browses products, adds one to the cart and checks out', async ({ page }) => {
    await login(page, USER.email, USER.password);

    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'All Products' })).toBeVisible();
    await page.getByRole('checkbox', { name: /In stock/ }).check();

    const firstProduct = page.getByTestId(/^product-\d+$/).first();
    await expect(firstProduct).toBeVisible();
    const productName = (await firstProduct.locator('h3').innerText()).trim();
    await firstProduct.click();

    await expect(page).toHaveURL(/\/products\/[^/]+$/);
    await expect(page.getByTestId('product-name')).toHaveText(productName);
    await page.getByRole('button', { name: 'Add to Cart' }).click();

    const drawer = page.getByTestId('cart-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(productName);
    await drawer.getByTestId('checkout-button').click();

    await expect(page).toHaveURL('/checkout');
    await page.getByTestId('checkout-firstName').fill('E2E');
    await page.getByTestId('checkout-lastName').fill('Shopper');
    await page.getByTestId('checkout-address').fill('Jl. Kopi No. 1');
    await page.getByTestId('checkout-city').fill('Jakarta Selatan');
    await page.getByTestId('checkout-province').selectOption('DKI Jakarta');
    await page.getByTestId('checkout-postalCode').fill('12345');
    await page.getByTestId('checkout-phone').fill('081234567890');
    await expect(page.getByTestId('shipping-regular')).toBeChecked();
    await page.getByText('QRIS', { exact: true }).click();
    await expect(page.getByTestId(/^summary-item-\d+$/).filter({ hasText: productName })).toBeVisible();
    await page.getByTestId('pay-now').click();

    const success = page.getByTestId('checkout-success');
    await expect(success).toContainText('placed successfully');
    const orderId = (await success.innerText()).match(/Order #(\d+)/)?.[1];
    expect(orderId).toBeTruthy();

    await page.goto(`/orders/${orderId}`);
    await expect(page.getByRole('heading', { name: `Order Number #${orderId}` })).toBeVisible();
    await expect(page.getByTestId('customer-details')).toContainText('E2E Shopper');

    page.on('dialog', (d) => d.accept());
    await page.getByTestId(`cancel-order-${orderId}`).click();
    await page.getByTestId(`confirm-cancel-${orderId}`).click();
    await expect(page.getByTestId('order-status')).toHaveText('cancelled');
});
