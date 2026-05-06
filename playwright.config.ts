import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/playwright/tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
    trace: 'on-first-retry',
  },
});
