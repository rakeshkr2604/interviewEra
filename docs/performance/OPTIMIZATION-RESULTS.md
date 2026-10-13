# Optimization results

> Status: CANONICAL
> Last Verified: 2026-10-13
> Verification Scope: Loop 6 release gate + Loop 5 staging TTFB traces on `perf/fullstack-performance-audit`
> Authority: Claimed improvements must match evidence below

## Purpose

Record what changed, why it should help, what was measured, and what is still blocked.

## Executive summary (Hinglish)

Dashboard slow is kyunki har login ke baad server **ek ke baad ek** 13–16 database calls maar raha tha — interviews, phir retention, phir script reports, phir snapshot dubara same reports. History saari interviews ek saath laati thi. Analytics/upgrade saare completed ids nikaalte the. Database pe `(user_id, status)` index pehle se hai; 90 ms wali query mostly **RLS + extra round-trips** hai, missing index nahi.

Loop 1 ne dashboard ko **2 waves** mein fold kiya, duplicate script-report read hataaya, history/analytics ko bound kiya, campus deadline N+1 band kiya, aur RLS init-plan + FK indexes ka migration **repo mein** rakha.

Loop 2 ne weekly-digest aur recovery-email N+1 batch kiya, production pe representative EXPLAIN capture kiya, `npm run analyze` (8 GB heap) se JS sizes nikaale, aur marketing navbar ko question-bank se alag kiya. Production pe migration apply nahi hua.

Loop 3 ne production-build Playwright lab (staging `next start`) + Vercel Speed Insights field p75 (28d) capture kiya, history overshoot clamp + pagination E2E add kiya, aur Recharts ko dashboard RSC graph se `ScoreTrendChartSlot` (`ssr: false` client wrapper) se nikaala.

Loop 4 ne field sample counts + device + LCP/CLS attribution nikale. Production `/dashboard` LCP p75 **5624 ms** (n=137) aur CLS p75 **0.16** (n=46) ab bhi fail hain — **undeployed** loop 1–4 loaders production pe nahi hain. Field TTFB p75 **2721 ms** (n=78) khud 2.5s LCP budget se upar hai.

Loop 5 ne staging `next start` pe gated `[perf:dashboard]` traces liye. Warmed document TTFB (fetch headers) median **326 ms** (n=5). Critical path `layout.total` ~195–328 ms (`auth.getUser` ~55–70 ms + chrome, usually `user_progress`). Two-wave loader `loader.total` ~392–735 ms **headers ke baad** stream hota hai — snapshot assemble ~0–3 ms, extra snapshot DB reads 0. Nayi backend fold nahi ki: remaining TTFB PostgREST latency hai, missing interviews index nahi. Authenticated Lighthouse n=1 desktop `/dashboard` score **93** / LCP **1658 ms** / CLS **0.015**; mobile Slow-4G LCP **7924 ms** — Loop 6 isko remaining lab risk kehta hai, speculative refactor nahi. Lab ko field p75 mat samajhna. Production field TTFB **2721 ms** old SHA hai. Production verification authorized rollout ke baad; operator packet [RELEASE-READINESS](RELEASE-READINESS.md).

## Current State

### Changes and why

| Change | Why it works |
|---|---|
| [`load-dashboard-page-data.ts`](../../src/lib/dashboard/load-dashboard-page-data.ts) | Independent reads in wave 1; script reports + org + retention in wave 2; snapshot is then CPU-only |
| Snapshot prefetch keys (`resumes`, `enrollment`, `scriptReports`, `collegeOrgName`, `client`) | Removes the second report query and the extra `createClient()` |
| Retention `Promise.all` | Cuts two serial hops on `/dashboard` and `/analytics` |
| `getCachedAuthUser` / `getCachedCandidateSnapshot` on sibling pages | Drops a duplicate Auth + cookie client per navigation |
| History offset pagination (default 20) | Lifetime tab counts stay exact; only one page of rows + reports load |
| Analytics/upgrade recent completed ids | Report charts still use last 20; upgrade lifetime count uses `count: exact` |
| Campus deadline single `user_progress` fetch | 1 + D queries → 1 progress query |
| Campus analytics date window + chunked `.in()` | Lifetime completion rate from counts, not the window length |
| Settings billing + snapshot `Promise.all` | Three sequential billing reads become one wave |
| Migration 116 | Init-plan RLS + recovery composite + advisor FK indexes |
| Weekly digest prefetch ([`weekly-digest-data.ts`](../../src/lib/email/weekly-digest-data.ts)) | Eligible users from lookback interviews; reports/V1 hops once; send stays sequential + idempotent |
| Recovery `prefetchSentLifecycleKeys` | One chunked `lifecycle_email_log` read instead of per-row lookups; dry-run still skips the log |
| [`nav-links.ts`](../../src/lib/seo/content/nav-links.ts) + dynamic `NavbarSlot` | Stops `questions.ts` (~492 KB raw / 156 KB gzip) riding the root-layout client graph onto `/dashboard` |
| History overshoot clamp | `?page=99` re-fetches the last page instead of a false empty state; lifetime counts stay exact |
| [`ScoreTrendChartSlot.tsx`](../../src/components/dashboard/ScoreTrendChartSlot.tsx) | `ssr: false` is illegal in Server Component `DashboardMain`; the client slot dropped Recharts (`6465`, 83 KB gzip) from the dashboard hint graph |
| `html { scrollbar-gutter: stable }` + dashboard chrome gutter | Field CLS attribution is the chrome footer + decorative blob, desktop-only (classic scrollbar). Overlay mobile scrollbars do not steal width |
| Tall dashboard skeletons (`min-h-[80dvh]`) | Replaces the centered spinner so the layout footer is not the first-viewport LCP/CLS node while RSC data loads |
| Community card SSR-visible | `useSyncExternalStore` server snapshot was `false`, then the card appeared after localStorage — in-flow shift |
| Score-trend reserved height `128px` | Placeholder was `h-28` (112px) vs Recharts `height={128}` |
| Stream `/dashboard` title + subtitle | Header no longer waits for the interview snapshot. Welcome redirect stays inside the data child |
| Gated `PERF_DASHBOARD_TRACE` | Staging-only `[perf:dashboard]` spans (no user ids). Default off. Not a TTFB optimization |

### Before / after database query counts (application)

| Path | Before (approx) | After (approx) | Evidence |
|---|---|---|---|
| `/dashboard` snapshot tail | 3–4 extra (resumes, enrollment, script reports, org) | 0 when prefetch is complete | `listSnapshotDbReads` unit test |
| `/dashboard` script reports | 2 | 1 | loader + prefetch filter |
| `/history` interviews | unbounded | ≤20 + 3 counts | `load-history-page-data.ts` |
| `/analytics` completed ids | all | 20 | `fetchRecentCompletedInterviewIds` |
| Campus deadlines | `2 + D` progress reads | 1 progress read | `deadline-progress` tests |
| Weekly digest | `1 + ~12U` worst | chunked constant (`estimateWeeklyDigestQueryCount`) | digest unit tests |
| Recovery reminders | `1 + N` sent-log lookups | `1 + ceil(N/100)` | `log-prefetch` + recovery tests |

### Query plans

See [QUERY-PLANS](QUERY-PLANS.md). Staging 116/117 are applied; production still pending authorization. Dummy-UUID staging EXPLAIN remains a seq scan and is not production evidence.

### Lighthouse / CWV / JS bytes

Distinguish **raw**, **gzip**, **route-specific**, and **shared**. Next.js 16 webpack route table no longer prints First Load JS; sizes below are from `.next/static/chunks` after `ANALYZE=true` webpack build (2026-10-13, before the nav-links split).

| Surface | Raw | Gzip | Role |
|---|---:|---:|---|
| `rootMainFiles` React (`4bd1b696-…`) | 196 KB | 62 KB | Shared app runtime |
| `rootMainFiles` vendor (`3794-…`) | 237 KB | 64 KB | Shared app runtime |
| Root `app/layout-…` | 69 KB | 21 KB | Shared every route |
| Dashboard layout | 27 KB | 8 KB | Authenticated chrome |
| Dashboard page | 23 KB | 7 KB | Route |
| `3974-…` (programmatic questions copy, leaked via `Navbar` → `nav.ts` → `registry`) | 492 KB | 156 KB | Shared **root layout** — not dashboard-specific, but downloaded with it |
| `6465-…` recharts | 263 KB | 83 KB | Loop 2: listed on dashboard graph even with RSC `next/dynamic`. Loop 3 client slot removed it from dashboard hint files (chunk still on disk for lazy load). |
| VideoSDK chunk | 1407 KB | 288 KB | Interview/coach — not in dashboard page file; do not count as dashboard initial |
| `razorpay` npm SDK | — | — | Server-only (`src/lib/razorpay/client.ts`). The 3974 hit was the word “Razorpay” in SEO copy, not the SDK. |

**200 KB compressed dashboard initial JS:**

Before nav-links split, counting the leaked question-bank chunk with React+vendor+layouts was ~318 KB gzip. After the split (measured on the follow-on `npm run build`, gzip -9 of on-disk chunks):

| Group | Gzip |
|---|---:|
| `rootMainFiles` (React + shared vendor + main-app) | 126 KB |
| Root `app/layout-…` | 11 KB |
| Dashboard layout | 8 KB |
| Dashboard page | 9 KB |
| **Named entry files** | **155 KB** |

The programmatic question bank (`spokenAnswer`) now lives only on the marketing blog layout chunk (159 KB gzip), not on `/dashboard`. That 155 KB figure is **not** the full browser transfer.

Loop 3 `scripts/perf/measure-dashboard-js-graph.ts` (gzip -9, webpack client-reference-manifest):

| Graph | Before `ScoreTrendChartSlot` | After |
|---|---:|---:|
| Named initial (rootMain + layouts + page + 8500/8409) | 169.9 KB gzip | 169.8 KB gzip |
| Full dashboard client-manifest JS (minus marketing homepage) | 464.5 KB gzip / 35 files | **355.7 KB gzip / 31 files** |
| Recharts `6465` on dashboard hint files | 83.2 KB gzip | **absent** (chunk still on disk, 269 KB raw) |
| VideoSDK / question-bank on dashboard hint files | absent | absent |

Local `next start` **does not gzip**. First `/dashboard` encoded JS body **574 910 B** (~561 KB uncompressed). That is not CDN transfer. 200 KB compressed initial JS is **not claimed**: named initial ~170 KB gzip is close; adding remaining shared chunks overshoots.

`ssr: false` directly in Server Component `DashboardMain` **failed compile**. Client wrapper `ScoreTrendChartSlot` is the working split. Loop 4 reserved height is **128px** (was `h-28` = 112px).

Loop 5 after-slot **browser** Network (staging `next start`, authenticated, first `/dashboard` in the production-lab run):

| Wave | When | What |
|---|---|---|
| Initial | ~439–441 ms | Runtime + layouts + dashboard page. **No** `6465`, VideoSDK, or question-bank |
| Layout chunk | ~702–706 ms | Dashboard layout / error |
| Idle prefetch | ~1465–1525 ms | Marketing tool/privacy/home chunks (Next `<Link>` prefetch) — not initial |
| Recharts | **1506 ms** | `6465-…` **85.6 KB** encoded / 85.6 KB transfer. After lab LCP (median 576 ms) |

First `/dashboard` encoded JS body **548 677 B**. `next start` is **not gzip**. Named-entry gzip remains **169.8 KB**. **200 KB compressed initial JS is not claimed.** Later-route `transferSize` 0 is disk cache.

| Metric | Baseline | Loop 5 | Notes |
|---|---|---|---|
| Server fetch TTFB proxy (warmed n=5, `127.0.0.1`) | not run | headers median **326 ms**; body median 264 ms (stream after headers); 200, not redirected | Not field TTFB |
| `[perf:dashboard]` warmed (last sample) | not run | auth 55 ms; chrome 140 ms (progress); layout.total **195 ms**; wave1 639 ms (completedCount); wave2 91 ms; snapshot 0.2 ms; loader.total 731 ms | Layout blocks TTFB; loader is after first byte |
| Lighthouse (authenticated, staging `next start`, **n=1**, Slow-4G mobile / desktop preset) | loop 4 table | See table below | Not field p75. `next start` is ungzipped. |
| Production-build lab (`next start`, staging DB, n=3, desktop Chromium) | loop 4: TTFB 264 / LCP 404 / CLS 0 | `/dashboard` TTFB median **262** / p75 **357**; FCP 524; LCP median **576** / p75 **1132**; CLS **0**; LCP tag `P`; `shiftSources` []; Recharts start **1506 ms**; requestCount 91 | Cold 1-pass nav: TTFB 1066, FCP 1528, LCP 1908, 90 requests. **Not field CWV.** |
| Staging E2E | loop 4: 9/9 | **6/6** this loop (nav 1 + history 4 + production-lab 1). Smoke suite not re-run | Local Playwright config still refused (`.env.local` is production). |
| Public PSI / CrUX | Unknown | **not retried** | Previously HTTP 429 |
| Field p75 (Vercel Speed Insights, production, 28d, consent-gated) | loop 4 n + device | Unchanged — old production SHA | Loop 1–5 code is **not on production** |
| Image transfer | Unchanged | Unchanged | Avatar uses public storage URL |

Authenticated Lighthouse n=1, loop 5 (do not treat as p75):

| Form | Route | Score | TTFB | FCP | LCP | TBT | CLS |
|---|---|---:|---:|---:|---:|---:|---:|
| mobile | `/dashboard` | 58 | 1007 | 1683 | **7924** | 581 | 0 |
| mobile | `/history` | 58 | 663 | 1686 | 5668 | 781 | 0.007 |
| mobile | `/analytics` | 60 | 379 | 1678 | 7772 | 554 | 0 |
| mobile | `/settings` | 48 | 740 | 1825 | 7894 | 1086 | 0.072 |
| desktop | `/dashboard` | 93 | 457 | 432 | **1658** | 16 | 0.015 |
| desktop | `/history` | 96 | 661 | 436 | 1136 | 27 | 0.002 |
| desktop | `/analytics` | 93 | 689 | 430 | 1595 | 30 | 0.010 |
| desktop | `/settings` | 92 | 671 | 469 | 1620 | 52 | 0.043 |

Field `/dashboard` 28d (2026-09-15 → 2026-10-13), consent-gated Speed Insights:

| Metric | n | p75 | Device split |
|---|---:|---:|---|
| LCP | **137** | **5624 ms** | mobile n=71 p75 **128 ms**; desktop n=66 p75 **7748 ms** |
| FCP | (route p75) | **4776 ms** | — |
| TTFB | **78** | **2721 ms** | — |
| CLS | **46** | **0.16** | desktop p75 **0.16**; mobile p75 **0.09** |
| INP | (loop 3) | **168 ms** | pass |

LCP attribution (count): `<main>` 64, header subtitle `<p>` 41, `span.min-w-0` 23, footer `<p>` 8. CLS attribution: chrome `footer` 22, decorative `div.pointer-events-none.absolute.opacity-80` 12. Function-invocation TTFB needs Observability Plus — **not purchased**. `/history` `/analytics` `/settings` still missing from the top-route list.

### Tests run after implementation

Loop 1–5 results remain in the working tree. Loop 6 release gate:

| Check | Result |
|---|---|
| `npx tsx scripts/perf/dashboard-query-benchmark.ts` | PASS — prefetch still avoids all 9 snapshot DB reads; prints request plan |
| `npm run lint` | PASS (0 warnings) |
| `npm run typecheck` | PASS |
| `npm test` | PASS — **361 files / 2598 tests** (includes TRACE-off production-config contract) |
| `npm run verify:migrations` | PASS — highest serial 117; next `118_name.sql` |
| `npm run verify:docs` | PASS (0 FAIL; 38 WARN archive/intentional only) |
| Staging-env `npm run build` | PASS — webpack 38.4s, noindex 281 URLs, 0 contradictions |
| Analyze (`ANALYZE=true` + 8 GB heap, `npx next build --webpack`) | PASS — client/nodejs/edge HTML reports. `npm run analyze` still fails on Windows cmd because the script prefixes `ANALYZE=true` |
| Playwright staging vs `next start` | **6/6 PASS** (nav + history 4 including mobile tabs + production-lab). `/dashboard` lab TTFB median **296** / LCP **492** / CLS **0**; Recharts start 1413 ms. Smoke 3 **not re-run**. Local Playwright config **not run** (`.env.local` is production) |
| Authenticated Lighthouse | **not re-run** this loop — Loop 5 n=1 table still stands. Mobile Slow-4G `/dashboard` LCP **7,924 ms** remains a lab risk |
| Production migrations 116/117 | **applied Loop 7** — see [RELEASE-READINESS](RELEASE-READINESS.md) |

### Staging apply (116)

Applied to `iiowrzfwemaxytbykjrg` via reviewed SQL (not production).

Verified:

- Five policies now use `(SELECT auth.uid())` / `(SELECT auth.role())`.
- Recovery composite + advisor FK indexes exist, except `idx_app_error_events_user_id` (table absent on staging).
- Original five production `auth_rls_initplan` findings are gone on staging.
- Follow-on **117** wraps staging-only `interview_turns` drift (`Users can view own interview turns`). Production already had `(SELECT auth.uid())`.
- After 117, staging Performance Advisor (loop 5 recheck): `auth_rls_initplan` = 0, `unindexed_foreign_keys` = 0. Residual: unused_index **120** and multiple_permissive_policies 45. Do not drop unused indexes.
- Dummy-UUID EXPLAIN still seq-scans the 10-row table.

### Production rollout (Loop 7 — done)

1. App squash-merged to `main` as `9c28886` via PR #166; production deploy `dpl_DpA4pFK5VF8yXdPL15tZTEeGVJ4u` READY on `interviewera.com`.
2. Production 116 then 117 applied on `plfuvgkycmxcyshrgpgv` (ledger `20261013093634` / `20261013094210`). Advisor InitPlan + unindexed-FK findings cleared. Unused indexes **not** dropped.
3. `PERF_DASHBOARD_TRACE` and `ANALYZE` confirmed unset in Production env list.
4. Authenticated smoke **BLOCKED** pending owner test account. Unauthenticated auth gate **PASS**.
5. New-SHA Speed Insights window starting `2026-10-13T09:35:28Z` currently **n=0**. Old-SHA baseline (TTFB 2721 / LCP 5624 / CLS 0.16) remains separate. Operator packet: [RELEASE-READINESS](RELEASE-READINESS.md).

### Remaining blockers

- New-SHA field p75 **PENDING** until post-deploy n ≥ baseline (TTFB ≥78, LCP ≥137, CLS ≥46). Do not attribute old-SHA 2721/5624 to this release.
- Authenticated production smoke needs owner test account.
- Mobile Lighthouse `/dashboard` LCP **7,924 ms** (Slow 4G, n=1) remains unresolved lab risk — production-equivalent trace before more code.
- Function-level TTFB: Observability Plus **not** purchased.
- Multiple permissive policies on `interviews` SELECT (authorization-preserving).
- `PERF_DASHBOARD_TRACE` must stay off in production.

## Architecture / Rules

A better Lighthouse score is not acceptable if credits, RLS, reports, or lifetime counts regress. This pass preserved those contracts in unit tests.

## Dependencies

[BASELINE](BASELINE.md) · [AUDIT-FINDINGS](AUDIT-FINDINGS.md) · [QUERY-PLANS](QUERY-PLANS.md) · [RELEASE-READINESS](RELEASE-READINESS.md)

## Failure Modes

Applying 116 to production without staging advisor proof.

## Verification

`npx tsx scripts/perf/dashboard-query-benchmark.ts`

## Change Triggers

New measurement run · staging apply · CWV capture

## Related Documents

[PERFORMANCE](../Guidelines/PERFORMANCE.md)
