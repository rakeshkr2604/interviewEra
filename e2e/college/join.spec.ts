import { test, expect } from '@playwright/test';

test.describe('campus join flow', () => {
  test('invalid invite token shows error state', async ({ page }) => {
    await page.goto('/college/join/invalid-token-abc123');
    await expect(page.getByRole('heading', { name: /invalid invitation/i })).toBeVisible();
  });
});

test.describe('campus marketing entry', () => {
  test('campus page loads workspace CTA', async ({ page }) => {
    await page.goto('/campus');
    await expect(page.getByRole('link', { name: /set up campus workspace/i }).first()).toBeVisible();
  });

  test('legacy /college redirects to /campus', async ({ page }) => {
    await page.goto('/college');
    await expect(page).toHaveURL(/\/campus\/?$/);
    await expect(page.getByRole('link', { name: /set up campus workspace/i }).first()).toBeVisible();
  });
});
