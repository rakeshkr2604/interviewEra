import { test } from '@playwright/test';
import { HOME_HERO_HEADING } from '../helpers/marketing-home';
import { gotoMarketingPage } from '../helpers/marketing-nav';

const OUT_DIR = 'screenshots/phase2-release';

const PAGES: { path: string; heading?: RegExp; name: string }[] = [
  { path: '/', heading: HOME_HERO_HEADING, name: 'homepage' },
  { path: '/campus', heading: /coming soon/i, name: 'campus' },

  { path: '/pricing', heading: /Your complete interview preparation/i, name: 'pricing' },
  { path: '/how-it-works', heading: /before the interview/i, name: 'how-it-works' },
];

const VIEWPORTS = [
  { label: 'desktop', width: 1280, height: 900 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'mobile', width: 390, height: 844 },
] as const;

test.describe('Release screenshots', () => {
  test.skip(!!process.env.CI, 'Screenshot capture runs locally for release validation');

  for (const pageDef of PAGES) {
    for (const viewport of VIEWPORTS) {
      test(`${pageDef.name} ${viewport.label} dark`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await gotoMarketingPage(page, pageDef.path, pageDef.heading ? { heading: pageDef.heading } : undefined);
        await page.screenshot({
          path: `${OUT_DIR}/${pageDef.name}-${viewport.label}-dark.png`,
          fullPage: true,
        });
      });
    }

    test(`${pageDef.name} desktop light`, async ({ page }) => {
      await page.addInitScript(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
      });
      await page.setViewportSize({ width: 1280, height: 900 });
      await gotoMarketingPage(page, pageDef.path, pageDef.heading ? { heading: pageDef.heading } : undefined);
      await page.screenshot({
        path: `${OUT_DIR}/${pageDef.name}-desktop-light.png`,
        fullPage: true,
      });
    });
  }
});
