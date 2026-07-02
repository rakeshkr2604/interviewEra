import { test, expect } from '@playwright/test';

test.describe('Candidate readiness page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/readiness');
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });
});
