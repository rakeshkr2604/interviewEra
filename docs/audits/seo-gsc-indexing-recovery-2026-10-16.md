# SEO / GSC indexing recovery — 2026-10-16

> Status: AUDIT (point-in-time)
> Last Verified: 2026-10-16
> Verification Scope: Live production crawl of robots/sitemaps + sample noindex URLs; GitHub PRs #174–#176; main tip `e10f351`; code audit of sitemap registry / indexing gate; GSC screenshots supplied in the recovery brief (no GSC API export)
> Authority: Engineering evidence for the GSC indexing recovery change set. Canonical policy: [SEO_AEO_GEO](../Core/SEO_AEO_GEO.md).

## Purpose

Reconcile GSC sitemap/indexing numbers with live production, classify the supplied exclusion examples, record justified code fixes, and separate verified facts from access-blocked gaps.

Evidence legend: **G** = GSC screenshot (supplied) · **C** = live HTTP/crawl · **S** = source · **H** = hypothesis · **B** = blocked (no credential/export).

## Current state (verified)

| Item | Value | Source |
|---|---|---|
| `origin/main` tip | `e10f351` — `fix: billing route, nav chrome, and landing Coming Soon gates (#176)` | Git |
| PR #174 / #175 / #176 | All **MERGED**; CI green on merge (incl. Build + E2E Auth + Vercel preview SUCCESS for #176) | GitHub |
| Production GitHub deployment | `e10f351` created 2026-10-16T06:45:04Z (id `7112786990`) | GitHub Deployments API |
| Vercel MCP production list | **403** for team scope (same limit as 2026-10-15 audit) | B |
| Live robots.txt | 200; disallows `/api/`, `/admin/`, `/interview/`, `/settings`, tool `results`, etc.; Sitemap → `https://interviewera.com/sitemap.xml` | C |
| Live sitemap index | 4 children: pages, blog, tools, questions | C |
| Live URL counts | pages **19** · blog **17** · tools **76** · questions **92** · **total 204** | C |
| Registry rebuild (pre-fix) | Same 204; with Coming Soon fail-closed pages sitemap → **202** | S |

### Font build note (PR #176 + this PR)

Preview failure (`next/font/google` → `Cannot read properties of null (reading '1')`) hit PR #176 (cleared by empty re-trigger `60c92a3`) and **recurred** on this branch’s first Vercel preview (`dpl_9MVunqCxKj3SUHCqNUhQrjXZDWoc`). Local `npm run build` succeeded. Root cause: build-time Google Fonts CSS fetch/parse returning null in `next/font` google loader. **Fix:** self-host latin `woff2` under `src/fonts/**` and load via `next/font/local` in `src/app/layout.tsx` (no build-time fonts.googleapis.com dependency).

## Sitemap reconciliation: 284 vs 204

| Report | Count | Interpretation |
|---|---:|---|
| Pre–PR #174 live sitemap (2026-10-15 audit) | 285 | C (prior audit) |
| Post–PR #174 live + build | 204 | C + S |
| Live production 2026-10-16 (before this change set) | **204** (19+17+76+92) | C |
| GSC `sitemap.xml` “discovered pages” | **284** (last read 2026-10-16) | G |
| GSC `pages-sitemap.xml` | **19** | G — **matches live pages child** |

**Verified fact:** Production currently serves **204** indexable URLs across four children, matching the PR #174 gate (81 near-duplicates removed: 60 template intersections + 21 ATS role variants).

**Best-supported explanation for 284:** GSC’s sitemap-index “discovered” figure is **stale / cumulative** relative to the pre-gate ~285 URL set (284 ≈ 285 − 1), not the live child totals. Child `pages-sitemap.xml` already matches live (19). Google has not yet fully replaced the index-level discovered count with the post-gate inventory.

**Not assumed:** A second production deploy still serving 285 URLs (headers + child counts contradict that).

## Indexing analysis

### Access limit

No GSC API and no URL-level export of the **117** “Crawled – currently not indexed” rows was available in this environment (**B**). Classification below uses the supplied **18 noindex examples**, route inventory, and PR #174’s 81 de-listed URLs.

### A. Excluded by `noindex` (18 examples — classified)

| Example / group | Live robots (C) | Intent | Action |
|---|---|---|---|
| `/dashboard` | 307 → login `noindex, follow` | Auth / app | Keep |
| `/login`, `/forgot-password` | `noindex, follow` | Auth | Keep |
| `/join` | `noindex, nofollow` | Invite/join | Keep |
| `/help` | `noindex, follow`, canonical → `/help-center` | FAQ alias; hub is `/help-center` | Keep (also explains **alternate canonical**) |
| Topics with **0** questions: `low-level-design`, `pandas`, `azure` (+ `agile`, `jira`, `redis`, `ios`) | `noindex, follow` | Content gate (`isSkillIndexable`) | Keep until questions ship |
| Topics with **≥6** questions shown in GSC noindex list: `typescript`, `google-cloud`, `angular`, `mysql`, `postgresql`, `graphql`, `machine-learning`, `django` | Live **`index, follow`** + in questions sitemap | **Stale GSC classification** after content/gate promotion | Owner: Validate fix / inspect URL in GSC (no code bug) |
| `/interview-questions/companies/tcs/java-developer`, `.../google/software-engineer` | `noindex, follow` | Template intersections (not in `EDITORIAL_INTERSECTION_KEYS`) | Keep |
| Editorial controls (e.g. Amazon SE, Infosys Java) | `index, follow` | Bespoke articles | Keep indexable |

### B–F. Other exclusion buckets (no URL export)

| Bucket | Count (G) | Status |
|---|---:|---|
| Page with redirect | 4 | **B** — exact URLs unknown; live host normalization still `www`/`http` → `https://interviewera.com` |
| Alternate canonical | 1 | **Likely `/help` → `/help-center`** (verified pattern) |
| 404 / soft 404 / other 4xx | 6 / 2 / 1 | **B** — prior audit fixed 4 internal 404 targets; residual need export |
| Robots.txt blocked | 3 | **H** — matches intentional disallows (`/settings`, `/interview/`, results) |
| Discovered – not indexed | 6 | **B** — monitor after sitemap re-read |
| Crawled – not indexed | 117 | **H** — large overlap expected with the 81 PR #174 de-listings + thin QGen/STAR variants still indexable; confirm with export |

### Homepage H1

Single `<h1 id="landing-hero-heading">` with lead + `sr-only` first rotating phrase + decorative CSS rotation (**S** + C). Concatenated text extraction is **not** multiple H1s.

## Fixes in this change set

| # | Severity | Finding | Fix | Test |
|---|---|---|---|---|
| 1 | High | Marketing/tool/variant sitemap `lastmod` used request `Date` (live pages showed `2026-10-16T06:51…` for `/`, legal, etc.) | Stable dates; omit invented `now` | `registry.test.ts` |
| 2 | Medium | `/campus` + `/teams` Coming Soon were indexable + in sitemap (thin shells) | `noindex,follow` when Coming Soon; pages sitemap includes only when mode `live` | unit + live after deploy |
| 3 | Low | Editorial H1 adjacent spans produced `EngineerInterview` in plain-text extraction | Insert `{' '}` between line/accent spans | source parity with hubs that already had space |

## SEO / AEO / GEO status

| Area | Status |
|---|---|
| Technical sitemap / robots / indexing gate | Verified live + tightened lastmod + Coming Soon gate |
| Structured data / brand entity | Unchanged this pass; prior Organization/WebSite/SoftwareApplication remain SoT in metadata |
| AI-referral measurement | **Unmeasured** — no ChatGPT/Gemini/Perplexity citation dataset in repo; do not claim citations |
| GSC Validate fix / URL inspect | **Owner** (needs Search Console) |
| Organic growth prioritization | Still: `/google-apprenticeship` CTR, editorial company×role, homepage, free tools (from 2026-10-15 audit) |

## Owner follow-ups

1. Resubmit `sitemap.xml` in GSC; confirm discovered count moves toward **202** (Coming Soon excluded) or **204** if both landings are live.
2. Export crawled-not-indexed URL list; diff vs 81 PR #174 de-listings.
3. Validate fix on noindex for promoted topic pages (typescript, etc.).
4. URL-inspect high-value pages after recrawl.

## Related Documents

[SEO_AEO_GEO](../Core/SEO_AEO_GEO.md) · [seo-aeo-geo-2026-10-15](./seo-aeo-geo-2026-10-15.md)
