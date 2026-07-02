import { expect } from '@playwright/test';
import path from 'node:path';
import { authReady, authenticatedTest as test } from '../helpers/auth-fixture';

const RESUME_FIXTURE = path.join(process.cwd(), 'e2e', 'fixtures', 'sample-resume.txt');

test.describe('resume_deleted analytics (authenticated)', () => {
  test.skip(!authReady, 'Requires Supabase auth from global setup');

  test('client emits resume_deleted once after successful delete', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as Window & { __resumeDeleted?: unknown[] };
      w.__resumeDeleted = [];
      window.addEventListener('ie-product-event', (event) => {
        const detail = (event as CustomEvent).detail;
        if (detail?.event_name === 'resume_deleted') {
          w.__resumeDeleted?.push(detail);
        }
      });
    });

    await page.goto('/resume');
    if (page.url().includes('/login')) {
      throw new Error(
        'Auth session missing — cookie domain must match PLAYWRIGHT_BASE_URL (re-run Playwright global setup).',
      );
    }
    await expect(page.getByRole('heading', { name: /resume workspace/i })).toBeVisible({ timeout: 15_000 });

    let deleteButton = page.getByRole('button', { name: /delete/i }).first();
    if (!(await deleteButton.isVisible().catch(() => false))) {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(RESUME_FIXTURE);
      await expect
        .poll(async () => deleteButton.isVisible().catch(() => false), { timeout: 90_000 })
        .toBe(true);
      deleteButton = page.getByRole('button', { name: /delete/i }).first();
    }

    page.once('dialog', (dialog) => dialog.accept());
    await deleteButton.click();
    await expect
      .poll(
        async () => {
          const events = await page.evaluate(
            () => (window as Window & { __resumeDeleted?: { event_name?: string }[] }).__resumeDeleted ?? [],
          );
          return events.filter((e) => e.event_name === 'resume_deleted').length;
        },
        { timeout: 15_000 },
      )
      .toBe(1);
  });
});
