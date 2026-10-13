# Dashboard performance release readiness

> Status: CANONICAL
> Last Verified: 2026-10-13
> Verification Scope: Loop 7 complete execution — merge, production 116→117, production deploy READY; authenticated smoke + new-SHA field metrics PENDING
> Authority: Operator release packet with Loop 7 evidence

## Purpose

Separate application ship, database migrations, production verification, and rollback. Production field TTFB/LCP/CLS from the **old SHA** must never be attributed to this release until a comparable **post-deploy** field window exists.

## Current State (post Loop 7)

| Item | Value |
|---|---|
| Release branch | `perf/fullstack-performance-audit` @ `f854191418a878483e87ffaedb85eabfdb5630f2` |
| Pre-release `main` | `1de95c19b6732afb2cf8b6d133f7622624ae726a` |
| PR | https://github.com/rakesh2604/InterviewEra/pull/166 — **MERGED** (squash) |
| Merge commit / production SHA | `9c28886a8c704d92095e7417836ed4856590bc0a` |
| Merge time (UTC) | `2026-10-13T09:35:28Z` |
| Production deploy | **READY** `dpl_DpA4pFK5VF8yXdPL15tZTEeGVJ4u` — aliases `interviewera.com`, `www.interviewera.com` |
| Deploy created (UTC) | `2026-10-13T09:35:31.374Z` |
| Staging DB | 116 + 117 (earlier loops) |
| Production DB | **116 then 117 applied** (ledger verified) |
| `PERF_DASHBOARD_TRACE` | **unset** in Vercel Production env list (not present) |
| `ANALYZE` | **unset** in Vercel Production env list (not present) |
| Old field baseline | TTFB 2721 ms (n=78), LCP 5624 ms (n=137), CLS 0.16 (n=46), INP 168 ms — **old SHA only** |
| New-SHA field window | **PENDING** — post-deploy query returned empty (n=0) |

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
| Unauthenticated `/dashboard` | **PASS** | Redirects to `/login?next=%2Fdashboard` (browser + `curl -L`) |
| Login page live | **PASS** | `https://interviewera.com/login` title “InterviewEra \| Login”, Google + email sign-in present |
| Signed-in `/dashboard` | **BLOCKED** | No authorized production test credentials in this session; must not use `.env.local` |
| Signed-in `/history` pagination / overshoot | **BLOCKED** | Same credential blocker |
| Signed-in `/analytics`, `/settings` | **BLOCKED** | Same credential blocker |
| Runtime logs: no `[perf:dashboard]` | **PENDING** | Requires owner log access after authenticated traffic; TRACE confirmed unset so logs should stay absent |
| Unauthorized remains unauthorized | **PASS** | Auth gate observed for `/dashboard` |

**Owner action to complete smoke:** sign in with a dedicated authorized test account on `https://interviewera.com`, walk `/dashboard` → `/history` (incl. `?page=` overshoot) → `/analytics` → `/settings`, confirm chart slot + counts, and confirm no `[perf:dashboard]` in production logs.

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

### New-SHA window (Loop 7)

| Item | Value |
|---|---|
| Deploy SHA | `9c28886a8c704d92095e7417836ed4856590bc0a` |
| Window start (UTC) | `2026-10-13T09:35:28Z` (merge) / deploy `09:35:31Z` |
| Query | `vercel metrics vercel.speed_insights.ttfb_ms` / `lcp_ms` `-a p75 -a count --prod --group-by route --group-by deviceType --since 2026-10-13T09:35:28Z` |
| Result | **empty** (`summary: []`, `data: []`) — **n = 0** |
| Status | **PENDING** — wait until TTFB n≥78, LCP n≥137, CLS n≥46 in a **post-deploy-only** window |
| Follow-up | Re-run metrics daily; compare post-deploy slice vs equal-length pre-deploy slice. Rolling 28d still mixes old SHA. |

Correct CLI metric ids (verified 2026-10-13): `vercel.speed_insights.ttfb_ms`, `lcp_ms`, `cls`, `inp_ms` (not bare `ttfb` / `lcp`).

```bash
vercel metrics vercel.speed_insights.ttfb_ms -a p75 -a count --prod --group-by route --group-by deviceType --since 2026-10-13T09:35:28Z --project interview-era
vercel metrics vercel.speed_insights.lcp_ms -a p75 -a count --prod --group-by route --group-by deviceType --since 2026-10-13T09:35:28Z --project interview-era
vercel metrics vercel.speed_insights.cls -a p75 -a count --prod --group-by route --group-by deviceType --since 2026-10-13T09:35:28Z --project interview-era
```

**Do not** claim field improvement yet. **Do not** compare staging lab TTFB or Lighthouse mobile LCP 7,924 ms to production p75.

## D. Rollback

| Layer | Action |
|---|---|
| Application | Vercel instant rollback from `dpl_DpA4pFK5VF8yXdPL15tZTEeGVJ4u` to prior production deployment, or `git revert` of squash `9c28886`. |
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
| Post-release field metrics | **PENDING** | Post-deploy n=0; old-SHA baseline retained separately |

## Remaining blockers / owner actions

1. Complete authenticated production smoke with a dedicated test account (do not use agent access to `.env.local`).
2. Collect post-deploy Speed Insights until comparable n; then compare to old-SHA baseline without mixing windows.
3. Keep `PERF_DASHBOARD_TRACE` and `ANALYZE` unset in Production.
4. Mobile Lighthouse LCP 7,924 ms — investigate with production-equivalent trace only; no speculative refactor.

## Related Documents

[BASELINE](BASELINE.md) · [AUDIT-FINDINGS](AUDIT-FINDINGS.md) · [QUERY-PLANS](QUERY-PLANS.md) · [OPTIMIZATION-RESULTS](OPTIMIZATION-RESULTS.md) · [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md) · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) · [RELEASE](../Operations/RELEASE.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md)
