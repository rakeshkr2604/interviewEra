import { test, expect } from '@playwright/test';
import {
  HOME_CTA_SAMPLE_REPORT,
  HOME_CTA_SAMPLE_REPORT_HREF,
  HOME_CTA_START_FREE,
  HOME_HERO_HEADING,
} from '../helpers/marketing-home';
import {
  NAV_PRICING_LINK,
  NAV_PRODUCT_MENU,
  NAV_SIGN_IN,
  NAV_SIGN_UP,
  waitForMainNav,
} from '../helpers/marketing-nav';

test.describe.configure({ mode: 'serial' });

test.describe('Phase 1 marketing navigation', () => {
  test('homepage hero and audience paths', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: HOME_HERO_HEADING })).toBeVisible();
    await expect(page.getByRole('link', { name: HOME_CTA_START_FREE }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: HOME_CTA_START_FREE }).first()).toHaveAttribute('href', '/signup');
    await expect(page.getByRole('link', { name: HOME_CTA_SAMPLE_REPORT }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: HOME_CTA_SAMPLE_REPORT }).first()).toHaveAttribute(
      'href',
      HOME_CTA_SAMPLE_REPORT_HREF,
    );
    await expect(page.getByRole('list', { name: 'Who InterviewEra is for' })).toBeVisible();
    await expect(page.getByText('Students: 2 free interviews')).toBeVisible();
    await expect(page.getByText('Colleges run campus placements')).toBeVisible();
    await expect(page.getByText('First 2 interviews free — try it once.')).toBeVisible();
    await expect(page.getByRole('heading', { name: /who is interviewera for/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /students/i })).toBeVisible();
  });

  test('navbar shows current marketing IA', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await waitForMainNav(page);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(page.getByRole('button', { name: NAV_PRODUCT_MENU })).toBeVisible();
    await expect(nav.getByRole('link', { name: NAV_PRICING_LINK })).toBeVisible();
    await expect(nav.getByRole('link', { name: NAV_SIGN_IN })).toBeVisible();
    await expect(nav.getByRole('link', { name: NAV_SIGN_UP })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'For Teams' })).toHaveCount(0);
  });

  test('tablet viewport uses mobile nav chrome', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await waitForMainNav(page);
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  });
});
