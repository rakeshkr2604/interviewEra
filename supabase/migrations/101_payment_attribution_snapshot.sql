-- 101_payment_attribution_snapshot.sql
-- Persist an immutable marketing attribution snapshot on each payment record
-- at transaction creation time, so historical revenue attribution is independent
-- of later changes to public.users.first_touch_attribution.
--
-- Changes:
--   1. ADD COLUMN attribution_snapshot JSONB NULL to public.payments
--   2. Extend attach_campaign_order() with an optional p_attribution_snapshot
--      parameter so the campaign path also captures attribution in the same INSERT.
--
-- Security:
--   - No new RLS policies required. Existing payments RLS is unchanged.
--   - attribution_snapshot contains only normalized UTM keys; no financial data.
--   - The column does NOT affect amount, discount, status, campaign authority.
--
-- Rollback:
--   ALTER TABLE public.payments DROP COLUMN IF EXISTS attribution_snapshot;
--   -- Re-run migration 084 to restore original attach_campaign_order signature.

-- ── 1. Add attribution_snapshot column ───────────────────────────────────────

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS attribution_snapshot JSONB;

COMMENT ON COLUMN public.payments.attribution_snapshot IS
  'Immutable acquisition attribution snapshot at transaction creation time. '
  'Contains only normalized UTM keys. Not a financial field. Service-role written only.';

-- ── 2. Extend attach_campaign_order() with attribution support ────────────────
--
-- CREATE OR REPLACE with a new parameter that has a DEFAULT is valid in
-- PostgreSQL 14+; existing 5-arg callers continue to work (p_attribution_snapshot
-- defaults to NULL). The function body is otherwise unchanged except for the
-- attribution_snapshot column in the INSERT.

CREATE OR REPLACE FUNCTION public.attach_campaign_order(
  p_redemption_id      UUID,
  p_user_id            UUID,
  p_order_id           TEXT,
  p_currency           TEXT DEFAULT 'INR',
  p_gateway            TEXT DEFAULT 'razorpay',
  p_attribution_snapshot JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_redemption public.campaign_code_redemptions%ROWTYPE;
BEGIN
  SELECT r.* INTO v_redemption
  FROM public.campaign_code_redemptions r
  WHERE r.id = p_redemption_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_redemption.user_id <> p_user_id
    OR v_redemption.status <> 'reserved'
  THEN
    RETURN FALSE;
  END IF;

  IF v_redemption.order_id IS NOT NULL THEN
    RETURN v_redemption.order_id = p_order_id
      AND EXISTS (
        SELECT 1
        FROM public.payments p
        WHERE p.campaign_redemption_id = v_redemption.id
          AND p.user_id = v_redemption.user_id
          AND p.order_id = v_redemption.order_id
          AND p.plan::TEXT = v_redemption.plan
          AND p.amount = v_redemption.final_amount_paise
      );
  END IF;

  INSERT INTO public.payments (
    user_id,
    order_id,
    amount,
    currency,
    status,
    plan,
    gateway,
    campaign_code_id,
    campaign_redemption_id,
    list_amount_paise,
    discount_paise,
    attribution_snapshot
  ) VALUES (
    v_redemption.user_id,
    p_order_id,
    v_redemption.final_amount_paise,
    p_currency,
    'created',
    v_redemption.plan::public.plan_tier,
    p_gateway,
    v_redemption.campaign_code_id,
    v_redemption.id,
    v_redemption.list_amount_paise,
    v_redemption.discount_paise,
    p_attribution_snapshot
  );

  UPDATE public.campaign_code_redemptions
  SET order_id = p_order_id, updated_at = clock_timestamp()
  WHERE id = v_redemption.id
    AND status = 'reserved'
    AND order_id IS NULL;

  RETURN FOUND;
END;
$$;

-- Grant EXECUTE on the new extended signature to service_role only.
REVOKE ALL ON FUNCTION public.attach_campaign_order(UUID, UUID, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_campaign_order(UUID, UUID, TEXT, TEXT, TEXT, JSONB)
  TO service_role;
