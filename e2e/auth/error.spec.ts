import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('/auth/error recovery hub', () => {
  test('shows recovery actions for invalid_credentials', async ({ page }) => {
    await page.goto('/auth/error?code=invalid_credentials', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /incorrect email or password/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /try again/i })).toBeVisible();
  });

  test('shows recovery actions for verification_expired', async ({ page }) => {
    await page.goto('/auth/error?code=verification_expired');
    await expect(page.getByRole('heading', { name: /link expired/i })).toBeVisible();
  });
});
