import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { authReady, authenticatedTest as test } from '../helpers/auth-fixture';

const DASHBOARD_ROUTES: { path: string; heading?: RegExp }[] = [
  { path: '/dashboard', heading: /dashboard|welcome|interview/i },
  { path: '/history', heading: /history|sessions|interview/i },
  { path: '/readiness', heading: /readiness/i },
  { path: '/roadmap', heading: /roadmap|plan/i },
  { path: '/resume', heading: /resume/i },
  { path: '/notifications', heading: /notification/i },
  { path: '/settings', heading: /settings|account/i },
  { path: '/analytics', heading: /analytics|insights/i },
];

test.describe('dashboard axe audit', () => {
  test.skip(!authReady, 'Requires Supabase credentials in .env.local for authenticated axe');

  for (const { path, heading } of DASHBOARD_ROUTES) {
    test(`dashboard a11y: ${path}`, async ({ page }) => {
      await page.goto(path);
      if (heading) {
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15_000 });
      }
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
