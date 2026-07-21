-- 060: Campaign codes (promo/sponsorship) + reward settings + referral harden
--
-- Extends referrals with UNIQUE(referred_id). Adds campaign_codes,
-- campaign_code_redemptions, platform_reward_settings, payments discount columns,
-- and SECURITY DEFINER RPCs (service_role only from day one).

BEGIN;

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.campaign_code_kind AS ENUM ('promo', 'sponsorship');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_discount_type AS ENUM ('percent', 'flat_paise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_redemption_status AS ENUM ('reserved', 'consumed', 'released');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Harden referrals ─────────────────────────────────────────────────────────

-- Deduplicate referred_id if any legacy doubles exist (keep lowest id).
DELETE FROM public.referrals a
USING public.referrals b
WHERE a.referred_id = b.referred_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_id_unique
  ON public.referrals (referred_id);

-- ── platform_reward_settings (singleton) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_reward_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  referrer_credits INTEGER NOT NULL DEFAULT 1 CHECK (referrer_credits >= 0 AND referrer_credits <= 100),
  referred_credits INTEGER NOT NULL DEFAULT 1 CHECK (referred_credits >= 0 AND referred_credits <= 100),
  trigger TEXT NOT NULL DEFAULT 'first_completed_interview'
    CHECK (trigger = 'first_completed_interview'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_reward_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_reward_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.platform_reward_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.platform_reward_settings TO service_role;

DROP POLICY IF EXISTS platform_reward_settings_service ON public.platform_reward_settings;
CREATE POLICY platform_reward_settings_service ON public.platform_reward_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── campaign_codes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  kind public.campaign_code_kind NOT NULL,
  label TEXT NOT NULL,
  partner_name TEXT,
  notes TEXT,
  discount_type public.campaign_discount_type NOT NULL,
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  applies_to_plans TEXT[] NOT NULL DEFAULT '{}',
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_codes_code_upper CHECK (code = upper(code)),
  CONSTRAINT campaign_codes_percent_range CHECK (
    discount_type <> 'percent' OR (discount_value >= 1 AND discount_value <= 99)
  ),
  CONSTRAINT campaign_codes_window CHECK (
    starts_at IS NULL OR expires_at IS NULL OR starts_at < expires_at
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_codes_code
  ON public.campaign_codes (code);

CREATE INDEX IF NOT EXISTS idx_campaign_codes_active
  ON public.campaign_codes (is_active, kind);

ALTER TABLE public.campaign_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.campaign_codes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campaign_codes TO service_role;

DROP POLICY IF EXISTS campaign_codes_service ON public.campaign_codes;
CREATE POLICY campaign_codes_service ON public.campaign_codes
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── campaign_code_redemptions ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.campaign_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code_id UUID NOT NULL REFERENCES public.campaign_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT,
  payment_id TEXT,
  plan TEXT NOT NULL,
  list_amount_paise INTEGER NOT NULL,
  discount_paise INTEGER NOT NULL,
  final_amount_paise INTEGER NOT NULL,
  status public.campaign_redemption_status NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One open/consumed use per user per code (released rows free the slot).
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_redemptions_user_code_active
  ON public.campaign_code_redemptions (campaign_code_id, user_id)
  WHERE status IN ('reserved', 'consumed');

CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_user_created
  ON public.campaign_code_redemptions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_redemptions_order
  ON public.campaign_code_redemptions (order_id)
  WHERE order_id IS NOT NULL;

ALTER TABLE public.campaign_code_redemptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.campaign_code_redemptions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.campaign_code_redemptions TO service_role;

DROP POLICY IF EXISTS campaign_redemptions_service ON public.campaign_code_redemptions;
CREATE POLICY campaign_redemptions_service ON public.campaign_code_redemptions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── payments discount columns ────────────────────────────────────────────────

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS campaign_code_id UUID REFERENCES public.campaign_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_redemption_id UUID REFERENCES public.campaign_code_redemptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS list_amount_paise INTEGER,
  ADD COLUMN IF NOT EXISTS discount_paise INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payments_campaign_code
  ON public.payments (campaign_code_id)
  WHERE campaign_code_id IS NOT NULL;

-- ── RPC: quote discount (read-only validate) ─────────────────────────────────

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
    RETURN QUERY SELECT FALSE, 'CODE_NOT_APPLICABLE', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  v_final := p_list_amount_paise - v_discount;
  IF v_final < 100 THEN
    RETURN QUERY SELECT FALSE, 'CODE_NOT_APPLICABLE', v_row.id, 0, p_list_amount_paise, v_row.label, v_row.kind::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_row.id, v_discount, v_final, v_row.label, v_row.kind::TEXT;
END;
$$;

-- ── RPC: reserve (atomic cap increment + redemption insert) ──────────────────

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
BEGIN
  -- Release stale reservations (>30m) for this user so they can retry.
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

  -- Block if user already has reserved/consumed for this code.
  IF EXISTS (
    SELECT 1 FROM public.campaign_code_redemptions
    WHERE campaign_code_id = v_quote.campaign_code_id
      AND user_id = p_user_id
      AND status IN ('reserved', 'consumed')
  ) THEN
    RETURN QUERY SELECT FALSE, 'CODE_ALREADY_USED', NULL::UUID, v_quote.campaign_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind;
    RETURN;
  END IF;

  UPDATE public.campaign_codes
  SET
    redemption_count = redemption_count + 1,
    updated_at = NOW()
  WHERE id = v_quote.campaign_code_id
    AND is_active
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_redemptions IS NULL OR redemption_count < max_redemptions)
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'CODE_EXHAUSTED', NULL::UUID, v_quote.campaign_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind;
    RETURN;
  END IF;

  INSERT INTO public.campaign_code_redemptions (
    campaign_code_id, user_id, order_id, plan,
    list_amount_paise, discount_paise, final_amount_paise, status
  ) VALUES (
    v_quote.campaign_code_id, p_user_id, p_order_id, p_plan,
    p_list_amount_paise, v_quote.discount_paise, v_quote.final_amount_paise, 'reserved'
  )
  RETURNING id INTO v_redemption_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_redemption_id, v_quote.campaign_code_id,
    v_quote.discount_paise, v_quote.final_amount_paise, v_quote.label, v_quote.kind;
EXCEPTION
  WHEN unique_violation THEN
    -- Roll back the count bump if insert raced
    UPDATE public.campaign_codes
    SET redemption_count = GREATEST(0, redemption_count - 1), updated_at = NOW()
    WHERE id = v_quote.campaign_code_id;
    RETURN QUERY SELECT FALSE, 'CODE_ALREADY_USED', NULL::UUID, v_quote.campaign_code_id,
      0, p_list_amount_paise, v_quote.label, v_quote.kind;
END;
$$;

-- ── RPC: release reservation ─────────────────────────────────────────────────

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
  SET status = 'released', updated_at = NOW()
  WHERE id = p_redemption_id AND status = 'reserved'
  RETURNING campaign_code_id INTO v_code_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE public.campaign_codes
  SET redemption_count = GREATEST(0, redemption_count - 1), updated_at = NOW()
  WHERE id = v_code_id;

  RETURN TRUE;
END;
$$;

-- ── RPC: consume on successful payment ───────────────────────────────────────

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
BEGIN
  UPDATE public.campaign_code_redemptions
  SET
    status = 'consumed',
    order_id = COALESCE(p_order_id, order_id),
    payment_id = p_payment_id,
    updated_at = NOW()
  WHERE id = p_redemption_id
    AND status IN ('reserved', 'consumed');

  RETURN FOUND;
END;
$$;

-- ── RPC: atomic referral bonus ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_referral_bonus(
  p_referred_id UUID
)
RETURNS TABLE (
  credited BOOLEAN,
  reason TEXT,
  referrer_id UUID,
  referrer_credits INTEGER,
  referred_credits INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref public.referrals%ROWTYPE;
  v_settings public.platform_reward_settings%ROWTYPE;
  v_completed INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_completed
  FROM public.interviews
  WHERE user_id = p_referred_id AND status = 'completed';

  IF v_completed < 1 THEN
    RETURN QUERY SELECT FALSE, 'no_completed_interview', NULL::UUID, 0, 0;
    RETURN;
  END IF;

  SELECT * INTO v_settings FROM public.platform_reward_settings WHERE id = 1;
  IF NOT FOUND THEN
    v_settings.referrer_credits := 1;
    v_settings.referred_credits := 1;
  END IF;

  UPDATE public.referrals
  SET status = 'credited', credited_at = NOW()
  WHERE referred_id = p_referred_id AND status = 'pending'
  RETURNING * INTO v_ref;

  IF NOT FOUND THEN
    IF EXISTS (
      SELECT 1 FROM public.referrals
      WHERE referred_id = p_referred_id AND status = 'credited'
    ) THEN
      RETURN QUERY SELECT FALSE, 'already_credited', NULL::UUID, 0, 0;
    ELSE
      RETURN QUERY SELECT FALSE, 'no_pending_referral', NULL::UUID, 0, 0;
    END IF;
    RETURN;
  END IF;

  IF v_settings.referred_credits > 0 THEN
    PERFORM public.add_credit(
      p_referred_id,
      v_settings.referred_credits,
      'Referral bonus — referred by ' || v_ref.referrer_id::TEXT
    );
  END IF;

  IF v_settings.referrer_credits > 0 THEN
    PERFORM public.add_credit(
      v_ref.referrer_id,
      v_settings.referrer_credits,
      'Referral bonus — friend ' || p_referred_id::TEXT || ' completed first interview'
    );
  END IF;

  RETURN QUERY SELECT TRUE, NULL::TEXT, v_ref.referrer_id,
    v_settings.referrer_credits, v_settings.referred_credits;
END;
$$;

-- ── Lock down all new RPCs (Invariant #2 pattern) ────────────────────────────

REVOKE ALL ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_campaign_discount(TEXT, TEXT, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_campaign_code(UUID, TEXT, TEXT, INTEGER, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.release_campaign_reservation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_campaign_reservation(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_campaign_reservation(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.consume_campaign_redemption(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_campaign_redemption(UUID, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_campaign_redemption(UUID, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.apply_referral_bonus(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_referral_bonus(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_referral_bonus(UUID) TO service_role;

COMMIT;
