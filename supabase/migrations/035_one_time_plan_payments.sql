-- One-time monthly plan payments (replaces Razorpay Subscriptions).
-- Adds billing fields on users, payments ledger, migrates active subscriptions.

-- ─── User plan billing fields ───────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS last_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS last_order_id TEXT;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_status_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_plan_status_check
  CHECK (plan_status IN ('none', 'active', 'expired', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_users_plan_expires_at
  ON public.users (plan_expires_at)
  WHERE plan_tier IN ('starter', 'pro') AND plan_status = 'active';

-- ─── Payments ledger ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  payment_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'paid', 'failed', 'refunded')),
  plan public.plan_tier NOT NULL,
  gateway TEXT NOT NULL DEFAULT 'razorpay',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_order_id_unique UNIQUE (order_id),
  CONSTRAINT payments_payment_id_unique UNIQUE (payment_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_created_at ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments (status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

-- Table-level GRANTs (001's blanket GRANT does not apply to tables created after 001).
GRANT SELECT, INSERT, UPDATE ON public.payments TO service_role;
GRANT SELECT ON public.payments TO authenticated;

DROP POLICY IF EXISTS payments_service_role_full ON public.payments;
CREATE POLICY payments_service_role_full ON public.payments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── Migrate active subscriptions → plan_expires_at ───────────────────────────

UPDATE public.users u
SET
  plan_started_at = COALESCE(u.plan_started_at, s.current_period_start),
  plan_expires_at = s.current_period_end,
  plan_status = CASE
    WHEN s.current_period_end IS NOT NULL AND s.current_period_end > NOW() THEN 'active'
    ELSE 'expired'
  END
FROM public.subscriptions s
WHERE s.user_id = u.id
  AND s.status = 'active'
  AND u.plan_tier IN ('starter', 'pro')
  AND u.plan_expires_at IS NULL;

-- Free users with no paid history
UPDATE public.users
SET plan_status = 'none'
WHERE plan_tier = 'free' AND plan_status = 'none';
