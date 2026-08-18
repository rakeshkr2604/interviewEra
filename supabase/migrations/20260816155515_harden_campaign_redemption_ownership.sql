-- Campaign reservation/payment ownership reconciliation.
--
-- A campaign redemption is the checkout-attempt identity before Razorpay creates
-- an order. Once an order is attached, it is immutable and the reservation must
-- never be age-released: Razorpay orders have no terminal unpaid/expired state.

BEGIN;

-- Fail closed on pre-existing ownership drift instead of silently reassigning
-- payment or redemption records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.campaign_code_redemptions
    WHERE order_id IS NOT NULL
    GROUP BY order_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate campaign redemption order_id values require reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.campaign_code_redemptions
    WHERE payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate campaign redemption payment_id values require reconciliation';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE campaign_redemption_id IS NOT NULL
    GROUP BY campaign_redemption_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate payments campaign_redemption_id values require reconciliation';
  END IF;
END
$$;

DROP INDEX IF EXISTS public.idx_campaign_redemptions_order;

CREATE UNIQUE INDEX idx_campaign_redemptions_order
  ON public.campaign_code_redemptions (order_id)
  WHERE order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_redemptions_payment
  ON public.campaign_code_redemptions (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_campaign_redemption
  ON public.payments (campaign_redemption_id)
  WHERE campaign_redemption_id IS NOT NULL;

-- Only an unbound reservation can be released. An order-bound reservation may
-- still be paid later and therefore continues to hold campaign capacity.
CREATE OR REPLACE FUNCTION public.release_campaign_reservation(
  p_redemption_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id UUID;
BEGIN
  UPDATE public.campaign_code_redemptions
  SET status = 'released', updated_at = clock_timestamp()
  WHERE id = p_redemption_id
    AND status = 'reserved'
    AND order_id IS NULL
  RETURNING campaign_code_id INTO v_code_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.campaign_codes
  SET
    redemption_count = GREATEST(0, redemption_count - 1),
    updated_at = clock_timestamp()
  WHERE id = v_code_id;

  RETURN TRUE;
END;
$$;

-- The return shape changes to expose whether this call owns a newly-created
-- unbound reservation. Only that owner may create the external Razorpay order.
DROP FUNCTION IF EXISTS public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT);

CREATE FUNCTION public.reserve_campaign_code(
  p_user_id UUID,
  p_code TEXT,
  p_plan TEXT,
  p_list_amount_paise INTEGER,
  p_promo_floor_paise INTEGER,
  p_order_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  ok BOOLEAN,
  error_code TEXT,
  redemption_id UUID,
  campaign_code_id UUID,
  discount_paise INTEGER,
  final_amount_paise INTEGER,
  label TEXT,
  kind TEXT,
  discount_type TEXT,
  discount_value INTEGER,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN,
  server_now TIMESTAMPTZ,
  reservation_created BOOLEAN,
  order_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote RECORD;
  v_code public.campaign_codes%ROWTYPE;
  v_existing public.campaign_code_redemptions%ROWTYPE;
  v_updated public.campaign_codes%ROWTYPE;
  v_redemption_id UUID;
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  SELECT c.* INTO v_code
  FROM public.campaign_codes c
  WHERE c.code = upper(trim(p_code));

  IF FOUND THEN
    SELECT r.* INTO v_existing
    FROM public.campaign_code_redemptions r
    WHERE r.campaign_code_id = v_code.id
      AND r.user_id = p_user_id
      AND r.status IN ('reserved', 'consumed')
    FOR UPDATE;

    IF FOUND AND v_existing.status = 'consumed' THEN
      RETURN QUERY SELECT FALSE, 'CODE_ALREADY_USED', v_existing.id, v_code.id,
        v_existing.discount_paise, v_existing.final_amount_paise, v_code.label,
        v_code.kind::TEXT, v_code.discount_type::TEXT, v_code.discount_value,
        v_code.starts_at, v_code.expires_at, v_code.is_active, v_now, FALSE,
        v_existing.order_id;
      RETURN;
    END IF;

    IF FOUND AND v_existing.status = 'reserved' THEN
      IF v_existing.order_id IS NOT NULL THEN
        RETURN QUERY SELECT TRUE, NULL::TEXT, v_existing.id, v_code.id,
          v_existing.discount_paise, v_existing.final_amount_paise, v_code.label,
          v_code.kind::TEXT, v_code.discount_type::TEXT, v_code.discount_value,
          v_code.starts_at, v_code.expires_at, v_code.is_active, v_now, FALSE,
          v_existing.order_id;
        RETURN;
      END IF;

      IF v_existing.created_at >= v_now - INTERVAL '30 minutes' THEN
        RETURN QUERY SELECT FALSE, 'CHECKOUT_INITIALIZING', v_existing.id, v_code.id,
          v_existing.discount_paise, v_existing.final_amount_paise, v_code.label,
          v_code.kind::TEXT, v_code.discount_type::TEXT, v_code.discount_value,
          v_code.starts_at, v_code.expires_at, v_code.is_active, v_now, FALSE,
          NULL::TEXT;
        RETURN;
      END IF;

      -- The row is still locked by this transaction and is provably unbound.
      PERFORM public.release_campaign_reservation(v_existing.id);
    END IF;
  END IF;

  SELECT * INTO v_quote
  FROM public.quote_campaign_discount(
    p_code,
    p_plan,
    p_list_amount_paise,
    p_promo_floor_paise
  );

  IF NOT v_quote.ok THEN
    RETURN QUERY SELECT FALSE, v_quote.error_code, NULL::UUID,
      v_quote.campaign_code_id, 0, p_list_amount_paise, v_quote.label, v_quote.kind,
      v_quote.discount_type, v_quote.discount_value, v_quote.starts_at,
      v_quote.expires_at, v_quote.is_active, v_quote.server_now, FALSE, NULL::TEXT;
    RETURN;
  END IF;

  UPDATE public.campaign_codes c
  SET
    redemption_count = c.redemption_count + 1,
    updated_at = clock_timestamp()
  WHERE c.id = v_quote.campaign_code_id
    AND c.is_active
    AND (c.starts_at IS NULL OR c.starts_at <= clock_timestamp())
    AND (c.expires_at IS NULL OR c.expires_at > clock_timestamp())
    AND (c.max_redemptions IS NULL OR c.redemption_count < c.max_redemptions)
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXHAUSTED', NULL::UUID,
      v_quote.campaign_code_id, 0, p_list_amount_paise, v_quote.label, v_quote.kind,
      v_quote.discount_type, v_quote.discount_value, v_quote.starts_at,
      v_quote.expires_at, v_quote.is_active, clock_timestamp(), FALSE, NULL::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.campaign_code_redemptions AS r (
    campaign_code_id,
    user_id,
    order_id,
    plan,
    list_amount_paise,
    discount_paise,
    final_amount_paise,
    status
  ) VALUES (
    v_quote.campaign_code_id,
    p_user_id,
    p_order_id,
    p_plan,
    p_list_amount_paise,
    v_quote.discount_paise,
    v_quote.final_amount_paise,
    'reserved'
  )
  RETURNING r.id INTO v_redemption_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_redemption_id, v_quote.campaign_code_id,
    v_quote.discount_paise, v_quote.final_amount_paise, v_quote.label, v_quote.kind,
    v_quote.discount_type, v_quote.discount_value, v_quote.starts_at,
    v_quote.expires_at, v_quote.is_active, v_quote.server_now, TRUE, p_order_id;
EXCEPTION
  WHEN unique_violation THEN
    -- The exception subtransaction rolls back the campaign count increment.
    SELECT r.* INTO v_existing
    FROM public.campaign_code_redemptions r
    WHERE r.campaign_code_id = v_quote.campaign_code_id
      AND r.user_id = p_user_id
      AND r.status IN ('reserved', 'consumed');

    IF FOUND AND v_existing.status = 'reserved' AND v_existing.order_id IS NOT NULL THEN
      RETURN QUERY SELECT TRUE, NULL::TEXT, v_existing.id, v_quote.campaign_code_id,
        v_existing.discount_paise, v_existing.final_amount_paise, v_quote.label,
        v_quote.kind, v_quote.discount_type, v_quote.discount_value, v_quote.starts_at,
        v_quote.expires_at, v_quote.is_active, clock_timestamp(), FALSE,
        v_existing.order_id;
    ELSIF FOUND AND v_existing.status = 'reserved' THEN
      RETURN QUERY SELECT FALSE, 'CHECKOUT_INITIALIZING', v_existing.id,
        v_quote.campaign_code_id, v_existing.discount_paise,
        v_existing.final_amount_paise, v_quote.label, v_quote.kind,
        v_quote.discount_type, v_quote.discount_value, v_quote.starts_at,
        v_quote.expires_at, v_quote.is_active, clock_timestamp(), FALSE, NULL::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, 'CODE_ALREADY_USED', v_existing.id,
        v_quote.campaign_code_id, 0, p_list_amount_paise, v_quote.label, v_quote.kind,
        v_quote.discount_type, v_quote.discount_value, v_quote.starts_at,
        v_quote.expires_at, v_quote.is_active, clock_timestamp(), FALSE,
        v_existing.order_id;
    END IF;
END;
$$;

-- Atomically bind the external order to the exact reservation and create the
-- local payment row. Existing identical ownership is an idempotent replay.
CREATE OR REPLACE FUNCTION public.attach_campaign_order(
  p_redemption_id UUID,
  p_user_id UUID,
  p_order_id TEXT,
  p_currency TEXT DEFAULT 'INR',
  p_gateway TEXT DEFAULT 'razorpay'
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
    discount_paise
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
    v_redemption.discount_paise
  );

  UPDATE public.campaign_code_redemptions
  SET order_id = p_order_id, updated_at = clock_timestamp()
  WHERE id = v_redemption.id
    AND status = 'reserved'
    AND order_id IS NULL;

  RETURN FOUND;
END;
$$;

-- Consumption is tied to the exact paid local payment. Identical retries are
-- idempotent; identifiers on consumed rows are immutable.
CREATE OR REPLACE FUNCTION public.consume_campaign_redemption(
  p_redemption_id UUID,
  p_order_id TEXT,
  p_payment_id TEXT
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

  IF NOT FOUND OR v_redemption.order_id IS DISTINCT FROM p_order_id THEN
    RETURN FALSE;
  END IF;

  IF v_redemption.status = 'consumed' THEN
    RETURN v_redemption.payment_id IS NOT DISTINCT FROM p_payment_id;
  END IF;

  IF v_redemption.status <> 'reserved' THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.payments p
    WHERE p.campaign_redemption_id = v_redemption.id
      AND p.user_id = v_redemption.user_id
      AND p.order_id = p_order_id
      AND p.payment_id = p_payment_id
      AND p.status = 'paid'
      AND p.plan::TEXT = v_redemption.plan
      AND p.amount = v_redemption.final_amount_paise
  ) THEN
    RETURN FALSE;
  END IF;

  UPDATE public.campaign_code_redemptions
  SET
    status = 'consumed',
    payment_id = p_payment_id,
    updated_at = clock_timestamp()
  WHERE id = v_redemption.id
    AND status = 'reserved'
    AND order_id = p_order_id
    AND payment_id IS NULL;

  RETURN FOUND;
END;
$$;

-- Only abandoned pre-order initialization is stale. Bound Razorpay orders can
-- still become paid and must continue holding their campaign slot.
CREATE OR REPLACE FUNCTION public.release_stale_campaign_reservations(
  p_older_than_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
  released_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_released INTEGER := 0;
BEGIN
  FOR v_id IN
    SELECT r.id
    FROM public.campaign_code_redemptions r
    WHERE r.status = 'reserved'
      AND r.order_id IS NULL
      AND r.created_at < clock_timestamp()
        - make_interval(mins => GREATEST(1, p_older_than_minutes))
    FOR UPDATE SKIP LOCKED
  LOOP
    IF public.release_campaign_reservation(v_id) THEN
      v_released := v_released + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_released;
END;
$$;

REVOKE ALL ON FUNCTION public.release_campaign_reservation(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_campaign_reservation(UUID)
  TO service_role;

REVOKE ALL ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.attach_campaign_order(UUID, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_campaign_order(UUID, UUID, TEXT, TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.consume_campaign_redemption(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_campaign_redemption(UUID, TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.release_stale_campaign_reservations(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_campaign_reservations(INTEGER)
  TO service_role;

COMMIT;
