import { test, expect } from '@playwright/test';

test.describe('campus join flow', () => {
  test('invalid invite token shows error state', async ({ page }) => {
    await page.goto('/college/join/invalid-token-abc123');
    await expect(page.getByRole('heading', { name: /invalid invitation/i })).toBeVisible();
  });
});

test.describe('campus marketing entry', () => {
  // Default /campus is Coming Soon (CAMPUS_LANDING_MODE / Redis fail-closed).
  test('campus page loads Coming Soon shell', async ({ page }) => {
    await page.goto('/campus');
    await expect(page.getByRole('heading', { name: /coming soon/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /request a pilot/i }).first()).toBeVisible();
  });

  test('legacy /college redirects to /campus', async ({ page }) => {
    await page.goto('/college');
    await expect(page).toHaveURL(/\/campus\/?$/);
    await expect(page.getByRole('heading', { name: /coming soon/i })).toBeVisible();
  });
});
