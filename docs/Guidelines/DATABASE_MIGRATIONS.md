# Database Migrations

> Status: CANONICAL
> Last Verified: 2026-10-04
> Verification Scope: Serial naming, staging-first apply, ledger/schema audit, drift recovery
> Authority: How to add and apply SQL safely

## Purpose

Serial migration discipline, apply order, environment verification, and known historical remap facts.

## Current State

- Filenames: **`NNN_snake_case.sql`** only — three-or-more-digit zero-padded serial (e.g. `109_…`, `112_…`, `113_…`)
- Next unused version: run `npm run verify:migrations` — it prints `Next file must be NNN_name.sql` from the highest existing serial file in `supabase/migrations/`
- **Forbidden:** 14-digit timestamps; `supabase migration new` (creates timestamp names incompatible with this repo)
- **Never rewrite** an existing migration — add a follow-on serial file
- **Never reuse or renumber** a version that already exists in the repo or any shared environment ledger
- Enforce: `npm run verify:migrations` + `.cursor/rules/supabase-migrations.mdc`

Historical note: some remote ledgers also contain **timestamp versions** applied by dashboard/MCP before serial discipline was strict. Treat those as historical apply records. New repo files must still be serial-only. Do not invent new timestamp filenames.

### Lessons

| Lesson | Rule |
|---|---|
| 033 | RLS without GRANT → silent 42501 — always pair |
| 050 | Lock down credit RPCs + users UPDATE guard |
| 039–045 | Historical unused numbers |
| 056–058 | Fresh-replay no-ops; effects via `089_reconcile_historical_migration_order.sql` |
| 090/092 | `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` was staging-applied via `090`; production intentionally skipped those defaults (`092`). Do not replay `090` defaults on production. |
| 2026-10-03 | Staging Phase 6A: `postgres` → `public` default table/sequence grants to `anon`/`authenticated`/`service_role` revoked. Future objects created by `postgres` need explicit GRANTs. See [`STAGING_PROD_ALIGNMENT_CLOSURE.md`](../Operations/STAGING_PROD_ALIGNMENT_CLOSURE.md). |
| 2026-10-04 | Remote ledgers may list a migration under a **timestamp version** while the repo file is serial (e.g. `112_resumes_bucket_…` vs `20261004064336`). Match by **migration name / intended schema effect**, not version string alone. |

Timestamp→serial remap table (072+) lives in archive: `docs/archive/pre-governance-2026-09-27/MIGRATION_NAMESPACE.md` — consult when debugging old apply history. Do not recreate timestamps.

## Mandatory apply procedure

### 1. Identify next serial (repo)

```bash
npm run verify:migrations
# Example output: highest version 112. Next file must be 113_name.sql.
```

If a higher serial already exists in the repo, use that next integer — never force `113` when the audit shows a higher max.

### 2. Audit repo vs staging vs production ledgers

Before applying anything:

1. Confirm **project identity** (name + ref) for staging and production independently — do not trust env var names alone.
2. Query `supabase_migrations.schema_migrations` (or equivalent list API) in **both** environments.
3. Compare each repo file `NNN_name.sql` to ledger rows by:
   - exact serial `version = NNN`, **or**
   - matching migration `name` under a historical timestamp version
4. Probe **actual schema** for the intended objects (tables, columns, RLS, storage, functions) — ledger presence alone is insufficient; CLI exit codes alone are insufficient.
5. Classify each file: applied (serial), applied (timestamp alias), pending (missing ledger **and** missing schema), or **ledger drift** (schema present, ledger missing / mismatched).

### 3. Staging first

- Apply only migrations that are genuinely pending on staging.
- Inspect full SQL for destructive ops, locks, RLS/storage changes, and data rewrites.
- Apply in ascending serial order; never skip a dependency.
- After each apply (or batch): re-query ledger **and** verify schema effects.
- Run targeted smoke checks. Do not proceed to production on failure or unexpected schema.

### 4. Production second

Production may receive only migrations that:

1. Are present in the repo,
2. Passed staging verification (ledger + schema),
3. Are still pending on production after a fresh ledger re-query,
4. Have explicit founder/operator authorization for that production project.

Reconfirm production project ref immediately before apply. Stop if the pending list differs from the reviewed plan.

### 5. Post-apply evidence (required in reports)

For each environment, record:

- Project name + ref (no secrets)
- Versions/names applied
- Ledger query results for those versions
- Schema probes proving intended effects
- Smoke/health checks run
- Explicit **NOT RUN** items (e.g. authenticated candidate UX)

**Never claim migration success from a CLI/MCP exit code alone.**

## Drift and recovery

| Situation | Action |
|---|---|
| Repo file missing from ledger **and** schema missing | Pending — apply staging → verify → production |
| Schema effects fully present; ledger missing / timestamp-only | **Ledger drift** — do **not** invent INSERT-only ledger rows without an approved reconcile procedure; do **not** re-run non-idempotent SQL; document drift and add a follow-on reconcile migration only when reviewed |
| Ledger present; schema incomplete | Partial failure — stop; diagnose; forward-fix with a new serial; never rewrite the old file |
| Ledger row with no matching repo file | Investigate; do not delete remote history casually |
| Partial apply / mid-transaction failure | Stop dependent stages; do not blindly retry until effects are understood |

No migration rollback — **forward-fix only**. Destructive DDL needs founder sign-off.

## Architecture / Rules

- New privileged `users` columns → update `guard_users_privileged_update` consciously (Invariant #3)
- Credit / ledger changes → service-role only (Invariant #2)
- Prefer `IF NOT EXISTS` / idempotent grants where safe; still never edit applied files
- Application-only features (no schema change) must **not** invent dummy SQL migrations

## Dependencies

`supabase/migrations/` · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) · [SECURITY](SECURITY.md) · [AGENTS.md](../../AGENTS.md)

## Failure Modes

Editing old SQL on prod-applied DBs · timestamp filenames · DROP without founder sign-off · applying production before staging verification · trusting ledger without schema probe · silent ledger INSERT to “make green”

## Verification

| Check | Command / method |
|---|---|
| Namespace | `npm run verify:migrations` |
| Staging ledger + schema | SQL/API against staging project ref |
| Production ledger + schema | SQL/API against production project ref |
| Docs links | `npm run verify:docs` when docs change |

## Change Triggers

Any new `supabase/migrations/*.sql` · any staging/production apply · any migration governance doc edit

## Related Documents

[AGENTS.md](../../AGENTS.md) · archive MIGRATION_NAMESPACE for full remap table · `.cursor/rules/supabase-migrations.mdc`
