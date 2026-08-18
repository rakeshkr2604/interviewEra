-- P0: close direct Data API access to internal email tables.
--
-- These tables are server-owned. Browser roles have no direct table access;
-- service_role receives only the operations used by the application.
-- RLS remains intentionally policy-free so non-bypass roles deny by default.

BEGIN;

REVOKE ALL ON TABLE
  public.email_preferences,
  public.email_events,
  public.email_jobs,
  public.email_logs,
  public.email_opens,
  public.email_clicks,
  public.email_metrics,
  public.lifecycle_email_log
FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_email_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.email_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.email_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.email_jobs TO service_role;
GRANT INSERT ON TABLE public.email_logs TO service_role;
GRANT INSERT ON TABLE public.email_opens TO service_role;
GRANT INSERT ON TABLE public.email_clicks TO service_role;
GRANT SELECT ON TABLE public.email_metrics TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lifecycle_email_log TO service_role;

-- Supabase-supported opt-in defaults for objects subsequently created by the
-- postgres role in public. Explicit grants must accompany future migrations.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES
  FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE USAGE, SELECT ON SEQUENCES
  FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
