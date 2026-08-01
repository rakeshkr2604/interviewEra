import { test, expect } from '@playwright/test';
import { HOME_HERO_HEADING } from '../helpers/marketing-home';
import { gotoMarketingPage } from '../helpers/marketing-nav';

test.describe('page_view analytics', () => {
  test('homepage fires durable page_view once on load', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.clear();
      } catch {
        /* ignore */
      }
      const w = window as Window & { __pageViews?: unknown[] };
      w.__pageViews = [];
      window.addEventListener('ie-product-event', (event) => {
        const detail = (event as CustomEvent).detail;
        if (detail?.event_name === 'page_view') {
          w.__pageViews?.push(detail);
        }
      });
    });

    await gotoMarketingPage(page, '/', { heading: HOME_HERO_HEADING });

    await expect
      .poll(
        async () => {
          const events = await page.evaluate(
            () =>
              (window as Window & { __pageViews?: { event_name?: string; page_path?: string }[] })
                .__pageViews ?? [],
          );
          return events.length;
        },
        { timeout: 15_000 },
      )
      .toBe(1);

    const events = await page.evaluate(
      () =>
        (window as Window & { __pageViews?: { event_name?: string; page_path?: string }[] })
          .__pageViews ?? [],
    );
    expect(events[0]?.page_path).toBe('/');
  });
});
