-- Phase 7A: distinguish payment activation ownership from local completeness.
--
-- users.last_payment_id remains the ownership/idempotency marker. New
-- activations snapshot their exact entitlement on the server-owned payment row
-- before the users CAS. After ownership is established, this service-role-only
-- RPC atomically heals the payment binding/status and the one payment ledger
-- artifact. Razorpay/provider calls remain outside this transaction.

BEGIN;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS entitlement_credits INTEGER,
  ADD COLUMN IF NOT EXISTS entitlement_plan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entitlement_plan_expires_at TIMESTAMPTZ;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_entitlement_snapshot_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_entitlement_snapshot_check
  CHECK (
    (
      entitlement_credits IS NULL
      AND entitlement_plan_started_at IS NULL
      AND entitlement_plan_expires_at IS NULL
    )
    OR
    (
      entitlement_credits > 0
      AND entitlement_plan_started_at IS NOT NULL
      AND entitlement_plan_expires_at IS NOT NULL
      AND entitlement_plan_expires_at > entitlement_plan_started_at
    )
  );

COMMENT ON COLUMN public.payments.entitlement_credits IS
  'Immutable server-side snapshot of plan credits for Phase 7A activation completion/recovery.';
COMMENT ON COLUMN public.payments.entitlement_plan_started_at IS
  'Server-side activation snapshot; replay recovery must never recompute this timestamp.';
COMMENT ON COLUMN public.payments.entitlement_plan_expires_at IS
  'Server-side activation snapshot; replay recovery must never extend this timestamp.';

CREATE OR REPLACE FUNCTION public.guard_payment_entitlement_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF OLD.entitlement_credits IS NOT NULL
    AND (
      NEW.entitlement_credits IS DISTINCT FROM OLD.entitlement_credits
      OR NEW.entitlement_plan_started_at IS DISTINCT FROM OLD.entitlement_plan_started_at
      OR NEW.entitlement_plan_expires_at IS DISTINCT FROM OLD.entitlement_plan_expires_at
    ) THEN
    RAISE EXCEPTION 'Payment entitlement snapshot is immutable'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_payment_entitlement_snapshot ON public.payments;
CREATE TRIGGER trg_guard_payment_entitlement_snapshot
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_payment_entitlement_snapshot();

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Conservatively link canonical historical plan-payment rows before enforcing
-- one ledger artifact per payment. Abort rather than guessing if duplicates
-- already exist and require operational reconciliation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payments AS p
    JOIN public.credit_transactions AS ct
      ON ct.user_id = p.user_id
     AND ct.type = 'credit'
     AND ct.reason = 'Plan payment: ' || p.plan::TEXT || ' (' || p.payment_id || ')'
    WHERE p.payment_id IS NOT NULL
    GROUP BY p.payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate canonical plan-payment credit rows require reconciliation before Phase 7A';
  END IF;
END;
$$;

UPDATE public.credit_transactions AS ct
SET payment_id = p.payment_id
FROM public.payments AS p
WHERE p.payment_id IS NOT NULL
  AND ct.payment_id IS NULL
  AND ct.user_id = p.user_id
  AND ct.type = 'credit'
  AND ct.reason = 'Plan payment: ' || p.plan::TEXT || ' (' || p.payment_id || ')';

CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_transactions_payment_credit
  ON public.credit_transactions (payment_id)
  WHERE payment_id IS NOT NULL AND type = 'credit';

CREATE INDEX IF NOT EXISTS idx_credit_transactions_payment_id
  ON public.credit_transactions (payment_id)
  WHERE payment_id IS NOT NULL;

COMMENT ON COLUMN public.credit_transactions.payment_id IS
  'Exact payment ownership for a plan-credit ledger artifact; NULL for non-payment and ambiguous historical rows.';

CREATE OR REPLACE FUNCTION public.complete_payment_activation_local(
  p_user_id UUID,
  p_order_id TEXT,
  p_payment_id TEXT
)
RETURNS TABLE (
  activation_complete BOOLEAN,
  payment_healed BOOLEAN,
  ledger_healed BOOLEAN,
  entitlement_credits INTEGER,
  plan_started_at TIMESTAMPTZ,
  plan_expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_role TEXT := COALESCE(current_setting('request.jwt.claim.role', TRUE), '');
  v_payment public.payments%ROWTYPE;
  v_user public.users%ROWTYPE;
  v_ledger public.credit_transactions%ROWTYPE;
  v_ledger_count INTEGER := 0;
  v_legacy_count INTEGER := 0;
  v_expected_reason TEXT;
  v_has_snapshot BOOLEAN;
  v_payment_healed BOOLEAN := FALSE;
  v_ledger_healed BOOLEAN := FALSE;
BEGIN
  IF v_role <> 'service_role'
    AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Payment activation completion is service-role-only'
      USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL
    OR NULLIF(BTRIM(p_order_id), '') IS NULL
    OR NULLIF(BTRIM(p_payment_id), '') IS NULL THEN
    RAISE EXCEPTION 'Payment activation identity is incomplete'
      USING ERRCODE = '22023';
  END IF;

  SELECT p.*
  INTO v_payment
  FROM public.payments AS p
  WHERE p.order_id = p_order_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    -- A physically deleted order row cannot be reconstructed safely: campaign,
    -- original amount, and entitlement snapshot authority would be absent.
    RAISE EXCEPTION 'Payment order row missing; recovery is ambiguous'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT u.*
  INTO v_user
  FROM public.users AS u
  WHERE u.id = p_user_id
  FOR UPDATE;

  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'Activation user not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_payment.user_id IS DISTINCT FROM p_user_id
    OR v_user.last_payment_id IS DISTINCT FROM p_payment_id
    OR v_user.last_order_id IS DISTINCT FROM p_order_id THEN
    RAISE EXCEPTION 'Payment activation ownership mismatch'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment.payment_id IS NOT NULL
    AND v_payment.payment_id IS DISTINCT FROM p_payment_id THEN
    RAISE EXCEPTION 'Payment identity mismatch' USING ERRCODE = 'P0001';
  END IF;

  IF v_payment.plan::TEXT NOT IN ('starter', 'pro') THEN
    RAISE EXCEPTION 'Payment plan is not eligible for self-serve activation'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_payment.status = 'refunded' THEN
    RAISE EXCEPTION 'Refunded payment cannot be activation-healed'
      USING ERRCODE = 'P0001';
  END IF;

  v_has_snapshot :=
    v_payment.entitlement_credits IS NOT NULL
    AND v_payment.entitlement_plan_started_at IS NOT NULL
    AND v_payment.entitlement_plan_expires_at IS NOT NULL;

  IF (
    v_payment.entitlement_credits IS NOT NULL
    OR v_payment.entitlement_plan_started_at IS NOT NULL
    OR v_payment.entitlement_plan_expires_at IS NOT NULL
  ) AND NOT v_has_snapshot THEN
    RAISE EXCEPTION 'Partial payment entitlement snapshot is ambiguous'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_has_snapshot THEN
    IF v_user.plan_started_at IS DISTINCT FROM v_payment.entitlement_plan_started_at
      OR v_user.plan_expires_at IS DISTINCT FROM v_payment.entitlement_plan_expires_at THEN
      RAISE EXCEPTION 'Stored entitlement timestamps do not match activation snapshot'
        USING ERRCODE = 'P0001';
    END IF;

    -- Expiry processing legitimately changes tier/status after the stored
    -- expiry. Recovery records missing local artifacts but never reactivates or
    -- extends that entitlement.
    IF v_payment.entitlement_plan_expires_at > NOW()
      AND (
        v_user.plan_tier IS DISTINCT FROM v_payment.plan
        OR v_user.plan_status IS DISTINCT FROM 'active'
      ) THEN
      RAISE EXCEPTION 'Active entitlement does not match payment snapshot'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_expected_reason :=
    'Plan payment: ' || v_payment.plan::TEXT || ' (' || p_payment_id || ')';

  SELECT COUNT(*)
  INTO v_ledger_count
  FROM public.credit_transactions AS ct
  WHERE ct.payment_id = p_payment_id
    AND ct.type = 'credit';

  IF v_ledger_count > 1 THEN
    RAISE EXCEPTION 'Multiple payment credit artifacts found'
      USING ERRCODE = 'P0001';
  ELSIF v_ledger_count = 1 THEN
    SELECT ct.*
    INTO v_ledger
    FROM public.credit_transactions AS ct
    WHERE ct.payment_id = p_payment_id
      AND ct.type = 'credit';

    IF v_ledger.user_id IS DISTINCT FROM p_user_id
      OR v_ledger.reason IS DISTINCT FROM v_expected_reason
      OR (
        v_has_snapshot
        AND v_ledger.amount IS DISTINCT FROM v_payment.entitlement_credits
      ) THEN
      RAISE EXCEPTION 'Existing payment credit artifact is inconsistent'
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    IF NOT v_has_snapshot THEN
      -- Old complete activations are recognized through their linked/backfilled
      -- row. Missing historical rows cannot be recreated from today's plan
      -- config because that would guess the original credit grant.
      RAISE EXCEPTION 'Historical payment credit recovery is ambiguous'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*)
    INTO v_legacy_count
    FROM public.credit_transactions AS ct
    WHERE ct.payment_id IS NULL
      AND ct.user_id = p_user_id
      AND ct.type = 'credit'
      AND ct.reason = v_expected_reason;

    IF v_legacy_count > 1 THEN
      RAISE EXCEPTION 'Multiple unlinked payment credit artifacts found'
        USING ERRCODE = 'P0001';
    ELSIF v_legacy_count = 1 THEN
      SELECT ct.*
      INTO v_ledger
      FROM public.credit_transactions AS ct
      WHERE ct.payment_id IS NULL
        AND ct.user_id = p_user_id
        AND ct.type = 'credit'
        AND ct.reason = v_expected_reason
      FOR UPDATE;

      IF v_ledger.amount IS DISTINCT FROM v_payment.entitlement_credits THEN
        RAISE EXCEPTION 'Unlinked payment credit amount is ambiguous'
          USING ERRCODE = 'P0001';
      END IF;

      UPDATE public.credit_transactions
      SET payment_id = p_payment_id
      WHERE id = v_ledger.id;
      v_ledger_healed := TRUE;
    ELSE
      INSERT INTO public.credit_transactions (
        user_id,
        type,
        amount,
        reason,
        payment_id
      )
      VALUES (
        p_user_id,
        'credit',
        v_payment.entitlement_credits,
        v_expected_reason,
        p_payment_id
      )
      ON CONFLICT (payment_id)
        WHERE payment_id IS NOT NULL AND type = 'credit'
      DO NOTHING;

      v_ledger_healed := TRUE;
    END IF;

    SELECT ct.*
    INTO v_ledger
    FROM public.credit_transactions AS ct
    WHERE ct.payment_id = p_payment_id
      AND ct.type = 'credit';

    IF v_ledger.id IS NULL
      OR v_ledger.user_id IS DISTINCT FROM p_user_id
      OR v_ledger.amount IS DISTINCT FROM v_payment.entitlement_credits
      OR v_ledger.reason IS DISTINCT FROM v_expected_reason THEN
      RAISE EXCEPTION 'Payment credit recovery did not converge safely'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_payment_healed :=
    v_payment.payment_id IS DISTINCT FROM p_payment_id
    OR v_payment.status IS DISTINCT FROM 'paid';

  UPDATE public.payments
  SET
    payment_id = p_payment_id,
    status = 'paid',
    updated_at = NOW()
  WHERE id = v_payment.id;

  RETURN QUERY
  SELECT
    TRUE,
    v_payment_healed,
    v_ledger_healed,
    COALESCE(v_payment.entitlement_credits, v_ledger.amount),
    COALESCE(v_payment.entitlement_plan_started_at, v_user.plan_started_at),
    COALESCE(v_payment.entitlement_plan_expires_at, v_user.plan_expires_at);
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_payment_activation_local(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_payment_activation_local(UUID, TEXT, TEXT)
  TO service_role;

COMMIT;
