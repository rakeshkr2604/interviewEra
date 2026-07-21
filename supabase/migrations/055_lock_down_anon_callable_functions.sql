-- Lock down anon/authenticated-callable SECURITY DEFINER RPCs
--
-- Context: Security Advisor + live PostgREST probes confirmed four functions
-- were executable by `anon` / `authenticated` with no caller-identity check:
--   • deduct_interview_credit  — production-only (never in migration chain)
--   • unlock_user_tier         — 015 granted service_role but never REVOKEd PUBLIC
--   • compute_daily_user_rollup — 023; no GRANT/REVOKE (default PUBLIC EXECUTE)
--   • increment_email_metric   — 037; same as rollup
--
-- Pattern mirrors 050_production_security_hardening.sql §3 (credit RPCs):
--   REVOKE ALL FROM PUBLIC, then FROM anon/authenticated, GRANT EXECUTE TO service_role.
--
-- App callers are service-role-only (verified 2026-07-21):
--   unlock_user_tier          → src/lib/retention/tier-unlock.ts (createServiceClient)
--   compute_daily_user_rollup → src/app/api/cron/daily-rollup/route.ts
--   increment_email_metric    → src/lib/email/{queue,analytics}/index.ts
--   deduct_interview_credit   → zero src/ references (dead app path; live DB surface)
--
-- Rollback (manual):
--   GRANT EXECUTE ON FUNCTION public.deduct_interview_credit(uuid, uuid, text) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.unlock_user_tier(uuid, integer, integer, unlock_reason) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.compute_daily_user_rollup(date) TO anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.increment_email_metric(text, text) TO anon, authenticated;
--   (Do NOT drop credit_deducted or the function — production already depends on both.)

BEGIN;

-- ── 1. Bring production-only column into the migration chain ─────────────────
-- Exists in live schema (OpenAPI) but never had a migration. Idempotent.

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS credit_deducted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.interviews.credit_deducted IS
  'Idempotency flag for deduct_interview_credit: true after a successful debit for this interview.';

-- ── 2. Bring deduct_interview_credit into the migration chain ────────────────
-- Exact production definition (pg_get_functiondef, founder-verified). Logic unchanged.

CREATE OR REPLACE FUNCTION public.deduct_interview_credit(
  p_interview_id uuid,
  p_user_id uuid,
  p_reason text
)
RETURNS TABLE(success boolean, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_already_deducted BOOLEAN;
  v_remaining INTEGER;
BEGIN
  SELECT credit_deducted INTO v_already_deducted
  FROM interviews
  WHERE id = p_interview_id AND user_id = p_user_id;

  IF v_already_deducted IS TRUE THEN
    SELECT credits_remaining INTO v_remaining
    FROM users
    WHERE id = p_user_id;
    RETURN QUERY SELECT TRUE, v_remaining;
    RETURN;
  END IF;

  UPDATE users
  SET credits_remaining = credits_remaining - 1
  WHERE id = p_user_id AND credits_remaining > 0
  RETURNING credits_remaining INTO v_remaining;

  IF v_remaining IS NOT NULL THEN
    UPDATE interviews
    SET credit_deducted = TRUE
    WHERE id = p_interview_id;

    INSERT INTO credit_transactions (user_id, type, amount, reason)
    VALUES (p_user_id, 'debit', 1, p_reason);

    RETURN QUERY SELECT TRUE, v_remaining;
  ELSE
    RETURN QUERY SELECT FALSE, 0;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.deduct_interview_credit(uuid, uuid, text) IS
  'Atomic interview credit debit with interviews.credit_deducted idempotency. service_role EXECUTE only.';

-- ── 3. Revoke PUBLIC / anon / authenticated; grant service_role only ─────────
-- Signatures match 015 (unlock_user_tier), 023 (rollup), 037 (email metric),
-- and the CREATE above (deduct_interview_credit).

REVOKE ALL ON FUNCTION public.deduct_interview_credit(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unlock_user_tier(uuid, integer, integer, unlock_reason) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_daily_user_rollup(date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_email_metric(text, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.deduct_interview_credit(uuid, uuid, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.unlock_user_tier(uuid, integer, integer, unlock_reason) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.compute_daily_user_rollup(date) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_email_metric(text, text) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.deduct_interview_credit(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.unlock_user_tier(uuid, integer, integer, unlock_reason) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_daily_user_rollup(date) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_email_metric(text, text) TO service_role;

COMMIT;
