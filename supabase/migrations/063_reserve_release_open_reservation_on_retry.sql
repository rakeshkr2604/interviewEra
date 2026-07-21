-- 063: Transparent retry — release existing reserved (same user+code) before re-reserve
--
-- Abandoned checkouts leave status=reserved, which blocked retries with CODE_ALREADY_USED.
-- Only status=consumed should permanently block. Open reservations are released via
-- release_campaign_reservation (atomic status flip + redemption_count decrement).

BEGIN;

CREATE OR REPLACE FUNCTION public.reserve_campaign_code(
  p_user_id UUID,
  p_code TEXT,
  p_plan TEXT,
  p_list_amount_paise INTEGER,
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
  kind TEXT
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
  -- Release stale reservations (>30m) for this user (any code) so slots free up.
  FOR v_stale_id IN
    SELECT r.id
    FROM public.campaign_code_redemptions r
    WHERE r.user_id = p_user_id
      AND r.status = 'reserved'
      AND r.created_at < NOW() - INTERVAL '30 minutes'
  LOOP
    PERFORM public.release_campaign_reservation(v_stale_id);
  END LOOP;

  SELECT * INTO v_quote
  FROM public.quote_campaign_discount(p_code, p_plan, p_list_amount_paise);

  IF NOT v_quote.ok THEN
    RETURN QUERY SELECT FALSE, v_quote.error_code, NULL::UUID, v_quote.campaign_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind;
    RETURN;
  END IF;

  v_code_id := v_quote.campaign_code_id;

  -- Immediate retry: release any open reservation for this user+code (not yet consumed).
  FOR v_stale_id IN
    SELECT r.id
    FROM public.campaign_code_redemptions r
    WHERE r.campaign_code_id = v_code_id
      AND r.user_id = p_user_id
      AND r.status = 'reserved'
  LOOP
    PERFORM public.release_campaign_reservation(v_stale_id);
  END LOOP;

  -- Permanently block only after a successful payment consumed the code.
  IF EXISTS (
    SELECT 1 FROM public.campaign_code_redemptions r
    WHERE r.campaign_code_id = v_code_id
      AND r.user_id = p_user_id
      AND r.status = 'consumed'
  ) THEN
    RETURN QUERY SELECT FALSE, 'CODE_ALREADY_USED', NULL::UUID, v_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind;
    RETURN;
  END IF;

  UPDATE public.campaign_codes c
  SET
    redemption_count = c.redemption_count + 1,
    updated_at = NOW()
  WHERE c.id = v_code_id
    AND c.is_active
    AND (c.starts_at IS NULL OR c.starts_at <= NOW())
    AND (c.expires_at IS NULL OR c.expires_at > NOW())
    AND (c.max_redemptions IS NULL OR c.redemption_count < c.max_redemptions)
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXHAUSTED', NULL::UUID, v_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind;
    RETURN;
  END IF;

  INSERT INTO public.campaign_code_redemptions AS r (
    campaign_code_id, user_id, order_id, plan,
    list_amount_paise, discount_paise, final_amount_paise, status
  ) VALUES (
    v_code_id, p_user_id, p_order_id, p_plan,
    p_list_amount_paise, v_quote.discount_paise, v_quote.final_amount_paise, 'reserved'
  )
  RETURNING r.id INTO v_redemption_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_redemption_id, v_code_id,
    v_quote.discount_paise, v_quote.final_amount_paise, v_quote.label, v_quote.kind;
EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.campaign_codes c
    SET redemption_count = GREATEST(0, c.redemption_count - 1), updated_at = NOW()
    WHERE c.id = v_code_id;
    RETURN QUERY SELECT FALSE, 'CODE_ALREADY_USED', NULL::UUID, v_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, TEXT) TO service_role;

COMMIT;
