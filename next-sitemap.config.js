/**
 * Reference / parity with common next-sitemap setups.
 *
 * This repo serves sitemap via App Router: `src/app/sitemap.ts` and
 * `src/app/robots.ts`. Those use `getCanonicalSiteOrigin()` from
 * `src/lib/seo/site-url.ts`, which defaults to the same `siteUrl` below.
 *
 * The `next-sitemap` package is not installed; do not add a postbuild step
 * without removing the native sitemap route to avoid duplicates.
 */
module.exports = {
  siteUrl: 'https://interviewera.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
};
