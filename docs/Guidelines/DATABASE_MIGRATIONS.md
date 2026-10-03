# Database Migrations

> Status: CANONICAL
> Last Verified: 2026-10-03
> Verification Scope: Namespace rules + remap notes + staging default-privilege cleanup (Phase 6A)
> Authority: How to add SQL safely

## Purpose

Serial migration discipline and known historical remap facts.

## Current State

- Filenames: **`NNN_snake_case.sql`** only (next integer after highest existing)
- **Forbidden:** 14-digit timestamps; `supabase migration new`
- **Never rewrite** an existing migration — add a follow-on
- Enforce: `npm run verify:migrations` + `.cursor/rules/supabase-migrations.mdc`

### Lessons

| Lesson | Rule |
|---|---|
| 033 | RLS without GRANT → silent 42501 — always pair |
| 050 | Lock down credit RPCs + users UPDATE guard |
| 039–045 | Historical unused numbers |
| 056–058 | Fresh-replay no-ops; effects via `089_reconcile_historical_migration_order.sql` |
| 090/092 | `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` was staging-applied via `090`; production intentionally skipped those defaults (`092`). Do not replay `090` defaults on production. |
| 2026-10-03 | Staging Phase 6A: `postgres` → `public` default table/sequence grants to `anon`/`authenticated`/`service_role` revoked. Future objects created by `postgres` need explicit GRANTs. See [`STAGING_PROD_ALIGNMENT_CLOSURE.md`](../Operations/STAGING_PROD_ALIGNMENT_CLOSURE.md). |

Timestamp→serial remap table (072+) lives in archive: `docs/archive/pre-governance-2026-09-27/MIGRATION_NAMESPACE.md` — consult when debugging old apply history. Do not recreate timestamps.

## Architecture / Rules

- New privileged `users` columns → update `guard_users_privileged_update` consciously (Invariant #3)
- Credit / ledger changes → service-role only (Invariant #2)
- No migration rollback — forward-fix only

## Dependencies

`supabase/migrations/` · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) · [SECURITY](SECURITY.md)

## Failure Modes

Editing old SQL on prod-applied DBs · timestamp filenames · DROP without founder sign-off

## Verification

`npm run verify:migrations` after every new file

## Change Triggers

Any new `supabase/migrations/*.sql`

## Related Documents

[AGENTS.md](../../AGENTS.md) · archive MIGRATION_NAMESPACE for full remap table
