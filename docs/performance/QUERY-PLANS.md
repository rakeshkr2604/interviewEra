# Query plans

> Status: CANONICAL
> Last Verified: 2026-10-13
> Verification Scope: Staging dummy-UUID EXPLAIN + production representative EXPLAIN ANALYZE + loop 5 production ledger/schema recheck (116/117 still unapplied)
> Authority: Plans that were actually captured — gaps are marked

## Purpose

Before/after plans for dashboard-relevant SQL. Privileged EXPLAIN bypasses RLS, so these plans describe index choice, not per-user policy cost.

## Current State

### Staging — completed interview ids

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id FROM public.interviews
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND status = 'completed';
```

| Field | Value |
|---|---|
| Environment | Staging `iiowrzfwemaxytbykjrg` |
| Node | Seq Scan on `interviews` |
| Filter | `user_id` + `status = completed` |
| Actual rows | 0 (dummy uuid) |
| Rows removed | 10 (entire staging table) |
| Planning time | 12.7 ms |
| Execution time | 1.3 ms |
| Shared hits | 1 |

**Limitation:** ~10-row table. Planner prefers seq scan. This does **not** prove production will seq-scan.

### Staging — recovery active

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id, role, status, engine, started_at, credit_deducted, abandoned_resume_used
FROM public.interviews
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND engine = 'v2.1'
  AND status IN ('pending', 'in_progress')
ORDER BY started_at DESC
LIMIT 1;
```

| Field | Value |
|---|---|
| Node | Limit → Sort → Seq Scan |
| Sort | `started_at DESC`, quicksort, 25 kB |
| Execution time | 0.12 ms |
| Planning time | 1.4 ms |

**After staging apply of 116 (same dummy UUID, 2026-10-13):** still Limit → Sort → Seq Scan, execution 0.15 ms. The new index `idx_interviews_user_engine_status_started` exists, but the ~10-row table does not justify an index scan. Intended production plan once the table is large: index scan on that composite.

### Production — representative read plans (2026-10-13, loop 2)

Volume: 469 interviews (304 abandoned, 165 completed), 221 users, 83 script reports. Busiest user has 234 interviews (106 completed). Dummy-UUID staging plans are **not** used as production evidence.

Completed list (`user_id` + `status = completed` `ORDER BY completed_at DESC LIMIT 20`):

| Field | Value |
|---|---|
| Node | Limit → Sort (top-N heapsort) → **Index Scan** `idx_interviews_user_status` |
| Index cond | `user_id` + `status = completed` |
| Plan rows vs actual | 1 estimated, **106** scanned, 20 returned |
| Shared hits / reads | 137 / 0 |
| Planning / execution | 1.15 ms / **11.78 ms** |

Exact completed count (same user):

| Field | Value |
|---|---|
| Node | Aggregate → **Index Only Scan** `idx_interviews_user_status` |
| Actual rows | 106 |
| Shared hits / reads | 114 / 0 |
| Planning / execution | 2.41 ms / **0.52 ms** |

`idx_interviews_user_status` already matches the dashboard filter. Exact-count cost is sub-millisecond here; TTFB is still round-trips + RLS, not this index. Migration 116's new composite is for recovery `(user_id, engine, status, started_at)`, not this list.

Read-only `pg_indexes` confirmed:

- Production has `idx_interviews_user_status`. It does **not** yet have `idx_interviews_user_engine_status_started` or the 116 FK covering indexes.
- Staging has those 116 indexes except `idx_app_error_events_user_id` (table absent).

### After-change application plans (query count, not Postgres)

| Loader | Before | After |
|---|---|---|
| `loadCandidateSnapshot()` no prefetch | user, progress, interviews, resumes, enrollment, recovery, completedCount, scriptReports, campusOrg | unchanged when called alone |
| Dashboard prefetch bag | those 9 plus a second script-report query from the page | **0** snapshot DB reads (`listSnapshotDbReads` lock) |
| History | unbounded interviews + unbounded `.in()` reports | 3 head counts + 1 page (≤20) + chunked report `.in()` |
| Analytics completed ids | all completed ids | last 20 by `completed_at` |
| Upgrade completed count | `array.length` of all ids | exact head count + last 20 ids |

Reproduce:

```bash
npx tsx scripts/perf/dashboard-query-benchmark.ts
```

Loop 5 also prints `describeDashboardRequestPlan()`: layout units are TTFB-blocking; wave 1/2 are the Suspense loader; snapshot after prefetch is `[]`. Live wall-clock is in [OPTIMIZATION-RESULTS](OPTIMIZATION-RESULTS.md), not this file.

## Architecture / Rules

- Only `EXPLAIN (ANALYZE, BUFFERS)` on read-only SELECTs.
- Dummy UUIDs are allowed; do not dump real user ids into docs.
- A plan without the original filters/joins does not prove a win.

### Production rollout checklist (116 then 117)

Do **not** apply without explicit founder authorization.

1. **Precheck production** `plfuvgkycmxcyshrgpgv` (reconfirmed 2026-10-13 loop 5): ledger still has **no** rows named `dashboard_perf_indexes_and_rls_initplan` / `interview_turns_rls_initplan`. Highest names remain `114_signup_consent_records` and `script_turns_answered_at`. Live schema: 116 indexes **absent**; feedback/diagnostic policies still **bare** `auth.uid()` / `auth.role()`. Advisor still **5** `auth_rls_initplan` + **11** unindexed FKs + **75** unused + **49** multiple_permissive. `interview_turns` SELECT already uses `(SELECT auth.uid())` — 117 still needed for ledger, not for a missing wrap. Do not apply in this loop.
2. **Precheck staging** `iiowrzfwemaxytbykjrg` (reconfirmed loop 5): ledger rows exist by **name** under timestamp versions `20261013061140` / `20261013061647`. Advisor: `auth_rls_initplan=0`, `unindexed_foreign_keys=0`, unused_index **120**, multiple_permissive **45**. Do not drop unused indexes.
3. **Apply order:** `116_dashboard_perf_indexes_and_rls_initplan.sql`, then `117_interview_turns_rls_initplan.sql`. 117's SQL matches the current production policy text; applying it is an authorization-preserving `ALTER POLICY` plus a ledger row.
4. **Locking:** `CREATE INDEX IF NOT EXISTS` takes SHARE (not CONCURRENTLY — migrations are transactional). Tables are small relative to `interviews`.
5. **Postcheck:** ledger rows by **name**; `pg_indexes` for the 116 names; advisor `auth_rls_initplan=0` and `unindexed_foreign_keys=0`; EXPLAIN the recovery LIMIT 1 and completed-count queries on a real user. Do not drop unused indexes.
6. **Rollback:** restore the five policies to bare `auth.*()` (not recommended) and `DROP INDEX IF EXISTS` for each added `idx_*`. Do not rewrite 116/117; add a follow-on serial file.

## Dependencies

Migration 116 applied on staging. Production apply still unauthorized.

## Failure Modes

Treating staging seq scans as production truth.

## Verification

Re-run the two EXPLAIN statements on staging after 116 applies, preferably against a seeded user with >1k interviews if available.

## Change Triggers

New index · new dashboard SQL

## Related Documents

[BASELINE](BASELINE.md) · [AUDIT-FINDINGS](AUDIT-FINDINGS.md)
