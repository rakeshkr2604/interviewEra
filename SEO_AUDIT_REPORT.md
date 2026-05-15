# SEO Audit Report — InterviewEra
**Date:** 2026-05-15  
**Auditor:** Claude Code (Senior Technical SEO + Next.js specialist)  
**Property:** interviewera.com (Google Search Console Domain property)

---

## Executive Summary

The technical infrastructure is solid: fonts are self-hosted via `next/font`, canonical URLs are consistent, sitemap index architecture is correct, and the metadata helper (`generateMetadata`) is used site-wide. The site went live in early May 2026 — the "Discovered - currently not indexed" pages are largely a crawl-queue delay for a new property, not a structural error.

However, six actionable fixes will accelerate indexing and improve rich-result eligibility significantly:

| Priority | Issue | Impact |
|----------|-------|--------|
| P0 | No JSON-LD FAQ schema on `/pricing` | Missing Enhancement in GSC → lower CTR |
| P0 | No JSON-LD FAQ schema on `/campus` | Missing Enhancement → missed B2B rich result |
| P0 | No structured data on tool pages | No WebApplication/HowTo signals |
| P1 | `/college/` not disallowed in `robots.txt` | Crawl budget leak on auth-redirect loops |
| P1 | `/join` has no `noindex` metadata | Redirect page confusing Google |
| P2 | Campus metadata title is weak | Low CTR from serp |

---

## Section 1 — Metadata & Canonical Layer

### 1.1 generateMetadata helper
- **Status:** ✅ Good
- All marketing pages use `generateMetadata()` from `src/lib/seo/metadata.ts`
- `metadataBase` is set in root layout to `https://interviewera.com`
- Canonical `alternates` are set per-page via `canonicalUrl(path)`

### 1.2 Blog layout title template
- **Status:** ✅ Acceptable
- `src/app/(marketing)/blog/layout.tsx` exports `title.template: "%s | InterviewEra"`
- This overrides root layout template for blog routes — intentional and correct
- Per-post pages set their own title which populates `%s`

### 1.3 `ai-mock-interviews-smartest-prep-2026` metadata
- **Status:** ⚠️ Minor inconsistency
- This post uses manual `metadata` object instead of `generateMetadata()` helper
- It sets all required fields (canonical, OG, Twitter, robots) manually — no functional gap
- Recommendation: migrate to `generateMetadata()` on next editorial pass (not blocking)

### 1.4 Open Graph images
- **Status:** ✅ Good
- Dynamic OG image at `/og/default.png/route.tsx` using `next/og` (ImageResponse)
- 1200×630, brand-consistent gradient + headline + domain
- All pages fall back to this image; no per-page OG images (acceptable for MVP)

### 1.5 Twitter cards
- **Status:** ✅ Good
- `twitter:card: "summary_large_image"` on all pages via `generateMetadata()`

### 1.6 robots meta
- **Status:** ✅ Good
- Dashboard, interview, report, settings, onboarding, auth routes: all `noindex, nofollow`
- Tool results pages: `noindex` via `generateMetadata({ noIndex: true })`
- Marketing routes: `index, follow`

---

## Section 2 — Structured Data

### 2.1 Root Organization + WebSite + SoftwareApplication
- **Status:** ✅ Present
- `src/components/seo/StructuredData.tsx` emits a `@graph` with Organization, Person (founder), WebSite, SoftwareApplication
- Injected into `<head>` via root layout — site-wide

### 2.2 Article schema on blog posts
- **Status:** ✅ 2 of 7 blog posts have Article schema
  - `top-10-interview-questions-freshers-india-2026`: Article + FAQ + Breadcrumb + Organization ✅
  - `ai-mock-interviews-smartest-prep-2026`: Article + Breadcrumb ✅
  - All other blog posts: **No JSON-LD** (Article schema missing on 5 posts)
- **Fix needed:** Add Article + Breadcrumb JSON-LD to remaining 5 blog posts

### 2.3 FAQ schema on pricing page
- **Status:** ❌ MISSING — HIGH PRIORITY
- `PRICING_FAQ` array exists in `src/lib/landing/home-content.ts` (4 Q&A pairs)
- FAQ section renders client-side in `PricingPageClient.tsx`
- No `FAQPage` JSON-LD is emitted in `src/app/(marketing)/pricing/page.tsx`
- **Fix:** Add `faqPageJsonLd(PRICING_FAQ)` to pricing page server component
- **Expected impact:** FAQPage Enhancement in GSC → expandable FAQ in SERP → ~25-40% CTR increase

### 2.4 FAQ schema on campus page
- **Status:** ❌ MISSING — HIGH PRIORITY
- `FAQ_ITEMS` array exists in `src/lib/landing/campus-content.ts` (5 Q&A pairs)
- FAQ section renders in `CampusLandingClient.tsx`
- No `FAQPage` JSON-LD emitted in `src/app/(marketing)/campus/page.tsx`
- **Fix:** Add `faqPageJsonLd(FAQ_ITEMS)` to campus page server component
- **Expected impact:** Rich result for B2B campus query → higher trust signal from Google

### 2.5 Structured data on tool pages
- **Status:** ❌ MISSING — HIGH PRIORITY
- `/tools/ats-checker`, `/tools/question-generator`, `/tools/star-builder` have zero JSON-LD
- These are high-intent free tools with good keyword metadata — schema would amplify them
- **Fix:** Add `SoftwareApplication` + `BreadcrumbList` schema to each tool page
- **Expected impact:** WebApplication rich results eligibility + Sitelinks potential

### 2.6 Breadcrumb schema
- **Status:** ⚠️ Partial
- 2 blog posts have `BreadcrumbList` schema
- Pricing, campus, about, tools pages: **no breadcrumb schema**
- GSC "Breadcrumbs" enhancement shows 2 valid — these are likely from blog posts
- **Fix:** Add `BreadcrumbList` to pricing, campus, about pages minimum

---

## Section 3 — Sitemap

### 3.1 Sitemap index architecture
- **Status:** ✅ Excellent
- `/sitemap.xml` → sitemap index with 3 child sitemaps
- `/pages-sitemap.xml` → 7 marketing/legal routes
- `/blog-sitemap.xml` → 8 blog routes (1 hub + 7 posts)
- `/tools-sitemap.xml` → 3 tool landing routes
- Total: 18 URLs → matches GSC "18 discovered pages" exactly ✅
- `revalidate: 3600` on all sitemap routes

### 3.2 Missing routes in sitemap
- **Status:** ⚠️ Minor
- `/join` is NOT in sitemap (correct — it's a redirect page)
- `/about` IS in sitemap (`changeFrequency: monthly, priority: 0.65`) ✅
- `/open/badges` is NOT in sitemap — this is a dynamic OG-share page, could be intentional

### 3.3 Freshness signals
- **Status:** ⚠️ Improvable
- All entries in `pages-sitemap.xml` use `now` as `lastModified` (dynamic, always current)
- Blog posts have explicit `lastModified: '2026-05-01'` dates — good
- Tools entries use `now` — should use a stable date to avoid misleading Google about change frequency

---

## Section 4 — Robots.txt

### 4.1 Current disallows
- **Status:** ⚠️ Incomplete
- Correctly disallows: `/api/`, `/admin/`, `/dashboard`, `/onboarding`, `/interview/`, `/report/`, `/history`, `/analytics`, `/settings`, `/upgrade`, `/feedback`, `/auth/callback`, tool results
- **Missing:** `/college/` — college dashboard routes exist at `/college/dashboard/*` and require authentication. Google will hit a redirect-to-login loop for any crawl attempt. Wastes crawl budget.
- **Missing:** `/college/signup` is an auth page (`authPageMetadata` + `noindex`) but not disallowed in robots

### 4.2 Font files crawled
- **Status:** ℹ️ Informational (not harmful)
- `/_next/static/media/*.woff2` files appear in "Crawled - currently not indexed" in GSC
- This is normal — Google fetches font files for rendering evaluation
- The skill file explicitly says NOT to block `/_next/` as Google needs these for rendering

### 4.3 manifest.json crawled
- **Status:** ℹ️ Informational
- `/manifest.json` → "Crawled - currently not indexed" — expected, not harmful

---

## Section 5 — Indexing Status (from GSC)

### 5.1 "Discovered - currently not indexed" (8 pages)
| URL | Root Cause | Fix |
|-----|-----------|-----|
| `/campus` | New site, crawl queue | FAQ schema will signal quality |
| `/pricing` | New site, crawl queue | FAQ schema will signal quality |
| `/join` | Redirect page (308) | Add noindex metadata |
| `/privacy` | New site, low-priority legal | Normal — will index in time |
| `/refund` | New site, low-priority legal | Normal |
| `/terms` | New site, low-priority legal | Normal |
| `/tools/ats-checker` | New site, crawl queue | WebApplication schema helps |
| `/tools/star-builder` | New site, crawl queue | WebApplication schema helps |

> Root cause for most: the property was added to GSC on **May 8, 2026** — 7 days ago. "Discovered" = Google found the URL but the crawl scheduler hasn't rendered it yet. This is normal for new domains. Adding structured data and improving internal linking will accelerate prioritization.

### 5.2 "Page with redirect" (3 pages)
- `https://www.interviewera.com/` → redirects to `https://interviewera.com/` (apex)
- `http://www.interviewera.com/` → same
- `http://interviewera.com/` → redirects to HTTPS

> These are correct www→apex and http→https redirects. GSC is in validation mode. No action needed — the canonical `https://interviewera.com` is correctly indexed.

### 5.3 "Crawled - currently not indexed" (4 items)
- `/manifest.json` — expected, harmless
- `/_next/static/media/*.woff2` (3 font files) — expected, harmless

---

## Section 6 — Internal Linking

### 6.1 Homepage links
- **Status:** ✅ Good
- `HomeMoneyPageLinks` component renders: pricing, campus, question-generator, ats-checker, star-builder, blog
- All key money pages are linked from the homepage

### 6.2 Tool pages
- **Status:** ✅ Good
- Each tool page has cross-links to other tools via inline text or footer
- `ToolsLayout` appends `ToolsRelatedBlogStrip` to all `/tools/*` pages

### 6.3 Blog pages
- **Status:** ✅ Good
- `BlogLayout` appends `BlogRelatedToolsStrip` to all `/blog/*` pages
- Each blog post has `relatedPosts` links to 2-3 related articles

### 6.4 Missing links
- Pricing page has **no links to blog** or tool pages — missed engagement opportunity
- Campus page has no links to individual tool pages (just pricing)

---

## Section 7 — Performance (Core Web Vitals)

### 7.1 Fonts
- **Status:** ✅ Excellent
- `next/font/google` used for Bricolage Grotesque, DM Sans, JetBrains Mono
- Weight subsets are tight (no unnecessary weights loaded)
- `adjustFontFallback: true` prevents CLS
- `preload: false` on JetBrains Mono (not LCP-critical)

### 7.2 Image loading
- **Status:** ✅ Good
- OG image is via `ImageResponse` (edge-rendered)
- `next/image` used where images appear in components

### 7.3 Client component heavy pages
- **Status:** ℹ️ Acceptable
- `PricingPageClient` and `CampusLandingClient` are both `'use client'` — but Next.js App Router SSRs all components, so HTML is pre-rendered for Google
- No client-only data fetching that would leave empty shells for crawlers

---

## Section 8 — Content Quality

### 8.1 Thin pages risk
| Page | Content Level | Risk |
|------|--------------|------|
| `/privacy` | Legal text, thin | Low — legal pages normally indexed |
| `/refund` | Legal text, thin | Low |
| `/terms` | Legal text, thin | Low |
| `/join` | Just a redirect | Medium — confuses Google |
| `/blog` (hub) | Article list only | Low — thin hub but well-linked |

### 8.2 PRICING_FAQ data accuracy
- **Note (do not fix without approval):** `PRICING_FAQ` says "Free includes **5** lifetime credits" but CLAUDE.md states the free tier is **3 credits** (the DB default is 5 but new signups get 3). The FAQ content should be reviewed and corrected by the product team.

### 8.3 Blog content
- 7 blog posts — all appear substantive based on content length and structure
- Posts have proper H1/H2 hierarchy, estimated read times, related posts linking
- No obvious thin or duplicate content

---

## Prioritized Fix List

| # | Fix | File(s) | Effort | Impact |
|---|-----|---------|--------|--------|
| 1 | FAQ JSON-LD on pricing page | `pricing/page.tsx` | 15 min | High |
| 2 | FAQ JSON-LD on campus page | `campus/page.tsx` | 15 min | High |
| 3 | WebApplication + Breadcrumb JSON-LD on all 3 tool pages | `tools/*/page.tsx` (3 files) | 30 min | High |
| 4 | Add `/college/` + `/college/signup` to robots.txt disallow | `robots-rules.ts` | 5 min | Medium |
| 5 | Add `noindex` to `/join` page | `join/page.tsx` | 5 min | Medium |
| 6 | Improve campus metadata title | `campus-content.ts` | 5 min | Medium |
| 7 | Article + Breadcrumb JSON-LD on 5 remaining blog posts | Blog page.tsx files | 60 min | Medium |
| 8 | Add internal links from pricing page to tools/blog | `PricingPageClient.tsx` | 20 min | Low |
