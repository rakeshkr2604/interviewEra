-- User-configurable email / product notification flags (email delivery wired incrementally in workers)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
