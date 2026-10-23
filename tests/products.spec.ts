import { test, expect } from '@playwright/test'

// Data produk datang dari mock backend (tests/mock-server/server.mjs) yang
// diarahkan lewat NEXT_PUBLIC_API_BASE_URL di playwright.config.ts.
// Mock mengembalikan Laptop dengan id 1, sehingga product-1 = Laptop.
test('products page renders the mocked products from the server', async ({ page }) => {
    await page.goto('/products');

    // Tunggu sampai daftar produk benar-benar ter-render.
    // Di dev mode + filesystem lambat, render bisa datang bertahap, jadi
    // kita tunggu jumlah card stabil dulu sebelum assert card tertentu.
    await expect(page.getByTestId(/^product-\d+$/)).toHaveCount(3);

    // card dengan id 1 adalah Laptop
    const laptopCard = page.getByTestId('product-1');
    await expect(laptopCard).toContainText('Laptop');

    // produk kedua
    await expect(page.getByTestId('product-2')).toContainText('Keyboard');
})
