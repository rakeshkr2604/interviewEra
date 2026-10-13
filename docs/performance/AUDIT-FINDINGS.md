# Performance audit findings

> Status: CANONICAL
> Last Verified: 2026-10-13
> Verification Scope: Dashboard, history, analytics, settings, campus deadlines, production advisor, field LCP/CLS attribution, loop 5 staging TTFB traces, Loop 9 sign-in + admin funnel
> Authority: Confirmed bottlenecks with file paths

## Purpose

Correlate production SQL, advisor output, and application call sites. Not every slow statement is the dashboard.

## Current State

### Confirmed dashboard bottlenecks

| ID | Finding | Evidence | Impact |
|---|---|---|---|
| D1 | Sequential dashboard waterfall | `src/app/(dashboard)/dashboard/page.tsx` waited on interviews, then retention snap, then script reports, then `src/lib/candidate/load-snapshot.ts` | High — TTFB |
| D2 | Duplicate `script_interview_reports` | Page fetched reports for 5 ids; snapshot fetched again for completed ids in the 20-row window (`load-snapshot.ts` script-report select) | High — extra round-trip on every dashboard view |
| D3 | Snapshot always called `createClient()` | Even when interviews/progress/user were prefetched, resumes + enrollment + reports still ran on a new client | High |
| D4 | Retention extras were serial | [`build-retention-dashboard-snap.ts`](../../src/lib/retention/build-retention-dashboard-snap.ts) `getTierConfig` → latest quality log → weekly count | Med |
| D5 | Sibling pages repeated `auth.getUser` | Layout already cached auth; history/analytics/settings/notifications/readiness/roadmap created a new client | Med |
| D6 | History loaded every interview | `src/app/(dashboard)/history/page.tsx` `.select(...)` with no `.limit()` / range, then `.in(interviewIds)` for both report tables | High as history grows |
| D7 | Analytics/upgrade fetched all completed ids | Then bounded reports to 20. Lifetime count on upgrade used `array.length` of the unbounded list | High / correctness risk |
| D8 | Campus deadlines N+1 | [`deadlines/page.tsx`](../../src/app/college/dashboard/deadlines/page.tsx) re-fetched all `user_progress` once per deadline | High for campus admins |
| D9 | Campus analytics unbounded interviews | [`college/analytics.ts`](../../src/lib/college/analytics.ts) selected every cohort interview + every V1 report | High for large orgs |
| D10 | Production dashboard TTFB | Speed Insights `/dashboard` TTFB p75 **2721 ms** (n=78, 28d). Login TTFB 115 ms. Completed-list Index Scan is 11.8 ms — extra cost is round-trips + layout auth, not a missing `(user_id, status)` index. Loop 1–5 two-wave loader is **not deployed**. Staging traces (loop 5): warmed `layout.total` ~195–328 ms; fetch header wait median **326 ms**; body continues after headers (streaming). Wave 1–2 run after the shell | High — LCP floor until deploy |
| D11 | Desktop CLS = scrollbar + short spinner | Field CLS p75 0.16 (n=46). Attribution: chrome `footer` (22) and decorative blob (12). Desktop 0.16 / mobile 0.09. Classic scrollbar + `loading.tsx` spinner left the footer in the first viewport | High — field CLS |
| D12 | LCP element is chrome/subtitle | Field LCP attribution: `<main>` 64, header subtitle `<p>` 41. Loop 4 streams that subtitle without the snapshot. Recharts is **after** lab LCP | High — field LCP |
| D13 | Community card hydrates in | [`DashboardCommunityCard.tsx`](../../src/components/community/DashboardCommunityCard.tsx) server snapshot was `false` | Med — in-flow insert |

### Loop 9 — sign-in + admin funnel (confirmed)

| ID | Finding | Evidence | Impact |
|---|---|---|---|
| A1 | Password login serial `users.plan_tier` then `hiring_organizations` | `src/app/(auth)/login/LoginForm.tsx` | Med — adds one RTT after auth when hiring lookup is required |
| A2 | OAuth callback awaited `persistUserAttributionOnce` before redirect | [`auth/callback/route.ts`](../../src/app/auth/callback/route.ts) | High — attribution latency on every Google sign-in |
| A3 | Funnel D7 return-visit N+1 on `user_activity` | [`funnel-metrics.ts`](../../src/lib/admin/funnel-metrics.ts) `countCohortReturnVisit` | High — staging 90d: **17 queries / median 7455 ms** → **1 query / median 424 ms** (n=5, parity returned=1) |
| A4 | Funnel helpers re-fetched the signup cohort repeatedly | Same file | Med — redundant PostgREST round-trips |
| A5 | Growth D1/D7/D30 retention N+1 activity (+ interview fallback) | [`growth-metrics.ts`](../../src/lib/admin/growth-metrics.ts) | High — up to ~2N queries per window on `/platform/growth` |
| A6 | Report-viewed did exact count then re-downloaded rows | `countCohortReportViewed` | Med — double read for distinct users |
| A7 | Admin in-memory cache had no single-flight | [`cache.ts`](../../src/lib/admin/cache.ts) | Med — cold stampede when Growth fires 4 APIs |

Production read-only (ref `plfuvgkycmxcyshrgpgv`): cohort 90d = **146** users; set-based D7 return-visit EXPLAIN execution **~6.6 ms**; aggregate returned **9**. No new index justified at current cardinality (`users.created_at` still seq-scan on 221 rows).

### Confirmed non-dashboard SQL (do not “fix” as dashboard)

| Pattern | Call site | Notes |
|---|---|---|
| `product_events` INSERT mean 142 ms | [`product-events-store.ts`](../../src/lib/analytics/product-events-store.ts) / page-view beacons | Unique indexes + volume. Client-side after paint — not dashboard TTFB |
| PostgREST `set_config` | Every Data API call | Session/RLS setup. Reduced by fewer queries, not by deleting `set_config` |
| Admin `product_events` SELECTs | Founder funnel / interview review | Correlate timestamps before changing |

### N+1 / loop findings (not all patched in this change set)

Patched in loop 1: campus deadlines (D8).

Patched in loop 2:

| ID | File / function | Before | After | Genuine N+1? | Strategy | Tests |
|---|---|---|---|---|---|---|
| C1 | [`weekly-digest.ts`](../../src/lib/email/weekly-digest.ts) `runWeeklyDigest` / [`weekly-digest-data.ts`](../../src/lib/email/weekly-digest-data.ts) `prefetchWeeklyDigestBundle` | 1 all-users scan + ~7–12 queries per subscribed user (worst `1 + 12U`) | Lookback interviews once, then chunked users/progress/reports/V1 hops (`estimateWeeklyDigestQueryCount`) | Yes — per-user interviews + reports + 3-hop V1 | Prefetch window, in-memory windows/scores, sequential send + existing lifecycle idempotency | `weekly-digest-data.test.ts`, `weekly-digest.test.ts` |
| C2 | [`process-interview-recovery-reminders.ts`](../../src/lib/interview/process-interview-recovery-reminders.ts) | 1 interviews scan + 1 `lifecycle_email_log` lookup per in-window row | 1 interviews scan + chunked `.in(idempotency_key)` (100) | Yes — bounded by fetchLimit 200, but still per-row | `prefetchSentLifecycleKeys`; failed rows stay excluded (`status=sent` only) | `log-prefetch.test.ts`, recovery reminder tests |

Loop 3 recheck: weekly digest still uses the 30-day eligibility / 7-day stats windows, batches reports + V1 question/answer/evaluation hops, and sends sequentially with `weekly:` idempotency keys. Recovery still prefetches `status=sent` keys in chunks of 100; dry-run never calls send or the log prefetch. Failed rows remain eligible because failed is not `status=sent`.

Left documented (not rewritten):

- [`question-plan/persist.ts`](../../src/lib/interview/question-plan/persist.ts) `markQuestionPlanRows` — sequential CAS (`plan_status = planned`). Typical N is 5–8. A bulk update would drop the compare-and-swap. Covered by `persist-cas.test.ts`.
- [`campus-organizations/route.ts`](../../src/app/api/platform/campus-organizations/route.ts) — parallel exact counts per org on a page of rows. Admin-only, already `Promise.all`.
- [`notifications.ts`](../../src/lib/candidate/notifications.ts) — in-memory loop over at most two report refs. Not N+1.

Loop 3 also clamped overshot `/history?page=` onto the last page (exact tab counts unchanged) and moved Recharts off the dashboard RSC graph via [`ScoreTrendChartSlot.tsx`](../../src/components/dashboard/ScoreTrendChartSlot.tsx) (`ssr: false` is illegal in the Server Component `DashboardMain`).

Loop 4 patched D11–D13 in application chrome (scrollbar gutter, tall skeletons, community SSR snapshot, 128px chart slot) and streamed the dashboard header (D12). Loop 5 traced the staging TTFB path: remaining floor is layout `auth.getUser` (~55–70 ms warmed) plus `user_progress` / `users` chrome (~140–270 ms), not a third snapshot wave and not a missing interviews index. No extra backend fold was added. D10 remains a **deploy** problem: production still serves the pre-fold waterfall. `markQuestionPlanRows` stays sequential CAS.

### Indexes

Already present and relevant:

- `idx_interviews_user_status`
- `idx_interviews_user_started_at`
- `idx_script_interview_reports_user`
- `script_interview_reports_interview_id_key`
- `idx_session_quality_user_completed`
- `idx_resumes_user_active`

Added in migration 116 (applied on staging `iiowrzfwemaxytbykjrg`; production pending authorization):

- `idx_interviews_user_engine_status_started` — recovery `user_id + engine + status + started_at DESC LIMIT 1`
- Covering indexes for the 11 advisor FKs (conditional on table existence)

Unused indexes: **kept**. Advisor unused ≠ safe to drop.

### RLS

Five init-plan findings rewritten in migration 116. Predicates stay `auth.uid() = user_id` / `auth.role() = 'service_role'`, wrapped as `(SELECT auth.*())`.

Multiple permissive policies on `interviews` SELECT are **not** removed — campus-admin org read is required. That extra OR is a residual cost on every candidate list query.

## Architecture / Rules

- Reuse request-scoped `React.cache` clients; never cache user data across requests.
- Lifetime counts use `count: 'exact'` + `head: true`, never `page.length`.
- `.in()` lists are chunked at 100.

## Dependencies

Application loaders under `src/lib/dashboard/` · migration `116_dashboard_perf_indexes_and_rls_initplan.sql`

## Failure Modes

Bounding report windows without a separate lifetime count would under-count the Completed tile / upgrade “interviews completed” stat.

## Verification

`npx vitest run src/lib/dashboard src/lib/candidate/completed-interviews.test.ts src/lib/college/deadline-progress.test.ts src/lib/email/weekly-digest-data.test.ts src/lib/email/weekly-digest.test.ts src/lib/email/lifecycle/log-prefetch.test.ts src/lib/interview/process-interview-recovery-reminders.test.ts src/lib/interview/question-plan/persist-cas.test.ts src/lib/seo/content/nav-links.test.ts`

## Change Triggers

New dashboard fetch · new list page · new RLS policy

## Related Documents

[BASELINE](BASELINE.md) · [QUERY-PLANS](QUERY-PLANS.md) · [OPTIMIZATION-RESULTS](OPTIMIZATION-RESULTS.md) · [RELEASE-READINESS](RELEASE-READINESS.md) (Loop 6 operator gate)
