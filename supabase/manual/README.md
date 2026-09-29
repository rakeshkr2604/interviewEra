# Manual / historical SQL (not part of the migration chain)

Files in this directory are **not** applied by `supabase db push`, `supabase migration up`, or any automated numbered migration replay.

## `supabase-migration-retention-system.sql`

Historical unnumbered draft (2026-05-14) for retention / campus / roadmap objects. It was previously under `supabase/migrations/`, which caused fresh-chain replay to execute it after the numbered migrations and collide with:

- `015_retention_system.sql` and related numbered retention objects
- later campus / roadmap schema

Canonical live schema for retention comes from the **numbered** migrations (notably `015_*`, `017_tier_config.sql`, and later campus migrations). This file is preserved for archaeology and comparison only — do not apply it to staging or production as part of a chain replay.

See also [`docs/Core/BACKEND_SCHEMA.md`](../../docs/Core/BACKEND_SCHEMA.md) (deprecated / unreferenced tables note).
