import type { Page } from '@playwright/test';

/** Current anonymous marketing navbar IA (For Teams / Campus nav removed). */
export const NAV_PRODUCT_MENU = 'Product';
export const NAV_INTERVIEW_QUESTIONS_MENU = 'Interview Questions';
export const NAV_TOOLS_MENU = 'Tools';
export const NAV_RESOURCES_MENU = 'Resources';
export const NAV_PRICING_LINK = 'Pricing';
export const NAV_SIGN_IN = 'Sign in';
export const NAV_SIGN_UP = "Sign up - It's Free!";

/** Wait until auth-deferred navbar has hydrated (not skeleton). */
export async function waitForMainNav(page: Page): Promise<void> {
  await page
    .locator('header .animate-pulse')
    .waitFor({ state: 'hidden', timeout: 15_000 })
    .catch(() => undefined);
  await page.locator('nav[aria-label="Main navigation"]').waitFor({ state: 'visible' });
}

/** Deterministic marketing page readiness — DOM + primary landmark, no arbitrary sleeps. */
export async function gotoMarketingPage(
  page: Page,
  path: string,
  options?: { heading?: RegExp | string },
): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForMainNav(page);
  if (options?.heading) {
    await page.getByRole('heading', { name: options.heading }).first().waitFor({ state: 'visible' });
  } else {
    await page.locator('#main-content, main').first().waitFor({ state: 'visible' });
  }
}
