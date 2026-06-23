# GSC Indexing SEO Audit — Deliverables

**Date:** 2026-06-23  
**GSC baseline:** 71 not indexed (48 discovered, 8 crawled, 3 redirect, 1 robots, 1 404, 10 noindex)  
**Note:** No GSC CSV exports were present in `scripts/gsc-exports/` — audit table inferred from production crawl + codebase. Re-run `npx tsx scripts/gsc-audit-mapper.ts` after dropping CSV exports for exact URL mapping.

---

## 1. Audit artifacts

| File | Description |
|------|-------------|
| [scripts/gsc-audit-report.json](gsc-audit-report.json) | Machine-readable audit (72 rows) |
| [scripts/gsc-audit-report.md](gsc-audit-report.md) | Human-readable audit table |
| [scripts/seo-audit-report.json](seo-audit-report.json) | Live production crawl (305 URLs) |
| [scripts/gsc-audit-mapper.ts](gsc-audit-mapper.ts) | GSC CSV + crawl merger (new) |

---

## 2. URLs fixed (code changes applied)

| URL | Issue | Fix |
|-----|-------|-----|
| `/interview-questions/topics/spring` | 404 | Internal links → `/interview-questions/topics/spring-boot` |
| `/interview-questions/topics/css` | 404 | Internal links → `/interview-questions/topics/html-css` |
| `/interview-questions/topics/dsa` | 404 | Internal links → `/interview-questions/topics/algorithms` |
| `/interview-questions/companies/tcs` | Redirect source | solera-hub link → `/interview-questions/tcs` |

**Metadata trimmed (crawled-not-indexed quality signals):**

| URL | Change |
|-----|--------|
| `/help-center` | Description 162 → ≤160 chars |
| `/blog/what-is-star-method-with-examples` | Description 170 → ≤160 chars |
| `/blog/what-is-agentic-ai` | Title shortened |
| `/blog/agentic-coding-round` | Title shortened |
| `/interview-questions/companies/wipro` | Title shortened |
| `/interview-questions/topics/html-css` | Title uses `shortLabel` |
| `/tools/star-builder/mentoring` | STAR title pattern shortened |

**Internal linking strengthened:**

- Header Resources dropdown now uses all 11 `NAV_RESOURCE_ITEMS` links
- Footer adds 4 agentic spoke blog links
- `RELATED_TAG_MAP` completed for 3 underlinked blog posts

**IndexNow:** 9 priority URLs submitted (status 200).

---

## 3. URLs intentionally left unchanged

- All **10 noindex** GSC URLs (tool results, thin skills, `/join`, `/open/badges`, `system-analyst`, etc.)
- **robots.txt** — no changes (disallow rules correct)
- Valid **301 redirects:** `react-js` → `react`, `www` → apex, `/interview` → `/onboarding`, `/manifest.json` → webmanifest
- **Tool variant sitemap policy** — no removal (no GSC CSV evidence to gate)
- **Sitemap structure** — no bulk changes (270 URLs, 0 duplicates, 0 noindex contradictions)

---

## 4. Files modified

### Hub / article fixes (404 + redirect)
- `src/lib/seo/programmatic/wipro-java-hub.ts`
- `src/components/programmatic/WiproJavaHubArticle.tsx`
- `src/lib/seo/programmatic/freshworks-fe-hub.ts`
- `src/components/programmatic/FreshworksFeHubArticle.tsx`
- `src/lib/seo/programmatic/solera-hub.ts`
- `src/lib/seo/programmatic/wipro-hub.ts`
- `src/lib/seo/programmatic/wipro-swe-hub.ts`
- `src/components/programmatic/SoleraHubArticle.tsx`
- `src/components/programmatic/WiproSweHubArticle.tsx`

### Internal linking
- `src/components/layout/MarketingHeader.tsx`
- `src/lib/seo/content/nav.ts`
- `src/lib/seo/content/related.ts`

### Metadata
- `src/app/(marketing)/help-center/page.tsx`
- `src/app/(marketing)/blog/what-is-star-method-with-examples/page.tsx`
- `src/lib/seo/blog/agentic-spoke-what-is.ts`
- `src/lib/seo/blog/agentic-spoke-coding-round.ts`
- `src/lib/seo/programmatic/wipro-hub.ts`
- `src/lib/seo/programmatic/metadata.ts`

### Tooling (new / extended)
- `scripts/gsc-audit-mapper.ts` (new)
- `scripts/deployment-audit.ts` (hub href slug validator)
- `scripts/gsc-audit-report.json` (generated)
- `scripts/gsc-audit-report.md` (generated)

---

## 5. Validation results (post-fix)

| Script | Result |
|--------|--------|
| `deployment-audit.ts` | AUDIT_PASS (0 broken links, 0 invalid hub hrefs) |
| `noindex-audit.ts` | PASS (0 sitemap/noindex contradictions) |
| `validate-seo-metadata.ts` | PASS (0 length violations) |
| `submit-indexnow.ts` | 9 URLs accepted (HTTP 200) |

---

## 6. Predicted GSC issue reduction (24–48h post-deploy)

| Issue | Before | Predicted after 48h | Delta |
|-------|--------|---------------------|-------|
| 404 | 1 | 0 | **-1** |
| Redirect | 3 | 1–2 | **-1 to -2** |
| Crawled – not indexed | 8 | 5–7 | **-1 to -3** |
| Discovered – not indexed | 48 | 44–46 | **-2 to -4** |
| Robots blocked | 1 | 1 | 0 |
| Noindex | 10 | 10 | 0 |
| **Total not indexed** | **71** | **~61–66** | **~5–10** |

Full clearance of 48 "discovered" URLs requires multi-week crawl budget — not deploy-day.

---

## 7. Git-style summary (not committed)

```
fix(seo): resolve hub 404 links, redirect source, and crawl signals

- Fix broken topic hrefs: spring→spring-boot, css→html-css, dsa→algorithms
- Fix solera-hub TCS link to pillar URL /interview-questions/tcs
- Wire NAV_RESOURCE_ITEMS in header; add agentic spokes to footer
- Complete RELATED_TAG_MAP for 3 underlinked blog posts
- Trim metadata on 7 pages flagged by live crawl
- Add gsc-audit-mapper.ts + hub href validation in deployment-audit
- Submit IndexNow for 9 priority URLs

17 source files changed | Est. GSC impact: 5–10 issues in 48h
```

---

## 8. Post-deploy actions

1. Deploy to production
2. Export GSC URLs into `scripts/gsc-exports/*.csv` and re-run `npx tsx scripts/gsc-audit-mapper.ts`
3. Request validation in GSC for redirect + 404 fixes
4. Re-run `npx tsx scripts/full-seo-audit.ts` after deploy to confirm metadata fixes on live
