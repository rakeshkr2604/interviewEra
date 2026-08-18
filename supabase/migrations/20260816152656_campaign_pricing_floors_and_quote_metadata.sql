-- Server-authoritative campaign pricing:
-- - 0..50% campaign discounts
-- - per-plan promotional floors supplied by the canonical application pricing config
-- - deterministic whole-rupee rounding (nearest; exact half rounds down)
-- - quote timing metadata from database time
-- - atomic reservation semantics preserved from migration 063

BEGIN;

ALTER TABLE public.campaign_codes
  DROP CONSTRAINT IF EXISTS campaign_codes_discount_value_check,
  DROP CONSTRAINT IF EXISTS campaign_codes_percent_range,
  DROP CONSTRAINT IF EXISTS campaign_codes_discount_value_nonnegative,
  DROP CONSTRAINT IF EXISTS campaign_codes_percent_max_50;

ALTER TABLE public.campaign_codes
  ADD CONSTRAINT campaign_codes_discount_value_nonnegative
    CHECK (discount_value >= 0),
  ADD CONSTRAINT campaign_codes_percent_max_50
    CHECK (discount_type <> 'percent' OR discount_value <= 50) NOT VALID;

DROP FUNCTION IF EXISTS public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.quote_campaign_discount(TEXT, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.quote_campaign_discount(
  p_code TEXT,
  p_plan TEXT,
  p_list_amount_paise INTEGER,
  p_promo_floor_paise INTEGER
)
RETURNS TABLE (
  ok BOOLEAN,
  error_code TEXT,
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
  server_now TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.campaign_codes%ROWTYPE;
  v_discount INTEGER;
  v_final INTEGER;
  v_weighted BIGINT;
  v_whole_rupees BIGINT;
  v_code TEXT := upper(trim(p_code));
  v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_plan NOT IN ('starter', 'pro')
    OR p_list_amount_paise < 100
    OR p_promo_floor_paise < 100
    OR p_promo_floor_paise > p_list_amount_paise
  THEN
    RETURN QUERY SELECT FALSE, 'CODE_DISCOUNT_INVALID', NULL::UUID, 0,
      p_list_amount_paise, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, FALSE, v_now;
    RETURN;
  END IF;

  IF v_code IS NULL OR v_code = '' THEN
    RETURN QUERY SELECT FALSE, 'CODE_INVALID', NULL::UUID, 0,
      p_list_amount_paise, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, FALSE, v_now;
    RETURN;
  END IF;

  SELECT * INTO v_row
  FROM public.campaign_codes c
  WHERE c.code = v_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'CODE_INVALID', NULL::UUID, 0,
      p_list_amount_paise, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER,
      NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, FALSE, v_now;
    RETURN;
  END IF;

  IF NOT v_row.is_active THEN
    RETURN QUERY SELECT FALSE, 'CODE_INVALID', v_row.id, 0, p_list_amount_paise,
      v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
      v_row.starts_at, v_row.expires_at, FALSE, v_now;
    RETURN;
  END IF;

  -- Half-open campaign window: [starts_at, expires_at).
  IF v_row.starts_at IS NOT NULL AND v_row.starts_at > v_now THEN
    RETURN QUERY SELECT FALSE, 'CODE_NOT_STARTED', v_row.id, 0, p_list_amount_paise,
      v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
      v_row.starts_at, v_row.expires_at, TRUE, v_now;
    RETURN;
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= v_now THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXPIRED', v_row.id, 0, p_list_amount_paise,
      v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
      v_row.starts_at, v_row.expires_at, TRUE, v_now;
    RETURN;
  END IF;

  IF v_row.max_redemptions IS NOT NULL
    AND v_row.redemption_count >= v_row.max_redemptions
  THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXHAUSTED', v_row.id, 0, p_list_amount_paise,
      v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
      v_row.starts_at, v_row.expires_at, TRUE, v_now;
    RETURN;
  END IF;

  IF cardinality(v_row.applies_to_plans) > 0
    AND NOT (p_plan = ANY (v_row.applies_to_plans))
  THEN
    RETURN QUERY SELECT FALSE, 'CODE_NOT_APPLICABLE', v_row.id, 0, p_list_amount_paise,
      v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
      v_row.starts_at, v_row.expires_at, TRUE, v_now;
    RETURN;
  END IF;

  IF v_row.discount_value < 0 THEN
    RETURN QUERY SELECT FALSE, 'CODE_DISCOUNT_INVALID', v_row.id, 0, p_list_amount_paise,
      v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
      v_row.starts_at, v_row.expires_at, TRUE, v_now;
    RETURN;
  END IF;

  IF v_row.discount_type = 'percent' THEN
    IF v_row.discount_value > 50 THEN
      RETURN QUERY SELECT FALSE, 'CODE_DISCOUNT_INVALID', v_row.id, 0, p_list_amount_paise,
        v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
        v_row.starts_at, v_row.expires_at, TRUE, v_now;
      RETURN;
    END IF;

    v_weighted := p_list_amount_paise::BIGINT * (100 - v_row.discount_value);
    v_whole_rupees := v_weighted / 10000;
    IF mod(v_weighted, 10000) > 5000 THEN
      v_whole_rupees := v_whole_rupees + 1;
    END IF;
    v_final := (v_whole_rupees * 100)::INTEGER;
    v_discount := p_list_amount_paise - v_final;
  ELSE
    IF v_row.discount_value::BIGINT * 100
      > p_list_amount_paise::BIGINT * 50
    THEN
      RETURN QUERY SELECT FALSE, 'CODE_DISCOUNT_INVALID', v_row.id, 0, p_list_amount_paise,
        v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
        v_row.starts_at, v_row.expires_at, TRUE, v_now;
      RETURN;
    END IF;
    v_discount := v_row.discount_value;
    v_final := p_list_amount_paise - v_discount;
  END IF;

  IF v_final < 100
    OR v_final < p_promo_floor_paise
    OR v_final > p_list_amount_paise
  THEN
    RETURN QUERY SELECT FALSE, 'CODE_BELOW_MINIMUM', v_row.id, 0, p_list_amount_paise,
      v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
      v_row.starts_at, v_row.expires_at, TRUE, v_now;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_row.id, v_discount, v_final,
    v_row.label, v_row.kind::TEXT, v_row.discount_type::TEXT, v_row.discount_value,
    v_row.starts_at, v_row.expires_at, TRUE, v_now;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_campaign_code(
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
  server_now TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote RECORD;
  v_updated public.campaign_codes%ROWTYPE;
  v_redemption_id UUID;
  v_stale_id UUID;
  v_code_id UUID;
BEGIN
  FOR v_stale_id IN
    SELECT r.id
    FROM public.campaign_code_redemptions r
    WHERE r.user_id = p_user_id
      AND r.status = 'reserved'
      AND r.created_at < clock_timestamp() - INTERVAL '30 minutes'
  LOOP
    PERFORM public.release_campaign_reservation(v_stale_id);
  END LOOP;

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
      v_quote.expires_at, v_quote.is_active, v_quote.server_now;
    RETURN;
  END IF;

  v_code_id := v_quote.campaign_code_id;

  -- Immediate retries release an open reservation; consumed remains one-use.
  FOR v_stale_id IN
    SELECT r.id
    FROM public.campaign_code_redemptions r
    WHERE r.campaign_code_id = v_code_id
      AND r.user_id = p_user_id
      AND r.status = 'reserved'
  LOOP
    PERFORM public.release_campaign_reservation(v_stale_id);
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM public.campaign_code_redemptions r
    WHERE r.campaign_code_id = v_code_id
      AND r.user_id = p_user_id
      AND r.status = 'consumed'
  ) THEN
    RETURN QUERY SELECT FALSE, 'CODE_ALREADY_USED', NULL::UUID, v_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind, v_quote.discount_type,
      v_quote.discount_value, v_quote.starts_at, v_quote.expires_at,
      v_quote.is_active, v_quote.server_now;
    RETURN;
  END IF;

  UPDATE public.campaign_codes c
  SET redemption_count = c.redemption_count + 1, updated_at = clock_timestamp()
  WHERE c.id = v_code_id
    AND c.is_active
    AND (c.starts_at IS NULL OR c.starts_at <= clock_timestamp())
    AND (c.expires_at IS NULL OR c.expires_at > clock_timestamp())
    AND (c.max_redemptions IS NULL OR c.redemption_count < c.max_redemptions)
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXHAUSTED', NULL::UUID, v_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind, v_quote.discount_type,
      v_quote.discount_value, v_quote.starts_at, v_quote.expires_at,
      v_quote.is_active, clock_timestamp();
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
    v_code_id,
    p_user_id,
    p_order_id,
    p_plan,
    p_list_amount_paise,
    v_quote.discount_paise,
    v_quote.final_amount_paise,
    'reserved'
  )
  RETURNING r.id INTO v_redemption_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_redemption_id, v_code_id,
    v_quote.discount_paise, v_quote.final_amount_paise, v_quote.label, v_quote.kind,
    v_quote.discount_type, v_quote.discount_value, v_quote.starts_at,
    v_quote.expires_at, v_quote.is_active, v_quote.server_now;
EXCEPTION
  WHEN unique_violation THEN
    -- The exception subtransaction already rolls back this call's count increment.
    RETURN QUERY SELECT FALSE, 'CODE_ALREADY_USED', NULL::UUID, v_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind, v_quote.discount_type,
      v_quote.discount_value, v_quote.starts_at, v_quote.expires_at,
      v_quote.is_active, clock_timestamp();
END;
$$;

REVOKE ALL ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER, INTEGER)
  TO service_role;

REVOKE ALL ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT)
  TO service_role;

COMMIT;
