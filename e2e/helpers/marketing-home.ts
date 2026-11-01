import { expect, type Page } from '@playwright/test';

/** Landing homepage copy/selectors — keep in sync with LandingHero + LandingHeroCtaIsland. */

export const HOME_HERO_HEADING = /turn your resume into interview-ready practice/i;

/** Primary hero CTA — still reports `cta_key: start_free_interview`. */
export const HOME_CTA_START_FREE = 'Create Free Account';

/** Secondary hero CTA — scrolls to the free-tool Bento. */
export const HOME_CTA_FREE_TOOLS = 'Explore Free Tools';

export const HOME_CTA_FREE_TOOLS_HREF = '/#free-tools';

/** Scroll until a viewport-deferred homepage section mounts, then bring it into view. */
export async function revealDeferredSection(page: Page, selector: string, timeoutMs = 30_000) {
  const target = page.locator(selector).first();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if ((await target.count()) > 0) {
      await target.scrollIntoViewIfNeeded({ timeout: Math.max(1_000, deadline - Date.now()) });
      return target;
    }
    await page.evaluate(() => {
      const step = Math.max(240, Math.floor(window.innerHeight * 0.75));
      window.scrollBy(0, step);
    });
    // Short attachment poll so IntersectionObserver can mount after the scroll.
    try {
      await target.waitFor({ state: 'attached', timeout: 250 });
      await target.scrollIntoViewIfNeeded({ timeout: Math.max(1_000, deadline - Date.now()) });
      return target;
    } catch {
      // Keep scrolling until deadline.
    }
  }

  await expect(target, `deferred section ${selector} never mounted`).toBeAttached({
    timeout: 1_000,
  });
  return target;
}
