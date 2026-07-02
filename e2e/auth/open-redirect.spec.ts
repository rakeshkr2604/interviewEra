import { test, expect } from '@playwright/test';

test.describe('open redirect guards', () => {
  test('login page does not expose unsafe next in client navigation', async ({ page }) => {
    await page.goto('/login?next=javascript%3Aalert(1)');
    await expect(page).toHaveURL(/\/login/);
  });

  test('auth callback rejects protocol-relative next', async ({ page }) => {
    const response = await page.goto('/auth/callback?next=//evil.com');
    expect(response?.status()).toBeLessThan(500);
    await expect(page).not.toHaveURL(/evil\.com/);
  });
});
