import { test, expect, type Page, type Locator } from '@playwright/test';
import {
  HOME_CTA_SAMPLE_REPORT,
  HOME_CTA_SAMPLE_REPORT_HREF,
  HOME_CTA_START_FREE,
  HOME_HERO_HEADING,
} from '../helpers/marketing-home';
import { NAV_SIGN_UP, gotoMarketingPage } from '../helpers/marketing-nav';

type CtaEvent = { cta_key?: string; section?: string; event_name?: string };

async function installCtaSpy(page: Page) {
  await page.evaluate(() => {
    const w = window as Window & { __ctaEvents?: CtaEvent[] };
    w.__ctaEvents = [];
    window.addEventListener('ie-product-event', (event) => {
      const detail = (event as CustomEvent<CtaEvent>).detail;
      if (detail?.event_name === 'landing_cta_clicked') {
        w.__ctaEvents?.push(detail);
      }
    });
  });
}

async function getCtaEvents(page: Page): Promise<CtaEvent[]> {
  return page.evaluate(() => (window as Window & { __ctaEvents?: CtaEvent[] }).__ctaEvents ?? []);
}

async function waitForTrackedCtaHydration(page: Page, locator: Locator) {
  await locator.waitFor({ state: 'visible' });
  await locator.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => locator.getAttribute('href'), { timeout: 15_000 })
    .not.toBeNull();
}

async function waitForHomeHeroCtas(page: Page) {
  await page.waitForFunction(
    (href) => Boolean(document.querySelector(`main a[href="${href}"]`)),
    HOME_CTA_SAMPLE_REPORT_HREF,
    { timeout: 15_000 },
  );
  // LandingHeroCtaIsland hydrates on requestIdleCallback — brief settle.
  await page.waitForTimeout(800);
}

async function clickTrackedCta(page: Page, locator: Locator) {
  await waitForTrackedCtaHydration(page, locator);
  await locator.evaluate((el: HTMLAnchorElement) => {
    el.addEventListener('click', (event) => event.preventDefault(), { once: true });
  });
  await locator.click({ timeout: 10_000 });
  await expect
    .poll(async () => (await getCtaEvents(page)).length, { timeout: 10_000 })
    .toBeGreaterThan(0);
}

test.describe('Marketing CTA analytics', () => {
  test('homepage Start Free fires once', async ({ page }) => {
    await gotoMarketingPage(page, '/', { heading: HOME_HERO_HEADING });
    await installCtaSpy(page);
    await clickTrackedCta(page, page.getByRole('link', { name: HOME_CTA_START_FREE }).first());
    const events = await getCtaEvents(page);
    expect(events).toHaveLength(1);
    expect(events[0]?.cta_key).toBe('start_free_interview');
  });

  test('homepage audience cards fire distinct keys', async ({ page }) => {
    await gotoMarketingPage(page, '/', { heading: /who is interviewera for/i });
    const audienceCards = page.locator('#audience-path-heading').locator('xpath=ancestor::section[1]');

    await installCtaSpy(page);
    await clickTrackedCta(page, audienceCards.getByRole('link', { name: /Students/i }).first());
    expect((await getCtaEvents(page))[0]?.cta_key).toBe('audience_students');

    await gotoMarketingPage(page, '/', { heading: /who is interviewera for/i });
    await installCtaSpy(page);
    await clickTrackedCta(page, audienceCards.getByRole('link', { name: /Colleges/i }).first());
    expect((await getCtaEvents(page)).some((e) => e.cta_key === 'audience_colleges')).toBe(true);

    await gotoMarketingPage(page, '/', { heading: /who is interviewera for/i });
    await installCtaSpy(page);
    await clickTrackedCta(page, audienceCards.getByRole('link', { name: /Hiring Teams/i }).first());
    expect((await getCtaEvents(page)).some((e) => e.cta_key === 'audience_hiring_teams')).toBe(true);
  });

  test('homepage See Sample Interview Report hero CTA fires once', async ({ page }) => {
    await gotoMarketingPage(page, '/', { heading: HOME_HERO_HEADING });
    await waitForHomeHeroCtas(page);
    await installCtaSpy(page);
    const heroSampleReport = page
      .locator('main')
      .getByRole('link', { name: HOME_CTA_SAMPLE_REPORT, exact: true })
      .first();
    await clickTrackedCta(page, heroSampleReport);
    const events = await getCtaEvents(page);
    expect(events).toHaveLength(1);
    expect(events[0]?.cta_key).toBe('see_sample_report');
  });

  test('navbar Sign up fires once', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoMarketingPage(page, '/');
    await installCtaSpy(page);
    await clickTrackedCta(
      page,
      page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: NAV_SIGN_UP }),
    );
    const events = await getCtaEvents(page);
    expect(events).toHaveLength(1);
    expect(events[0]?.cta_key).toBe('sign_up');
  });

  test('campus bridge Set up Campus Workspace fires once', async ({ page }) => {
    await gotoMarketingPage(page, '/campus', { heading: /placement outcomes/i });
    await installCtaSpy(page);
    const bridge = page
      .locator('section[aria-labelledby="campus-workspace-bridge-heading"]')
      .getByRole('link', {
        name: 'Set up Campus Workspace',
        exact: true,
      });
    await bridge.scrollIntoViewIfNeeded();
    await clickTrackedCta(page, bridge);
    expect((await getCtaEvents(page)).some((e) => e.cta_key === 'campus_workspace')).toBe(true);
  });
});
