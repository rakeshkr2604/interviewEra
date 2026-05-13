# InterviewEra technical SEO infrastructure

This document describes the production SEO stack after the scalable sitemap + robots refactor.

## Folder structure

```
src/app/
  sitemap.xml/route.ts          # Sitemap index → pages / blog / tools child maps
  pages-sitemap.xml/route.ts
  blog-sitemap.xml/route.ts
  tools-sitemap.xml/route.ts
  robots.ts
src/lib/seo/
  site-url.ts                    # getCanonicalSiteOrigin, canonicalUrl, CANONICAL_HOST
  metadata.ts                    # generateMetadata, authPageMetadata, privatePageMetadata, PAGE_SEO
  crawl-policy.ts
  robots-rules.ts                # Single source for robots Disallow prefixes
  internal-links.ts              # Hub links for cross-section internal linking
  sitemap/
    registry.ts                  # All indexable paths + priorities + changefreq + lastModified
    serialize.ts                 # XML urlset + sitemap index serializers
  schema/
    jsonld.ts                    # BreadcrumbList, FAQPage, Article JSON-LD builders
src/components/seo/
  StructuredData.tsx             # Global Organization graph (root layout)
  JsonLdScript.tsx               # Reusable JSON-LD script tag
  SeoCrossLinksSection.tsx       # Generic server-rendered link strip
  HomeMoneyPageLinks.tsx         # Homepage hub
  ToolsRelatedBlogStrip.tsx      # Appended under all /tools/* pages
  BlogRelatedToolsStrip.tsx      # Appended under all /blog/* pages
```

## What was deleted

- **`src/app/sitemap.ts`** — replaced by `sitemap.xml/route.ts` (index) + three child XML routes so the sitemap scales without one giant file.

## What to keep

- **`vercel.json`** redirects — `www` → apex HTTPS and apex HTTP → HTTPS remain the first line of defense (before middleware).
- **`middleware.ts`** — duplicates host/https normalization for non-Vercel or edge cases; keeps auth gating.
- **`next.config.ts`** `redirects` + security `headers` (including `X-Robots-Tag` on manifest + `/_next/static/media/*`).

## Migration steps

1. Deploy this branch to production.
2. In **Google Search Console** → **Sitemaps**, remove any stale single-map URL if needed, then submit **`https://interviewera.com/sitemap.xml`** (index). Google will follow child sitemaps from the index.
3. Run **URL Inspection** on `/campus`, `/tools/ats-checker`, `/blog/...` after deploy to confirm “URL is on Google” over time (indexing is not instant).
4. Optional: add **Cron / on-publish** workflow later to bump `lastModified` in `registry.ts` for blog rows when you edit posts (today values are static ISO dates).

## Indexability policy (summary)

| Area | Policy |
|------|--------|
| Marketing pages, blog, tool landings | `index,follow` + sitemap |
| Tool **results** | `noindex,follow` + `robots.txt` disallow paths |
| Auth (`/login`, `/signup`, forgot, reset) | `noindex,follow` — **not** in sitemap; do **not** `robots` disallow (so Google can read meta if it crawls) |
| `/join` | `permanentRedirect` → `/signup` — not listed in sitemap |
| App shell (`/dashboard`, `/interview/*`, …) | `robots.txt` disallow + `privatePageMetadata` where applicable |

## Deployment checklist

- [ ] `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` in production = `https://interviewera.com` (no `www`, no localhost).
- [ ] `VERCEL_ENV=production` on prod (preview/staging keep `BLOCK_SEARCH_INDEXING` or rely on `isFullSiteCrawlBlocked()` via `VERCEL_ENV !== production`).
- [ ] Submit `https://interviewera.com/sitemap.xml` in GSC.
- [ ] Spot-check `curl -I https://interviewera.com/sitemap.xml` → `200` + `application/xml`.
- [ ] Spot-check www + http variants → `301` to `https://interviewera.com/...`.

## Performance / crawl (Part 9)

- Cross-link strips use **`prefetch={false}`** on hub links to avoid prefetch storms from many parallel `<Link>` components.
- Do **not** add `Disallow: /_next/` to `robots.txt` — it can harm rendering-based indexing.

## “Discovered – currently not indexed” (why + what we did)

Google may list URLs as discovered before it prioritizes a crawl. Fixes applied:

- **Stronger internal links** — homepage + blog + tools layouts now inject crawlable HTML hubs (server components).
- **Sitemap index + segmented maps** — clearer information architecture for crawlers.
- **`/signup`** — intentionally **`noindex,follow`** (SaaS auth page should not rank for head terms). Expect GSC “Excluded by `noindex` tag” after crawl — that is correct.
- **`/join`** — redirect-only; equity consolidates on `/signup` / marketing CTAs.
- **Money pages** (`/campus`, tools) — remain indexable; continue improving **unique copy** and **FAQ JSON-LD** on individual URLs using `JsonLdScript` + `faqPageJsonLd` when you have real Q&A content.
