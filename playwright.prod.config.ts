import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/prod',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  timeout: 120 * 1000,
  expect: { timeout: 20 * 1000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-prod', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://revocoffee.vercel.app',
    navigationTimeout: 60 * 1000,
    actionTimeout: 20 * 1000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
