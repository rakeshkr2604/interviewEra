-- InterviewEra — Email Automation & Lifecycle Engine Schema
-- Phase 2 Week 11-12: Full transactional orchestration

-- 1. Preferences Table
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  weekly_reports BOOLEAN NOT NULL DEFAULT true,
  product_updates BOOLEAN NOT NULL DEFAULT true,
  marketing BOOLEAN NOT NULL DEFAULT true,
  achievements BOOLEAN NOT NULL DEFAULT true,
  interview_reminders BOOLEAN NOT NULL DEFAULT true,
  security_emails BOOLEAN NOT NULL DEFAULT true, -- mandatory transactional overrides
  unsubscribed_all BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Events Trigger
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Queue Jobs
CREATE TABLE IF NOT EXISTS public.email_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.email_events(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, sent, failed, cancelled, dlq
  retry_count INTEGER DEFAULT 0 NOT NULL,
  next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  error_message TEXT,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Audit logs for retries
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.email_jobs(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Open tracking logs
CREATE TABLE IF NOT EXISTS public.email_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.email_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Click tracking logs
CREATE TABLE IF NOT EXISTS public.email_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.email_jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_url TEXT NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Analytics aggregation cache
CREATE TABLE IF NOT EXISTS public.email_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL UNIQUE,
  sent_count INTEGER DEFAULT 0 NOT NULL,
  delivered_count INTEGER DEFAULT 0 NOT NULL,
  opened_count INTEGER DEFAULT 0 NOT NULL,
  clicked_count INTEGER DEFAULT 0 NOT NULL,
  bounced_count INTEGER DEFAULT 0 NOT NULL,
  spam_count INTEGER DEFAULT 0 NOT NULL,
  unsubscribe_count INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_jobs_status_attempt ON public.email_jobs(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_email_jobs_user ON public.email_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_events_unprocessed ON public.email_events(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_email_clicks_job ON public.email_clicks(job_id);
CREATE INDEX IF NOT EXISTS idx_email_opens_job ON public.email_opens(job_id);

-- RPC for incrementing stats
CREATE OR REPLACE FUNCTION public.increment_email_metric(t_name text, metric_column text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.email_metrics (template_name)
  VALUES (t_name)
  ON CONFLICT (template_name) DO NOTHING;
  
  EXECUTE format('UPDATE public.email_metrics SET %I = %I + 1, updated_at = now() WHERE template_name = $1', metric_column, metric_column)
  USING t_name;
END;
$$;
