import { test, expect, type Page } from '@playwright/test';
import { gotoMarketingPage } from '../helpers/marketing-nav';
import { HOME_HERO_HEADING } from '../helpers/marketing-home';

const CONSENT_KEY = 'ie_analytics_consent';

async function clearConsentAfterLoad(page: Page) {
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, CONSENT_KEY);
}

async function readConsent(page: Page): Promise<{ choice?: string; version?: string } | null> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { choice?: string; version?: string };
    } catch {
      return null;
    }
  }, CONSENT_KEY);
}

async function gotoHomeWithFreshConsent(page: Page) {
  await gotoMarketingPage(page, '/', { heading: HOME_HERO_HEADING });
  await clearConsentAfterLoad(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: HOME_HERO_HEADING }).first()).toBeVisible({
    timeout: 30_000,
  });
  const mount = page.getByTestId('ie-cookie-consent-mount');
  await expect(mount).toBeAttached({ timeout: 15_000 });
  await expect
    .poll(async () => mount.getAttribute('data-ready'), { timeout: 15_000 })
    .toBe('1');
}

function consentBanner(page: Page) {
  return page.getByTestId('ie-cookie-consent');
}

test.describe('Cookie analytics consent', () => {
  test('shows banner and does not inject Clarity/GA script tags before choice', async ({
    page,
  }) => {
    await gotoHomeWithFreshConsent(page);

    const banner = consentBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await expect(banner.getByRole('button', { name: /accept analytics/i })).toBeVisible();
    await expect(banner.getByRole('button', { name: /reject analytics/i })).toBeVisible();

    await expect(page.locator('script#ms-clarity')).toHaveCount(0);
    await expect(page.locator('script#google-analytics-gtag')).toHaveCount(0);
    await expect(page.locator('script#google-analytics-init')).toHaveCount(0);
  });

  test('reject dismisses banner, persists preference, and keeps optional scripts unloaded after reload', async ({
    page,
  }) => {
    await gotoHomeWithFreshConsent(page);
    const banner = consentBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await banner.getByRole('button', { name: /reject analytics/i }).click();
    await expect(banner).toHaveCount(0);

    const stored = await readConsent(page);
    expect(stored?.choice).toBe('rejected');
    expect(stored?.version).toBeTruthy();
    await expect(page.locator('script#ms-clarity')).toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: HOME_HERO_HEADING }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(consentBanner(page)).toHaveCount(0);
    await expect(page.locator('script#ms-clarity')).toHaveCount(0);
    await expect(page.locator('script#google-analytics-gtag')).toHaveCount(0);
  });

  test('accept persists preference, hides banner, and survives navigation', async ({ page }) => {
    await gotoHomeWithFreshConsent(page);
    const banner = consentBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });
    await banner.getByRole('button', { name: /accept analytics/i }).click();
    await expect(banner).toHaveCount(0);

    const stored = await readConsent(page);
    expect(stored?.choice).toBe('accepted');

    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(consentBanner(page)).toHaveCount(0);
    expect((await readConsent(page))?.choice).toBe('accepted');
  });

  test('cookie settings reopens banner and withdrawal stops optional tracking preference', async ({
    page,
  }) => {
    await gotoHomeWithFreshConsent(page);
    await expect(consentBanner(page)).toBeVisible({ timeout: 15_000 });
    await consentBanner(page).getByRole('button', { name: /accept analytics/i }).click();
    await expect(consentBanner(page)).toHaveCount(0);

    await page.getByRole('button', { name: /cookie settings/i }).click();
    const banner = consentBanner(page);
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await banner.getByRole('button', { name: /reject analytics/i }).click();
    await expect(banner).toHaveCount(0);
    expect((await readConsent(page))?.choice).toBe('rejected');

    await page.goto('/how-it-works', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('script#ms-clarity')).toHaveCount(0);
  });

  test('consent banner is keyboard operable', async ({ page }) => {
    await gotoHomeWithFreshConsent(page);
    const banner = consentBanner(page);
    await expect(banner).toBeVisible({ timeout: 15_000 });

    await banner.getByRole('button', { name: /manage preferences/i }).focus();
    await page.keyboard.press('Enter');
    await expect(banner.getByText(/essential:/i)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(banner.getByText(/essential:/i)).toHaveCount(0);

    await banner.getByRole('button', { name: /reject analytics/i }).focus();
    await page.keyboard.press('Enter');
    await expect(banner).toHaveCount(0);
    expect((await readConsent(page))?.choice).toBe('rejected');
  });
});
