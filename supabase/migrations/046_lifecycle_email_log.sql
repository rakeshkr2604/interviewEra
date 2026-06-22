-- Lightweight lifecycle email log + idempotency (sent-only unique keys)

CREATE TABLE IF NOT EXISTS public.lifecycle_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  template VARCHAR(100) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'resend',
  status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_message_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lifecycle_email_sent_idempotency
  ON public.lifecycle_email_log (idempotency_key)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS idx_lifecycle_email_log_user_template
  ON public.lifecycle_email_log (user_id, template);

COMMENT ON TABLE public.lifecycle_email_log IS
  'Transactional lifecycle email delivery log. Idempotency enforced for successful sends only.';
