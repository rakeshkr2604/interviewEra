import { test, expect, type Page, type Locator } from '@playwright/test';
import { gotoMarketingPage } from '../helpers/marketing-nav';

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
    () => Boolean(document.querySelector('main a[href="/campus"]')),
    undefined,
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
    await gotoMarketingPage(page, '/', { heading: /practice the interview/i });
    await installCtaSpy(page);
    await clickTrackedCta(page, page.getByRole('link', { name: 'Start Free' }).first());
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

  test('homepage For Colleges hero CTA fires once', async ({ page }) => {
    await gotoMarketingPage(page, '/', { heading: /practice the interview/i });
    await waitForHomeHeroCtas(page);
    await installCtaSpy(page);
    const heroColleges = page.locator('main').getByRole('link', { name: 'For Colleges', exact: true }).first();
    await clickTrackedCta(page, heroColleges);
    const events = await getCtaEvents(page);
    expect(events).toHaveLength(1);
    expect(events[0]?.cta_key).toBe('for_colleges');
  });

  test('navbar For Teams fires once', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await gotoMarketingPage(page, '/');
    await installCtaSpy(page);
    await clickTrackedCta(
      page,
      page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'For Teams' }),
    );
    const events = await getCtaEvents(page);
    expect(events).toHaveLength(1);
    expect(events[0]?.cta_key).toBe('for_teams');
  });

  test('teams page cards fire once each', async ({ page }) => {
    await gotoMarketingPage(page, '/teams', { heading: /choose your path/i });
    await installCtaSpy(page);
    await clickTrackedCta(page, page.getByRole('link', { name: /Hiring Teams/i }).first());
    expect((await getCtaEvents(page))[0]?.cta_key).toBe('audience_hiring_teams');

    await gotoMarketingPage(page, '/teams', { heading: /choose your path/i });
    await installCtaSpy(page);
    await clickTrackedCta(page, page.getByRole('link', { name: /For Colleges/i }).first());
    expect((await getCtaEvents(page)).some((e) => e.cta_key === 'campus_workspace')).toBe(true);

    await gotoMarketingPage(page, '/teams', { heading: /choose your path/i });
    await installCtaSpy(page);
    await clickTrackedCta(page, page.getByRole('link', { name: /^Students/i }).first());
    expect((await getCtaEvents(page)).some((e) => e.cta_key === 'audience_students')).toBe(true);
  });

  test('campus bridge Set up Campus Workspace fires once', async ({ page }) => {
    await gotoMarketingPage(page, '/campus', { heading: /placement outcomes/i });
    await installCtaSpy(page);
    const bridge = page.locator('#campus-workspace-bridge-heading').locator('..').getByRole('link', {
      name: 'Set up Campus Workspace',
      exact: true,
    });
    await bridge.scrollIntoViewIfNeeded();
    await clickTrackedCta(page, bridge);
    expect((await getCtaEvents(page)).some((e) => e.cta_key === 'campus_workspace')).toBe(true);
  });
});
