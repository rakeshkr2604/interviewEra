import { expect } from '@playwright/test';
import { authenticatedTest as test, authReady } from '../helpers/auth-fixture';

/**
 * V1 dual-agent session + checkpoint resume was removed.
 * Keep a smoke check that the retired route still loads for authenticated users.
 */
test.describe('Legacy interview session retired', () => {
  test.skip(!authReady, 'Requires E2E auth provisioning');

  test('session page shows retired engine message', async ({ page }) => {
    await page.goto('/interview/session/00000000-0000-4000-8000-000000000001');
    await expect(page.getByRole('heading', { name: /retired/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole('link', { name: /start new interview/i })).toBeVisible();
    // Prefer the page CTA — Sidebar also exposes a "Dashboard" nav link to /dashboard.
    await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible();
  });
});
