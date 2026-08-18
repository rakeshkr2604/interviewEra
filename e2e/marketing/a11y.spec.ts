import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { HOME_HERO_HEADING } from '../helpers/marketing-home';
import { gotoMarketingPage } from '../helpers/marketing-nav';

const MARKETING_ROUTES: { path: string; heading?: RegExp }[] = [
  { path: '/', heading: HOME_HERO_HEADING },
  { path: '/campus', heading: /placement outcomes/i },
  // /pricing accessible copy is "InterviewEra plans" (sr-only <h2 id="pricing-plans">).
  { path: '/pricing', heading: /interviewera plans/i },
  { path: '/how-it-works', heading: /before the interview/i },
];

async function applyTheme(page: import('@playwright/test').Page, theme: 'dark' | 'light') {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((selectedTheme) => {
    document.documentElement.setAttribute('data-theme', selectedTheme);
    document.documentElement.classList.toggle('dark', selectedTheme === 'dark');
    try {
      localStorage.setItem('ie-theme', selectedTheme);
    } catch {
      /* ignore */
    }
  }, theme);
}

function axeForRoute(page: import('@playwright/test').Page, _path: string) {
  return new AxeBuilder({ page });
}

test.describe('marketing axe audit', () => {
  test.describe.configure({ mode: 'serial' });

  for (const { path, heading } of MARKETING_ROUTES) {
    test(`marketing a11y (dark): ${path}`, async ({ page }) => {
      await applyTheme(page, 'dark');
      await gotoMarketingPage(page, path, heading ? { heading } : undefined);
      const results = await axeForRoute(page, path).analyze();
      expect(results.violations).toEqual([]);
    });

    test(`marketing a11y (light): ${path}`, async ({ page }) => {
      await applyTheme(page, 'light');
      await gotoMarketingPage(page, path, heading ? { heading } : undefined);
      const results = await axeForRoute(page, path).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
