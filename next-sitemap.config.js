/**
 * Reference / parity with common next-sitemap setups.
 *
 * Canonical host + HTTPS are enforced in production by `vercel.json` redirects
 * and `middleware.ts` (apex `interviewera.com`, no `www`).
 *
 * Sitemap index + split child maps are App Router route handlers:
 * `src/app/sitemap.xml/route.ts`, `pages-sitemap.xml`, `blog-sitemap.xml`, `tools-sitemap.xml`.
 * Registry: `src/lib/seo/sitemap/registry.ts`. Robots: `src/app/robots.ts`.
 *
 * The `next-sitemap` package is not installed; do not add a postbuild step
 * without removing the native sitemap route to avoid duplicates.
 */
module.exports = {
  siteUrl: 'https://interviewera.com',
  generateRobotsTxt: true,
  sitemapSize: 7000,
};
