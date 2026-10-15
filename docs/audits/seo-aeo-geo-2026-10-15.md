# SEO / AEO / GEO audit — 2026-10-15

> Status: AUDIT (point-in-time)
> Last Verified: 2026-10-15
> Verification Scope: Live crawl of interviewera.com (production `e4069fe`), GSC screenshots (6 May–14 Oct 2026), source audit of `src/lib/seo/**`, lab performance on production + local builds
> Authority: Engineering evidence for branch `seo/indexing-metadata-loop`. Canonical policy lives in [SEO_AEO_GEO](../Core/SEO_AEO_GEO.md).

## Purpose

Record the baseline, the keyword-to-URL map, URL-level indexing dispositions, the fixes shipped on this branch, and the evidence behind each. Separate measured facts from hypotheses.

Evidence legend: **G** = GSC screenshot (first-party) · **C** = live crawl script · **S** = source read · **L** = lab measurement · **W** = web search tool (not Google rank data) · **H** = hypothesis.

## Baseline

| Item | Value | Source |
|---|---|---|
| Production SHA | `e4069fe` (= `origin/main`, GitHub deployment record 2026-10-14 13:24 UTC) | GitHub deployments API |
| GSC, 6 May–14 Oct 2026 | 1.78K clicks · 47.8K impressions · CTR 3.7% · avg position 11.8 | G |
| GSC page indexing (as supplied) | 164 indexed · 149 not indexed (108 crawled-not-indexed, 18 noindex, 6 discovered, 6 404, 4 redirect, 3 robots, 2 soft-404, 1 other 4xx, 1 alternate canonical) | supplied report, not re-verified |
| Live sitemap URLs | 285 (pages 19 · blog 17 · tools 97 · questions 152) | C |
| Sitemap URLs non-200 / noindex / non-self-canonical | 0 / 0 / 0 | C |
| Broken internal links (404) | 4 targets: `/blog/aptitude-preparation-guide`, `/tools/mock-interview`, `/interview-questions/companies/amazon/data-scientist`, `/interview-questions/topics` (31 topic-page breadcrumbs) | C |
| Truncated `<title>`s | 7 indexable pages ending mid-phrase (e.g. `InterviewEra \| Google Apprenticeship 2026: Eligibility,`) | C |

**Access limits:** No GSC API or export of the 108 crawled-not-indexed URLs was available. Only the top-10 queries/pages screenshots exist. Vercel MCP returned 403 for team scope `rakesh-kumars-projects-98d26ab6`, and the Vercel CLI is not installed, so field Speed Insights data was **not** read. No field CWV claims are made.

### GSC top pages (G)

| Page | Clicks | Impressions | CTR |
|---|---:|---:|---:|
| `/` | 402 | 1,364 | 29.5% |
| `/interview-questions/companies/infosys/java-developer` | 124 | 3,647 | 3.4% |
| `/google-apprenticeship` | 89 | 7,535 | **1.2%** |
| `/blog/agentic-coding-round` | 82 | 1,371 | 6.0% |
| `/interview-questions/solera` | 78 | 1,719 | 4.5% |
| `/interview-questions/companies/freshworks/frontend-developer` | 76 | 723 | 10.5% |
| `/interview-questions/companies/wipro` | 74 | 2,810 | 2.6% |
| `/interview-questions/companies/microsoft/software-engineer` | 72 | 1,660 | 4.3% |
| `/blog/amazon-sde-intern-interview-experience-2026` | 70 | 715 | 9.8% |
| `/interview-questions/companies/amazon/software-engineer` | 69 | 886 | 7.8% |

Top queries (G): `interviewera` 324/449, `google apprenticeship 2026` 31/516, `agentic coding interview` 17/127, `interview era` 11/24, `infosys java spring boot microservices interview questions` 6/68, `freshworks frontend interview experience` 6/11, `infosys java developer interview questions` 4/35, `microsoft sde 1 interview experience 2026` 4/28, `google apprenticeships 2026` 4/10, `amazon sde 1 intern interview experience 2026` 4/5. Brand queries are about 20% of clicks; non-brand traffic comes from company/role and event pages.

## Keyword clusters → preferred URL

Search volume and difficulty are **Unknown — not measured** (no keyword tool access). Position data per query is not available beyond the screenshot.

| Cluster | Primary intent | Preferred URL | Competing URLs / risk | Action |
|---|---|---|---|---|
| AI mock interview / mock interview online / AI interview practice | Commercial (product) | `/` | `/campus` used the same title phrase (fixed → B2B title); `/how-it-works` (supporting); `/blog/ai-mock-interviews-smartest-prep-2026` (informational) | Keep `/` as head. W: SERP for "AI mock interview platform India free" is led by AceInterview, InstaMock, Sansal, Phiny, Hirable. Win with differentiators (resume-aware, 5-dimension rubric), not more pages |
| Brand (`interviewera`, `interview era`) | Navigational | `/`, `/interviewera` | None material | Entity markup already present (Organization / WebSite / SoftwareApplication with `alternateName`) |
| Free interview question generator | Tool | `/tools/question-generator` | 52 role/company tool variants (median sibling overlap 0.24–0.42) | Keep variants indexable for now; monitor GSC. Candidate for the same gate if they show as crawled-not-indexed |
| ATS resume checker | Tool | `/tools/ats-checker` | 21 `/tools/ats-checker/[role]` variants (83–88% duplicate) | **Variants noindex,follow + out of sitemap.** Title deliberately says "Resume Parser Check" (PR #62 honesty decision) — owner decision whether to add "ATS" back |
| STAR method answer builder | Tool + informational | `/tools/star-builder` + `/blog/what-is-star-method-with-examples` | 20 STAR topic variants (overlap ≈0.43) | Keep; distinct examples per topic |
| Freshers / campus placement prep | Informational | `/blog/how-to-prepare-for-placement-interviews` | `/blog/top-10-interview-questions-freshers-india-2026`, `/campus` (B2B) | Keep; refresh dates when content changes |
| HR interview practice | Informational | `/resources/hr-interview-answer-framework` | `/blog/hr-interview-answer-tips-and-tricks` | Cannibalization risk — consolidate or differentiate (follow-up) |
| Software engineer / Android / Java interview questions | Informational | `/interview-questions/{software-engineer,android-developer,java-developer}` | Template intersections reused these banks (now noindex) | Done — role pages are the canonical answer |
| Infosys Java / TCS / Wipro / Microsoft / Amazon | Informational, company-specific | Editorial intersection + company hubs | Template intersections for the same company (now noindex) | Keep editorial; add verified process detail + citations over time |
| Agentic coding interview / AI-assisted coding | Informational (emerging) | `/blog/agentic-coding-round` (hub `/blog/agentic-ai-interview-round-2026`) | `/blog/cursor-ai-interview-guide`, `/blog/ai-prompt-engineering-interview` | Spokes link to hub; title truncation fixed on hub |
| Google Apprenticeship | Event / news | `/google-apprenticeship` | None | **Status refreshed** (window closed 3 Aug 2026) + title fixed |
| Interview anxiety | Informational | `/blog/overcome-interview-anxiety-mock-interviews` | `/blog/english-confidence-interviews` (adjacent) | Keep |
| Ranchi / Jharkhand | Local | none | — | **No page created.** No local partnerships/events evidence in repo; Organization `address` only |
| Broad `interview` | Stretch | none | — | Not targeted directly; built through topical depth |

## Indexing dispositions (this branch)

| Group | Count | Evidence | Disposition |
|---|---:|---|---|
| Editorial intersections (Amazon SE, Microsoft SE, Infosys SE/Java, Freshworks FE, Wipro SE/Java/QA/DA) | 9 | Sibling overlap 0.05–0.28 (C) | **Index**, in sitemap (`EDITORIAL_INTERSECTION_KEYS`) |
| Template intersections (TCS ×6, Solera ×5, Accenture ×4, Infosys ×3, HCL ×3, Cognizant ×3, IBM ×3, Google ×3, Zoho ×3, Capgemini ×2, Tech Mahindra ×2, Microsoft ×2, Amazon ×2, Flipkart ×2, Swiggy ×2, Zomato ×2, Razorpay ×2, PhonePe ×2, CRED ×2, Groww ×2, Meesho ×2, Zerodha ×2, Freshworks ×1) | 60 | Sibling overlap 0.73–0.97, median 0.94; parent role overlap median 0.60 (C) | **noindex,follow**, removed from sitemap. Pages stay 200 and linked. Promote by adding a key when an editorial article ships |
| ATS role variants `/tools/ats-checker/[role]` | 21 | Sibling overlap 0.83–0.88 (C); tool itself only on `/tools/ats-checker` (S) | **noindex,follow**, removed from sitemap (`isAtsRoleVariantIndexable`) |
| Role, company, topic pages | 82 | Sibling overlap ≤0.26 (C) | Unchanged (indexable) |
| QGen role/company + STAR topic variants | 72 | Sibling overlap 0.18–0.77 (C) | Unchanged — watch GSC; next candidates for the gate |
| Tool `results` pages, auth, app routes | — | robots disallow + noindex (S) | Unchanged |

Sitemap: **285 → 204** URLs (C, local build). `npm run audit:noindex` PASS with new expected-noindex assertions.

**H:** The 81 de-listed URLs plausibly make up a large share of the 108 "crawled — currently not indexed". This cannot be confirmed without the GSC URL export.

## Fixes shipped (branch `seo/indexing-metadata-loop`)

| # | Severity | Finding | Root cause | Fix | Verified |
|---|---|---|---|---|---|
| 1 | High | 81 near-duplicate programmatic URLs in sitemap | `isIntersectionIndexable` passed every intersection whose parents had ≥6 questions; ATS variants never gated | Editorial allowlist + ATS gate in `indexing.ts`; sitemap + metadata follow; audit asserts | Unit tests, noindex audit, local crawl |
| 2 | High | `/google-apprenticeship` (7.5K impressions, 1.2% CTR) said "Applications open now" after the 3 Aug 2026 deadline; title truncated to "…Eligibility," | Stale event content; brand prefix + 60-char clamp | Status copy updated (W: Google program-manager LinkedIn post, 3 Aug 2026, "Applications close TODAY"); absolute 59-char title; `dateModified` 2026-10-15; Article author → Organization | Local crawl |
| 3 | Medium | 7 truncated titles ending in `,`/`and`/`The`/`–` | `clampTitleSegment` cut at word boundary only | Clamp strips dangling separators/connectives; rewrote 6 source titles to fit | `metadata.test.ts`, local crawl (0 dangling) |
| 4 | Medium | 4 broken internal link targets (35 pages) | Links to never-built pages; topic breadcrumb to missing `/topics` index | Repointed to live pages; breadcrumb → `/interview-questions#topics` | Local crawl: 0 internal 404s |
| 5 | Low | Public pages linking `/dashboard` and `/tools` (both 307 → login) | — | `/signup` and `/tools/ats-checker` | Local crawl |
| 6 | Low | `/campus` (B2B) shared homepage's title phrase | Copy | "AI Mock Interview Platform for Colleges" | Source |
| 7 | Low | Unsourced "Over 75% of large companies use ATS" | Copy | Neutral wording | Source |
| 8 | High (UX/CWV) | Desktop CLS 0.10 on `/`, ~0.037–0.06 on every marketing page | Hero simulator shell 242px shorter than live card; community banner inserted into flow after idle with no reserved space | Shell footprint matches live card; pre-paint banner reservation | See performance |

Intentionally unchanged: links from guides/tools to `/interview/script/start?mode=…` and `/feedback?category=…` (logged-in actions; robots-disallowed) and the `/tools/ats-checker` title (product decision).

## Performance

Lab only; no field CWV read (see access limits). Desktop = Lighthouse `--preset=desktop`, headless Chrome `--disable-gpu`; medians of n=3.

**Production baseline (`e4069fe`, L):**

| Page | Score | TBT | CLS | LCP |
|---|---:|---:|---:|---:|
| `/` | 67 | 916 | 0.101 | 768 |
| `/google-apprenticeship` | 98 | 108 | 0.037 | 738 |
| `/interview-questions/companies/infosys/java-developer` | 90 | 247 | 0.049 | 814 |
| `/tools/question-generator` | 95 | 172 | 0.037 | 776 |
| `/blog/agentic-coding-round` | 100 | 22 | 0.037 | 778 |

**Desktop TBT investigation (L):** Homepage long tasks are mostly unattributed main-thread time (document 2,669 ms total, 3 ms script). Playwright long-task totals: GPU-enabled Chrome ≈1 ms; `--disable-gpu` ≈200–230 ms (bimodal); JavaScript disabled 0 ms; disabling CSS animations/filters/shadows/blend/pseudo-backgrounds individually or together did not remove it; blocking the MP4 did not remove it. On desktop the simulator turn engine mounts on the next frame after hydration (`LandingHeroSimulatorGestureLoader`); on mobile it waits for a gesture — consistent with desktop-only TBT. **Not fixed** on this branch; an earlier "blocked chunk" Lighthouse run was invalid (chunk abort triggers the route error boundary) and is not used as evidence.

**CLS fix — same-build A/B (Playwright, layout-shift observer, n=3 median, fresh visitor; "before" reproduces the old shell/banner via injected CSS):**

| Page | 1350px before → after | 390px before → after |
|---|---|---|
| `/` | 0.172 → 0.004 | 0.062 → 0.000 |
| `/google-apprenticeship` | 0.037 → 0 | 0.062 → 0.005 |
| `/interview-questions/companies/infosys/java-developer` | 0.037 → 0.001 | 0.063 → 0.001 |
| `/tools/question-generator` | 0.037 → 0.001 | 0.061 → 0 |
| `/blog/agentic-coding-round` | 0.037 → 0 | 0.062 → 0.001 |

Cohorts (L, `/`, 1350px): dismissed-banner and joined visitors get no reserved strip and no banner; dismiss collapses the slot (user-initiated, excluded from CLS). Local desktop Lighthouse on `/` (local `next start`, uncompressed) CLS 0.038 after the shell fix alone — TBT on local builds is not comparable with production and is not claimed.

## Tests run

| Check | Result |
|---|---|
| `npm run lint` | PASS (0 warnings) |
| `npm run typecheck` | PASS |
| `npm test` | PASS (see final report for counts) |
| `npm run audit:noindex` / `npm run build` | PASS — 204 sitemap URLs, 0 contradictions |
| Marketing Playwright (`playwright.staging.config.ts`, staging Supabase `iiowrzfwemaxytbykjrg`, local staging-env `next start`) | 66/69 first run; the 3 failures (campus redirect host, nav auth timing, deferred-section timing) passed on rerun with server host matching `NEXT_PUBLIC_APP_URL` |
| Live/local crawl | `scripts/seo/live-crawl-audit.ts` |

## GSC actions still required (owner)

1. Export **Page indexing → Crawled – currently not indexed** URL list; compare with the 81 de-listed URLs above.
2. After deploy, resubmit `sitemap.xml`; use **Validate fix** on Crawled-not-indexed and Not found (404) reports.
3. URL-inspect + request indexing for `/google-apprenticeship`, `/interview-questions/business-analyst`, `/interview-questions/solera`, `/blog/agentic-ai-interview-round-2026`, Wipro editorial intersections.
4. Watch CTR on `/google-apprenticeship` for 28 days after recrawl (baseline 1.2%).

## Prioritized roadmap

**30 days:** confirm de-indexing in GSC; gate QGen/STAR variants if they appear as crawled-not-indexed; decide desktop simulator mount policy (idle/interaction) with field data; consolidate HR answer pages; owner decision on ATS checker title.

**60 days:** one editorial intersection per month for intersections with GSC impressions (TCS Java, Accenture SE are candidates — verify impressions first); add cited hiring-process sources to company hubs; refresh 2026-05 blog dates only with real edits.

**90 days:** Google Apprenticeship next-cycle update when Google announces it; measure non-brand click share vs this baseline; revisit brand-first title template (`InterviewEra | %s`) with CTR data.

## Related Documents

[SEO_AEO_GEO](../Core/SEO_AEO_GEO.md) · [OPTIMIZATION-RESULTS](../performance/OPTIMIZATION-RESULTS.md) · [ENGINEERING_WORKFLOW](../Guidelines/ENGINEERING_WORKFLOW.md)
