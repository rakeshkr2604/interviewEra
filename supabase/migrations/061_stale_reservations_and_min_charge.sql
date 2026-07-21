-- 061: Stale reservation batch release + distinct below-minimum discount error
--
-- A1: Global cleanup of abandoned checkout reservations (cron calls this).
-- A2: Replace shared CODE_NOT_APPLICABLE for final < 100 paise with CODE_BELOW_MINIMUM.

BEGIN;

-- ── A2: distinct rejection when discount would drop below ₹1 ──────────────────

CREATE OR REPLACE FUNCTION public.quote_campaign_discount(
  p_code TEXT,
  p_plan TEXT,
  p_list_amount_paise INTEGER
)
RETURNS TABLE (
  ok BOOLEAN,
  error_code TEXT,
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
  v_row public.campaign_codes%ROWTYPE;
  v_discount INTEGER;
  v_final INTEGER;
  v_code TEXT := upper(trim(p_code));
BEGIN
  IF v_code IS NULL OR v_code = '' THEN
    RETURN QUERY SELECT FALSE, 'CODE_INVALID', NULL::UUID, 0, p_list_amount_paise, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_row FROM public.campaign_codes WHERE code = v_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'CODE_INVALID', NULL::UUID, 0, p_list_amount_paise, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF NOT v_row.is_active THEN
    RETURN QUERY SELECT FALSE, 'CODE_INVALID', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  IF v_row.starts_at IS NOT NULL AND v_row.starts_at > NOW() THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXPIRED', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= NOW() THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXPIRED', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  IF v_row.max_redemptions IS NOT NULL AND v_row.redemption_count >= v_row.max_redemptions THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXHAUSTED', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  IF cardinality(v_row.applies_to_plans) > 0 AND NOT (p_plan = ANY (v_row.applies_to_plans)) THEN
    RETURN QUERY SELECT FALSE, 'CODE_NOT_APPLICABLE', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  IF v_row.discount_type = 'percent' THEN
    v_discount := (p_list_amount_paise * v_row.discount_value) / 100;
  ELSE
    v_discount := v_row.discount_value;
  END IF;

  IF v_discount >= p_list_amount_paise THEN
    RETURN QUERY SELECT FALSE, 'CODE_BELOW_MINIMUM', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  v_final := p_list_amount_paise - v_discount;
  -- Explicit rejection (not clamp): final must be >= ₹1 (100 paise).
  IF v_final < 100 THEN
    RETURN QUERY SELECT FALSE, 'CODE_BELOW_MINIMUM', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_row.id, v_discount, v_final, v_row.label, v_row.kind::TEXT;
END;
$$;

-- ── A1: batch release stale reservations (all users) ─────────────────────────

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
  v_ok BOOLEAN;
BEGIN
  FOR v_id IN
    SELECT r.id
    FROM public.campaign_code_redemptions r
    WHERE r.status = 'reserved'
      AND r.created_at < NOW() - make_interval(mins => GREATEST(1, p_older_than_minutes))
  LOOP
    SELECT public.release_campaign_reservation(v_id) INTO v_ok;
    IF v_ok THEN
      v_released := v_released + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_released;
END;
$$;

REVOKE ALL ON FUNCTION public.release_stale_campaign_reservations(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_stale_campaign_reservations(INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_stale_campaign_reservations(INTEGER) TO service_role;

-- quote already granted in 060; re-assert lockdown after replace
REVOKE ALL ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER) TO service_role;

COMMIT;
