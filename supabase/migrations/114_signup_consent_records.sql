-- Signup age eligibility + Terms/Privacy acceptance audit trail.
-- Self-declaration only — not verified identity. Never backfill true for existing users.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_version TEXT,
  ADD COLUMN IF NOT EXISTS privacy_accepted_version TEXT;

COMMENT ON COLUMN public.users.age_confirmed_at IS
  'Timestamp when the user self-declared age 18+ at signup. Not a verified identity check.';
COMMENT ON COLUMN public.users.terms_accepted_at IS
  'Timestamp of explicit Terms acceptance at signup (email or OAuth bridge).';
COMMENT ON COLUMN public.users.privacy_accepted_at IS
  'Timestamp of explicit Privacy Policy acceptance at signup.';
COMMENT ON COLUMN public.users.terms_accepted_version IS
  'Terms document version string accepted (see src/lib/legal/signup-consent.ts).';
COMMENT ON COLUMN public.users.privacy_accepted_version IS
  'Privacy Policy version string accepted (see src/lib/legal/signup-consent.ts).';
