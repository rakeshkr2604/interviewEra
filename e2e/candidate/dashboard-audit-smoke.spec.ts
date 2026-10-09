import { expect } from '@playwright/test';
import { authReady, authenticatedTest as test } from '../helpers/auth-fixture';

/**
 * Staging smoke for dashboard audit invariants that have Playwright coverage.
 * Full resume→interview→report journeys are not automated here.
 */
test.describe('Dashboard audit smoke @staging', () => {
  test.skip(!authReady, 'Requires authenticated staging storage state');

  test('start page hydrates role, mode, and difficulty from query params', async ({ page }) => {
    await page.goto(
      '/interview/script/start?role=Frontend%20Developer&mode=hr_behavioral&difficulty=medium&focus=communication_clarity',
    );
    await expect(page).toHaveURL(/\/interview\/script\/start/);

    const roleInput = page.getByRole('textbox', { name: /role|target/i }).first();
    await expect(roleInput).toHaveValue(/Frontend Developer/i, { timeout: 15_000 });

    // Mode chip label is "HR" (not "HR Behavioral"); pressed state proves hydration.
    await expect(page.getByRole('button', { name: 'HR', pressed: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/Behavioral, communication, leadership, confidence/i),
    ).toBeVisible();
  });

  test('notifications page loads for authenticated candidate', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('script report route for unknown id does not leak another user payload', async ({ page }) => {
    await page.goto('/report/script/00000000-0000-4000-8000-000000000099');
    // Expect not-found / error / redirect — never another candidate's scores.
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).not.toMatch(/overall score|dimension averages|placement signal/);
  });
});
