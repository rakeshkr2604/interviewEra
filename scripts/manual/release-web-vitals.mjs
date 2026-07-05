import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const paths = ['/', '/teams', '/college'];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const path of paths) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((p) => p.name === 'first-contentful-paint');
    let cls = 0;
    const shifts = performance.getEntriesByType('layout-shift');
    for (const entry of shifts) {
      cls += entry.value ?? 0;
    }
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    const lcp = lcpEntries[lcpEntries.length - 1];
    return {
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      fcp: fcp ? Math.round(fcp.startTime) : null,
      lcp: lcp ? Math.round(lcp.startTime) : null,
      cls: Number(cls.toFixed(3)),
    };
  });
  console.log(`${path}\tFCP=${metrics.fcp}ms\tLCP=${metrics.lcp ?? 'n/a'}ms\tCLS=${metrics.cls}\tDCL=${metrics.domContentLoaded}ms`);
}

await browser.close();
