# Dashboard performance release readiness

> Status: CANONICAL
> Last Verified: 2026-10-13
> Verification Scope: Loop 8 production verification — release state + migrations reconfirmed; authenticated smoke still BLOCKED; dashboard field samples still PENDING
> Authority: Operator release packet with Loop 7–8 evidence

## Purpose

Separate application ship, database migrations, production verification, and rollback. Production field TTFB/LCP/CLS from the **old SHA** must never be attributed to this release until a comparable **post-deploy** field window exists.

## Current State (Loop 8 reconfirm — `2026-10-13T10:04:57Z`)

| Item | Value |
|---|---|
| App release SHA | `9c28886a8c704d92095e7417836ed4856590bc0a` (PR [#166](https://github.com/rakesh2604/InterviewEra/pull/166), merge `2026-10-13T09:35:28Z`) |
| App release deploy | `dpl_DpA4pFK5VF8yXdPL15tZTEeGVJ4u` READY @ `2026-10-13T09:35:31.374Z` |
| Current production tip | `6bb5b97bcfba8299793154a1216f9a7fdfdd9248` — **docs-only** (#168) on top of `9c28886`; no `src/` delta |
| Current production deploy | `dpl_6Bz4JFHufNnPaHnEbKYVHhYxDRJG` READY @ `2026-10-13T09:58:25.737Z` — aliases `interviewera.com`, `www.interviewera.com` |
| Production DB | Ledger **116 then 117**: `20261013093634` / `dashboard_perf_indexes_and_rls_initplan` → `20261013094210` / `interview_turns_rls_initplan` |
| `PERF_DASHBOARD_TRACE` | **unset** (absent from Production env list — Loop 8 recheck) |
| `ANALYZE` | **unset** (absent from Production env list — Loop 8 recheck) |
| Old field baseline | TTFB 2721 ms (n=78), LCP 5624 ms (n=137), CLS 0.16 (n=46), INP 168 ms — **old SHA only** |
| New-SHA `/dashboard` field | **PENDING** — `/dashboard` rows still **n = 0** in post-release window |

`PERF_DASHBOARD_TRACE` defaults to **off** (`=== '1'` only). Do not enable it on Vercel Production.

`ANALYZE` / `ANALYZE_OPEN` are build-time only. Production runtime does not open the bundle analyzer.

## Compatibility and rollout order

Read with [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) and [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md).

The application does **not** require 116/117 to boot. Migrations are additive InitPlan wraps + `CREATE INDEX IF NOT EXISTS`. **117 before 116 is forbidden.**

Loop 7 executed: **merge → 116 → verify → 117 → verify → confirm production deploy** (Vercel Git integration auto-deployed on merge).

## A. Application changes

Two-wave `loadDashboardPageData`, snapshot prefetch, history pagination, digest/recovery batching, nav-links split, `ScoreTrendChartSlot`, CLS gutter/skeletons/community SSR, streamed header, gated `PERF_DASHBOARD_TRACE`.

### Authenticated smoke (after app deploy)

| Route / check | Status | Evidence |
|---|---|---|
| Unauthenticated `/dashboard` | **PASS** | Loop 8: browser + `curl` → `/login?next=%2Fdashboard` (307) |
| Login page live | **PASS** | `https://interviewera.com/login` renders sign-in |
| Signed-in `/dashboard` | **BLOCKED** | No owner-authorized production test account in this session; must not use `.env.local` |
| Signed-in `/history` pagination / overshoot | **BLOCKED** | Same credential blocker |
| Signed-in `/analytics`, `/settings` | **BLOCKED** | Same credential blocker |
| Runtime logs: no `[perf:dashboard]` | **PASS*** | See Loop 8 log check below |
| Unauthorized remains unauthorized | **PASS** | Auth gate reconfirmed Loop 8 |

\*Log check used Vercel CLI request logs (not a full Observability function-stdout dump). MCP `get_runtime_logs` returned **403**. Supporting: `PERF_DASHBOARD_TRACE` unset.

**Owner action to complete smoke:** sign in with a dedicated authorized test account on `https://interviewera.com`, walk `/dashboard` → `/history` (incl. `?page=` overshoot) → `/analytics` → `/settings`, confirm chart slot + counts.

## B. Database migrations (production `plfuvgkycmxcyshrgpgv`)

Identity confirmed: project ref `plfuvgkycmxcyshrgpgv`, name `rakesh.jp2604@gmail.com's Project`, region `ap-south-1`, status `ACTIVE_HEALTHY`.

| Step | Status | Evidence |
|---|---|---|
| Precheck ledger lacked 116/117 names | **PASS** | Latest pre-apply: `script_turns_answered_at` (`20261010062829`) |
| Precheck policies bare `auth.uid()`/`auth.role()` on feedback/diagnostic | **PASS** | Probed before apply |
| Precheck `interview_turns` already InitPlan | **PASS** | Live policy already `(SELECT auth.uid())` |
| Apply **116** `dashboard_perf_indexes_and_rls_initplan` | **PASS** | MCP `apply_migration` success |
| Ledger 116 | **PASS** | `version=20261013093634`, `name=dashboard_perf_indexes_and_rls_initplan` |
| Indexes 116 (12) | **PASS** | All expected `idx_*` present including `idx_interviews_user_engine_status_started` |
| Policies 116 InitPlan | **PASS** | feedback ×4 + diagnostic service-role wrapped |
| Apply **117** `interview_turns_rls_initplan` (only after 116 verified) | **PASS** | MCP `apply_migration` success |
| Ledger 117 | **PASS** | `version=20261013094210`, `name=interview_turns_rls_initplan` |
| Policy 117 | **PASS** | `Users can view own interview turns` still InitPlan |
| Advisor post-apply | **PASS** | `auth_rls_initplan` and `unindexed_foreign_keys` absent from performance advisor; residuals: unused_index (INFO) + multiple_permissive_policies (WARN). **Do not drop unused indexes.** |
| Unused index drops | **PASS** | None performed |

Staging ref `iiowrzfwemaxytbykjrg` already had both migrations from earlier loops.

## C. Post-deployment field measurement

### Old-SHA baseline (do not attribute to this release)

Window: ~28d ending 2026-10-13, **old deployed code** (pre-`9c28886`):

| Metric | n | p75 | Label |
|---|---:|---:|---|
| `/dashboard` TTFB | 78 | 2721 ms | old deployed code |
| `/dashboard` LCP | 137 | 5624 ms | old deployed code |
| `/dashboard` CLS | 46 | 0.16 | old deployed code |
| `/dashboard` INP | (prior report) | 168 ms | old deployed code |

### New-SHA window (Loop 7 + Loop 8)

| Item | Value |
|---|---|
| Window start (UTC) | `2026-10-13T09:35:28Z` (release merge) |
| Query time (Loop 8) | ~`2026-10-13T10:05Z`–`10:09Z` |
| CLI note | Pass **`-a p75` and `-a count` as separate invocations** — combining both returns only `count` on CLI 63.1.2 |
| `/dashboard` TTFB / LCP / CLS / INP | **no rows** — n = **0** for all four |
| Non-dashboard samples in window (not release proof) | `/login` desktop TTFB p75 **197** (n=1), LCP p75 **440** (n=1); `/tools/question-generator` desktop TTFB p75 **5** (n=1), LCP p75 **5644** (n=1), CLS p75 **0.054** (n=1), INP p75 **8** (n=1) |
| Thresholds | TTFB n≥78, LCP n≥137, CLS n≥46 — **not met** for `/dashboard` |
| Comparison | **PENDING** — do not declare success/regression vs old-SHA 2721 / 5624 / 0.16. Rolling 28d still mixes SHAs. Tip deploy `6bb5b97` is docs-only; field still attributed to post-`9c28886` app code |

```bash
vercel metrics vercel.speed_insights.ttfb_ms -a p75 --prod --group-by route --group-by deviceType --since 2026-10-13T09:35:28Z --project interview-era
vercel metrics vercel.speed_insights.ttfb_ms -a count --prod --group-by route --group-by deviceType --since 2026-10-13T09:35:28Z --project interview-era
# likewise lcp_ms / cls / inp_ms
```

**Do not** claim field improvement yet. **Do not** compare staging lab TTFB or Lighthouse mobile LCP 7,924 ms to production p75.

### Loop 8 verification evidence

| Check | Status | Evidence |
|---|---|---|
| Release / aliases | **PASS** | Current prod `dpl_6Bz4JFHufNnPaHnEbKYVHhYxDRJG` aliases `interviewera.com` + `www`; app code = `9c28886` + docs-only `6bb5b97` |
| Migrations 116→117 | **PASS** | Ledger order reconfirmed on `plfuvgkycmxcyshrgpgv` |
| TRACE / ANALYZE unset | **PASS** | Absent from `vercel env ls --project interview-era` Production keys |
| Auth smoke (signed-in) | **BLOCKED** | No authorized production test credentials provided to agent |
| `[perf:dashboard]` logs | **PASS** (sampled) | Source: `vercel logs --project interview-era --environment production --since 2h --limit 100 --json` grepped for `perf:dashboard` / `[perf:dashboard]` → **0 hits** (100 lines). MCP runtime logs API **403**. Interval ~`2026-10-13T08:09Z`–`10:09Z` relative lookback |
| Field `/dashboard` samples | **PENDING** | n=0 vs thresholds |
| Mobile LCP waterfall | **NOT WARRANTED** | No production-equivalent mobile waterfall available; lab 7,924 ms remains unresolved risk only |

## D. Rollback

| Layer | Action |
|---|---|
| Application | Vercel instant rollback from current prod (`dpl_6Bz4JFHufNnPaHnEbKYVHhYxDRJG` / prior `dpl_DpA4pFK5VF8yXdPL15tZTEeGVJ4u`) to the pre-release production deployment, or `git revert` of squash `9c28886` (and docs tip if needed). |
| 116 indexes | Follow-on serial `DROP INDEX IF EXISTS` for each added `idx_*`. Do not rewrite 116. |
| 116/117 policies | Follow-on serial only if a policy error appears. InitPlan is authorization-preserving. |
| Field | Record revert time so the next p75 window is not mixed silently. |

## Remaining lab / field risks

- **Mobile Slow-4G Lighthouse `/dashboard` LCP 7,924 ms** (n=1). Unresolved lab risk — inspect production-equivalent waterfall before more code changes.
- Field CLS 0.16 (n=46) is **old-SHA** baseline.
- Authenticated production smoke still needs an authorized test account (owner).
- New-SHA Speed Insights sample not yet large enough.

## Loop 6 / Loop 7 pre-merge verification (historical)

| Check | Result |
|---|---|
| `lint` / `typecheck` / `test` | PASS / PASS / **361 files, 2598 tests** |
| `verify:migrations` / `verify:docs` | PASS / PASS (highest serial 117) |
| `build` / analyze | PASS / PASS (`ANALYZE=true` + 8 GB heap, local only) |
| Playwright staging | **6/6 PASS**. Smoke 3 skipped. Lighthouse not re-run |
| Local Playwright (`.env.local`) | **not run** |

### Loop 7 execution evidence

| Step | Status | Evidence |
|---|---|---|
| Commit + push branch | **PASS** | `f854191` on `origin/perf/fullstack-performance-audit` |
| PR → `main` | **PASS** | https://github.com/rakesh2604/InterviewEra/pull/166 |
| CI | **PASS** | Detect changes, Lint & Type Check, Secret Scan, Security Audit, PDF extract, Build, E2E Auth, Merge Readiness Summary, Vercel Preview — all SUCCESS |
| Merge | **PASS** | Squash merge `9c28886` at `2026-10-13T09:35:28Z` (merge commits disallowed by repo) |
| Production migration 116 | **PASS** | Ledger `20261013093634` + indexes + InitPlan policies |
| Production migration 117 | **PASS** | Ledger `20261013094210` after 116 verified |
| Production app deploy | **PASS** | `dpl_DpA4pFK5VF8yXdPL15tZTEeGVJ4u` READY; domains aliased; GitHub Production deployment `7035092414` SUCCESS for `9c28886` |
| Authenticated smoke | **BLOCKED** | Auth gate PASS; signed-in routes need owner test account |
| Post-release field metrics | **PENDING** | Loop 8: `/dashboard` still n=0; non-dashboard n=1 samples only |

## Remaining blockers / owner actions

1. Complete authenticated production smoke with a dedicated test account (do not use agent access to `.env.local`).
2. Re-run Speed Insights daily from `2026-10-13T09:35:28Z` until `/dashboard` TTFB n≥78, LCP n≥137, CLS n≥46; then compare equal-length pre/post windows (not rolling 28d alone).
3. Keep `PERF_DASHBOARD_TRACE` and `ANALYZE` unset in Production.
4. Mobile Lighthouse LCP 7,924 ms — investigate only with a production-equivalent mobile waterfall; no speculative refactor.
5. Optional: grant Observability/runtime-log API access so function stdout can be searched beyond request logs.

## Related Documents

[BASELINE](BASELINE.md) · [AUDIT-FINDINGS](AUDIT-FINDINGS.md) · [QUERY-PLANS](QUERY-PLANS.md) · [OPTIMIZATION-RESULTS](OPTIMIZATION-RESULTS.md) · [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md) · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) · [RELEASE](../Operations/RELEASE.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md)
