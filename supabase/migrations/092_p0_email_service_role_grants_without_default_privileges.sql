-- Production follow-on to 090_p0_email_data_api_security_remediation.
--
-- 090 must NOT be executed on production as written: its
-- ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public would change
-- grants for future postgres-owned tables/functions, including service_role.
-- Production currently has no postgres/public pg_default_acl rows.
--
-- This file applies only the intended table-level service_role grants and
-- keeps browser roles denied. It does not rewrite 090 and does
-- not set default privileges.
--
-- Idempotent: ENABLE ROW LEVEL SECURITY, REVOKE, and GRANT are repeatable.

BEGIN;

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_opens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifecycle_email_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.email_preferences,
  public.email_events,
  public.email_jobs,
  public.email_logs,
  public.email_opens,
  public.email_clicks,
  public.email_metrics,
  public.lifecycle_email_log
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.email_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.email_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.email_jobs TO service_role;
GRANT INSERT ON TABLE public.email_logs TO service_role;
GRANT INSERT ON TABLE public.email_opens TO service_role;
GRANT INSERT ON TABLE public.email_clicks TO service_role;
GRANT SELECT ON TABLE public.email_metrics TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lifecycle_email_log TO service_role;

COMMIT;
