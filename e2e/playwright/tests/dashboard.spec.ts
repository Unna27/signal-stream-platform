import { test, expect } from '@playwright/test';

test('homepage loads and has expected title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Dashboard|Signal|Angular|Welcome/i);
});
