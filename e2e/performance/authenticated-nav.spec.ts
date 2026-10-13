import { expect } from '@playwright/test';
import { authReady, authenticatedTest as test } from '../helpers/auth-fixture';

/**
 * Lab navigation timings for authenticated candidate routes.
 * This is not field Core Web Vitals and not a Lighthouse score.
 */

const ROUTES = [
  '/dashboard',
  '/history',
  '/analytics',
  '/settings',
] as const;

type NavSample = {
  path: string;
  ttfbMs: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  transferJsBytes: number;
  requestCount: number;
};

test.describe('authenticated navigation lab timings', () => {
  test.skip(!authReady, 'Requires authenticated Playwright storage state');

  test('records TTFB, FCP, LCP, and JS transfer for core candidate routes', async ({
    page,
  }) => {
    const samples: NavSample[] = [];

    for (const path of ROUTES) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
        timeout: 20_000,
      });
      await page.waitForTimeout(1000);

      const sample = await page.evaluate(async (routePath) => {
        const nav = performance.getEntriesByType(
          'navigation',
        )[0] as PerformanceNavigationTiming | undefined;
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find((entry) => entry.name === 'first-contentful-paint');
        const lcpMs = await new Promise<number | null>((resolve) => {
          let latest: number | null = null;
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              latest = Math.round(entries[entries.length - 1].startTime);
            }
          });
          try {
            observer.observe({
              type: 'largest-contentful-paint',
              buffered: true,
            });
          } catch {
            resolve(null);
            return;
          }
          setTimeout(() => {
            observer.disconnect();
            resolve(latest);
          }, 50);
        });
        const resources = performance.getEntriesByType(
          'resource',
        ) as PerformanceResourceTiming[];
        const js = resources.filter(
          (entry) =>
            /\.js(\?|$)/.test(entry.name) || entry.initiatorType === 'script',
        );
        const transferJsBytes = js.reduce(
          (sum, entry) => sum + (entry.transferSize || 0),
          0,
        );
        return {
          path: routePath,
          ttfbMs: nav ? Math.round(nav.responseStart) : null,
          fcpMs: fcp ? Math.round(fcp.startTime) : null,
          lcpMs,
          transferJsBytes,
          requestCount: resources.length + (nav ? 1 : 0),
        };
      }, path);

      samples.push(sample);
    }

    console.log('[perf:authenticated-nav]', JSON.stringify(samples, null, 2));

    for (const sample of samples) {
      expect(sample.requestCount).toBeGreaterThan(0);
      if (sample.ttfbMs != null) expect(sample.ttfbMs).toBeGreaterThan(0);
    }
  });
});
