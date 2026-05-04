-- ─── Migration 009: Additional Performance Indexes ───────────────────────────
-- Closes gaps from a hot-path audit of every supabase query in src/app/api/**
-- and src/app/(dashboard)/**. All idempotent, all non-CONCURRENTLY (Supabase
-- migrations run in a transaction; CONCURRENTLY would conflict).
--
-- Indexes added:
--
--  1. interviews(user_id, started_at DESC)
--     History page + dashboard list both order by started_at DESC. The existing
--     idx_interviews_user_completed_at indexes a different column.
--
--  2. questions(interview_id, order_index)
--     Interview loop fetches questions ordered by order_index. Composite makes
--     the sort an index scan instead of a scan + sort.
--
--  3. reports(interview_id, generated_at DESC)
--     /api/interview/complete looks up the latest report for an interview.
--     Composite covers the ORDER BY generated_at DESC LIMIT 1.
--
--  4. credit_transactions(user_id, created_at DESC)
--     Future per-user credit history feed. The existing index is on user_id only.
--
--  5. subscriptions(user_id, status)
--     /api/payments/create-order filters by both columns to find an active
--     subscription. Composite avoids a recheck on the status column.
--
--  6. subscriptions(razorpay_sub_id)
--     /api/payments/webhook looks up subscriptions by Razorpay ID for every
--     subscription event (idempotency check). High write QPS path.
--
--  7. resumes(user_id, created_at DESC)
--     Future "my resumes" listing. Existing idx_resumes_user_id is single-col.
--
--  8. referrals(referrer_id)
--     Referral leaderboard / "who I referred" queries.
--
--  9. referrals(referred_id, status)
--     /api/referral/apply checks for an existing credited referral by
--     (referred_id, status). Composite covers both predicates.
--
-- 10. campus_organizations(admin_user_id)
--     Every campus admin route looks up the org by admin_user_id (auth.uid()).
--     Hit on every page render of /admin/dashboard.
--
-- 11. campus_invites(org_id, status)
--     /api/admin/bulk-invite filters by (org_id, status='pending') to count
--     pending seats. Composite avoids a scan of all invites for the org.
--
-- ── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists idx_interviews_user_started_at
  on public.interviews(user_id, started_at desc);

create index if not exists idx_questions_interview_order
  on public.questions(interview_id, order_index);

create index if not exists idx_reports_interview_generated_at
  on public.reports(interview_id, generated_at desc);

create index if not exists idx_credit_transactions_user_created_at
  on public.credit_transactions(user_id, created_at desc);

create index if not exists idx_subscriptions_user_status
  on public.subscriptions(user_id, status);

create index if not exists idx_subscriptions_razorpay_sub_id
  on public.subscriptions(razorpay_sub_id);

create index if not exists idx_resumes_user_created_at
  on public.resumes(user_id, created_at desc);

create index if not exists idx_referrals_referrer_id
  on public.referrals(referrer_id);

create index if not exists idx_referrals_referred_status
  on public.referrals(referred_id, status);

create index if not exists idx_campus_organizations_admin_user_id
  on public.campus_organizations(admin_user_id);

create index if not exists idx_campus_invites_org_status
  on public.campus_invites(org_id, status);
