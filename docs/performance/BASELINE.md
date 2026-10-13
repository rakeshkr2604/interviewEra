# Performance baseline

> Status: CANONICAL
> Last Verified: 2026-10-13
> Verification Scope: Branch `perf/fullstack-performance-audit` before/during first optimization pass
> Authority: Measured starting point — do not treat later docs as this snapshot

## Purpose

Record the pre-change repository state, automated-check results, production query statistics, and measurement gaps for InterviewEra dashboard slowness.

## Current State

| Field | Value |
|---|---|
| Git commit | `1de95c19b6732afb2cf8b6d133f7622624ae726a` |
| Branch at inspect | `main` (work then moved to `perf/fullstack-performance-audit`) |
| Latest commit subject | `fix(brand): dark-mode lockups without bordered plates (#165)` |
| Working tree at inspect | Clean |
| Production host | `https://interviewera.com` |
| Production Supabase | `plfuvgkycmxcyshrgpgv` (name confirmed in ops docs) |
| Staging Supabase | `iiowrzfwemaxytbykjrg` |

### Automated checks run before code edits

| Check | Result | Notes |
|---|---|---|
| `npm run lint` | PASS | 0 warnings |
| `npm run typecheck` | PASS | `tsc --noEmit` |
| `npm test` | PASS | 346 files / 2544 tests |
| `npm run build` | not run in the pre-edit window | Started after implementation; see OPTIMIZATION-RESULTS |
| Playwright | not run pre-edit | Authenticated `@staging` suite needs storage-state credentials |

### Dashboard request shape (code audit, pre-change)

Fresh `/dashboard` RSC (plus layout) issued roughly **13–16** PostgREST round-trips in **4 sequential waves**:

1. Layout: `auth.getUser`, `users`, `user_progress`, admin/coach checks.
2. Page `Promise.all`: `users` (cached), interviews+nested reports, `user_progress` (cached), completed `count`, recovery (1–2 sequential).
3. Then `buildRetentionDashboardSnapFromRow`: `tier_config`, latest `session_quality_log`, weekly `session_quality_log` count — **serial**, each `createClient()`.
4. Then `script_interview_reports` for 5 recent ids.
5. Then `loadCandidateSnapshot`: new `createClient()`, resumes, enrollment, **second** `script_interview_reports` for completed ids in the 20-row window, optional `campus_organizations`.

Internal client navigation to `/dashboard` repeats the same server render (`force-dynamic`). There is no shared data cache across requests.

### Production `pg_stat_statements` (read-only aggregates, 2026-10-13)

Top cumulative time, truncated SQL only — no user rows:

| calls | total_ms | mean_ms | max_ms | Statement class |
|---|---:|---:|---:|---|
| 136 | 19345 | 142 | 3058 | `product_events` INSERT |
| 14 | 12708 | 908 | 4424 | `pg_available_extensions` (admin) |
| 3818 | 8134 | 2.1 | 301 | PostgREST `set_config` |
| 1040 | 7790 | 7.5 | 443 | PostgREST `set_config` (alt) |
| 72 | 6570 | 91 | 567 | `interviews.id` filtered by `user_id` + `status` |
| 62 | 5693 | 92 | 769 | `product_events` SELECT by `event_name` |
| 72 | 3340 | 46 | 1788 | `interviews` list columns (dashboard/history shape) |
| 72 | 1471 | 20 | 227 | `resumes` dashboard select |
| 99 | 1292 | 13 | 396 | `users` dashboard columns |

`idx_interviews_user_status` and `idx_interviews_user_started_at` already exist on production. The 91 ms mean on the status filter is therefore **RLS + PostgREST + latency**, not a missing `(user_id, status)` index.

### Advisor snapshot (production, 2026-10-13)

- 11 unindexed foreign keys (mostly admin/audit; listed in AUDIT-FINDINGS).
- 5 `auth_rls_initplan` policies (`interview_feedbacks` ×2, `interview_exit_feedbacks` ×2, `interview_diagnostic_events` service-role).
- 75 unused-index flags — **not dropped**. Observation window is short and several unused indexes back unique/constraint/admin paths.
- 49 multiple-permissive-policy notices, including `interviews` SELECT (`interviews_select_own` OR campus-admin org read). That OR is evaluated for every authenticated candidate query.

### Lighthouse / Core Web Vitals

Loop 3 filled the field-export gap via Vercel CLI (`vercel metrics vercel.speed_insights.* -a p75 --prod --group-by route --since 28d`). Loop 4 added `-a count`, `--group-by deviceType`, and `--group-by attributionTarget` (PowerShell `-f route:` filters returned `invalid_request`; combined group-by worked). Loop 5 did **not** replace this baseline: production field p75 still describes undeployed code. Staging TTFB traces and the release checklist live in [OPTIMIZATION-RESULTS](OPTIMIZATION-RESULTS.md) and [RELEASE-READINESS](RELEASE-READINESS.md). Authenticated Lighthouse n=1 exists only in those later files.

### JavaScript / images

Not measured pre-change (no production-build analyze in the baseline window). Existing split: `ScoreTrendChart` is `next/dynamic`. `next.config.ts` already enables AVIF/WebP.

### Test environment / limitations

- Agent OS: Windows 10, PowerShell.
- Advisor EXPLAIN on staging used a dummy UUID against ~10 `interviews` rows → sequential scan. That plan is **not** representative of production.
- Production EXPLAIN as a privileged role bypasses RLS, so it cannot prove per-user policy cost.
- No Query Performance CSV was present in the repository; live `pg_stat_statements` was used instead.
- Five-run median/p75 browser timings: **not collected** (no authenticated session).

## Architecture / Rules

Separate authentication overhead, server render, data fetching, hydration, and client navigation when numbers exist. This file records the starting code + DB evidence only.

## Dependencies

[AUDIT-FINDINGS](AUDIT-FINDINGS.md) · [QUERY-PLANS](QUERY-PLANS.md) · [OPTIMIZATION-RESULTS](OPTIMIZATION-RESULTS.md)

## Failure Modes

Claiming CWV targets from this baseline would be fabrication.

## Verification

Re-query `pg_stat_statements` and Performance Advisor after migration 116 is applied to staging.

## Change Triggers

New dashboard loader · new indexes · new Lighthouse run

## Related Documents

[PERFORMANCE](../Guidelines/PERFORMANCE.md) · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md)
