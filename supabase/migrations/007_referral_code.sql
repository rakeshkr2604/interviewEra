-- ─── Migration 007: Add referral_code column to users ────────────────────────
-- Required for the referral system — this column was missing from the initial
-- schema but is queried in src/app/api/referral/apply/route.ts.
-- Without it, every referral lookup silently returns null.

-- 12-char hex from UUID (built-in gen_random_uuid; avoids pgcrypto / extensions schema on hosted Supabase)
alter table public.users
  add column if not exists referral_code text unique
  default substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12);

-- Backfill any existing rows that ended up with NULL
update public.users
  set referral_code = substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)
  where referral_code is null;

-- Index for fast lookup — referral/apply queries by this column on every request
create index if not exists idx_users_referral_code
  on public.users(referral_code);
