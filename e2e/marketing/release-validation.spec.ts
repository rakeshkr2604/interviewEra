import { test, expect, type Page } from '@playwright/test';
import { HOME_HERO_HEADING } from '../helpers/marketing-home';
import {
  NAV_PRICING_LINK,
  NAV_PRODUCT_MENU,
  NAV_SIGN_IN,
  gotoMarketingPage,
  waitForMainNav,
} from '../helpers/marketing-nav';

const OUT_DIR = 'validation-results/screenshots';

const VIEWPORTS = [
  { label: 'mobile-375', width: 375, height: 812 },
  { label: 'mobile-390', width: 390, height: 844 },
  { label: 'tablet-768', width: 768, height: 1024 },
  { label: 'desktop-1440', width: 1440, height: 900 },
] as const;

const HOMEPAGE_SECTIONS = [
  { selector: '#landing-hero-heading', name: 'hero' },
  { selector: '#audience-path-heading', name: 'audience-path' },
  { selector: '.landing-trust-metrics', name: 'trust-metrics' },
  { selector: '#how', name: 'timeline' },
  { selector: '#interview-report', name: 'scoring-engine' },
  { selector: '#landing-founder-heading', name: 'founder' },
  { selector: '#meet-interviewers', name: 'meet-interviewers' },
  { selector: '#practice-transformation', name: 'transformation' },
  { selector: '#home-faq-heading', name: 'faq' },
  { selector: '#landing-final-cta-heading', name: 'final-cta' },
] as const;

type ConsoleIssue = { type: string; text: string };

function attachConsoleCollector(page: Page) {
  const issues: ConsoleIssue[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      const text = msg.text();
      if (/favicon|third-party cookie|DevTools/i.test(text)) return;
      issues.push({ type, text });
    }
  });

  page.on('pageerror', (error) => {
    issues.push({ type: 'pageerror', text: error.message });
  });

  return issues;
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
  expect(overflow, 'document should not scroll horizontally').toBeLessThanOrEqual(1);
}

async function settleHomepage(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(600);
}

test.describe('Release validation — homepage', () => {
  for (const viewport of VIEWPORTS) {
    test(`layout + sections @ ${viewport.label}`, async ({ page }, testInfo) => {
      const consoleIssues = attachConsoleCollector(page);
      const browser = testInfo.project.name;

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoMarketingPage(page, '/', { heading: HOME_HERO_HEADING });
      await settleHomepage(page);
      await assertNoHorizontalOverflow(page);

      for (const section of HOMEPAGE_SECTIONS) {
        const target = page.locator(section.selector).first();
        await target.scrollIntoViewIfNeeded({ timeout: 30_000 });
        if (section.selector.startsWith('.') || section.selector.includes('heading')) {
          await expect(target).toBeVisible({ timeout: 15_000 });
        } else {
          await expect(target).toBeAttached();
        }
        await assertNoHorizontalOverflow(page);
      }

      const useFullPageShot = viewport.width >= 768 && testInfo.project.name !== 'webkit';

      await page.screenshot({
        path: `${OUT_DIR}/${browser}/${viewport.label}-homepage-full.png`,
        fullPage: useFullPageShot,
      });

      const criticalIssues = consoleIssues.filter(
        (issue) =>
          issue.type === 'pageerror' ||
          /hydration|Hydration|did not match|Minified React error/i.test(issue.text),
      );
      expect(criticalIssues, `runtime errors on ${browser} @ ${viewport.label}`).toEqual([]);
    });
  }

  test('navigation, anchors, FAQ, and footer', async ({ page }, testInfo) => {
    const browser = testInfo.project.name;
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoMarketingPage(page, '/', { heading: HOME_HERO_HEADING });

    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(page.getByRole('button', { name: NAV_PRODUCT_MENU })).toBeVisible();
    await expect(nav.getByRole('link', { name: NAV_PRICING_LINK })).toBeVisible();
    await expect(nav.getByRole('link', { name: NAV_SIGN_IN })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'For Teams' })).toHaveCount(0);

    await page.getByRole('link', { name: /See Sample Interview Report/i }).first().click();
    await expect(page.locator('#interview-report')).toBeInViewport();

    await page.locator('#home-faq-heading').first().scrollIntoViewIfNeeded();
    const faqTab = page.getByRole('tab').first();
    await expect(faqTab).toBeVisible();
    await faqTab.click();
    await expect(page.locator('.landing-faq-panel--visible')).toBeVisible();

    await expect(page.locator('footer[aria-label="Site footer"]')).toBeVisible();

    await page.screenshot({
      path: `${OUT_DIR}/${browser}/desktop-1440-interactions.png`,
      fullPage: false,
    });
  });

  test('mobile nav + timeline section', async ({ page }, testInfo) => {
    const browser = testInfo.project.name;
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoMarketingPage(page, '/', { heading: HOME_HERO_HEADING });

    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();

    await page.evaluate(() => document.querySelector('#how')?.scrollIntoView({ block: 'start' }));
    await expect(page.locator('#landing-timeline-heading')).toBeVisible({ timeout: 15_000 });
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: `${OUT_DIR}/${browser}/mobile-390-timeline.png`,
      fullPage: false,
    });
  });

  test('tablet layout smoke', async ({ page }, testInfo) => {
    const browser = testInfo.project.name;
    await page.setViewportSize({ width: 768, height: 1024 });
    await gotoMarketingPage(page, '/');
    await waitForMainNav(page);
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();
    await assertNoHorizontalOverflow(page);

    await page.screenshot({
      path: `${OUT_DIR}/${browser}/tablet-768-home.png`,
      fullPage: true,
    });
  });
});
