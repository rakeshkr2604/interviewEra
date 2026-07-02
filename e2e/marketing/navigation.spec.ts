import { test, expect } from '@playwright/test';
import { waitForMainNav } from '../helpers/marketing-nav';

test.describe.configure({ mode: 'serial' });

test.describe('Phase 1 marketing navigation', () => {
  test('homepage hero and audience paths', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Start Free' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'For Colleges' }).first()).toBeVisible();
    await expect(page.getByText('Students start free • Colleges run campus placements • Hiring teams coming soon.')).toBeVisible();
    await expect(page.getByRole('heading', { name: /who is interviewera for/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /students/i })).toBeVisible();
  });

  test('navbar has For Teams and Campus dropdown', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForMainNav(page);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: 'For Teams' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Campus' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Sign in' })).toBeVisible();
  });

  test('teams page uses unified navbar', async ({ page }) => {
    await page.goto('/teams');
    await waitForMainNav(page);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /choose your path/i })).toBeVisible();
    await expect(page.locator('footer[aria-label="Site footer"]')).toHaveCount(1);
  });

  test('tablet viewport uses mobile nav chrome', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await waitForMainNav(page);
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  });
});
