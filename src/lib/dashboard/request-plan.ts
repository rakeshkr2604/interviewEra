/**
 * Static dashboard request plan (query units, not wall-clock).
 *
 * Layout work is on the HTML TTFB critical path. The two-wave page loader
 * runs inside Suspense after the shell streams, so it should not add to
 * document TTFB when streaming works.
 */

export const DASHBOARD_LAYOUT_QUERY_UNITS = [
  'auth.getUser',
  'users',
  'user_progress',
  'platformAdmin',
  'coachAccess',
] as const

export const DASHBOARD_WAVE1_QUERY_UNITS = [
  'users.cached',
  'user_progress.cached',
  'interviews.recent20',
  'interviews.completedCount',
  'recovery.active',
  'recovery.abandoned',
  'resumes',
  'enrollment',
] as const

export const DASHBOARD_WAVE2_QUERY_UNITS = [
  'script_interview_reports',
  'campus_organizations',
  'retention.tierConfig',
  'retention.sessionQuality',
  'retention.weeklyCount',
] as const

export type DashboardRequestPlan = {
  ttfbBlocking: typeof DASHBOARD_LAYOUT_QUERY_UNITS
  wave1: typeof DASHBOARD_WAVE1_QUERY_UNITS
  wave2: typeof DASHBOARD_WAVE2_QUERY_UNITS
  snapshotAfterPrefetch: []
  notes: {
    recoveryAbandoned: string
    platformAdmin: string
    coachAccess: string
    snapshot: string
  }
}

export function describeDashboardRequestPlan(): DashboardRequestPlan {
  return {
    ttfbBlocking: DASHBOARD_LAYOUT_QUERY_UNITS,
    wave1: DASHBOARD_WAVE1_QUERY_UNITS,
    wave2: DASHBOARD_WAVE2_QUERY_UNITS,
    snapshotAfterPrefetch: [],
    notes: {
      recoveryAbandoned:
        'fetchPrimaryRecoveryInterview runs abandoned only when no resumable active row exists — sequential, inside wave 1.',
      platformAdmin:
        'Email allowlist short-circuits; otherwise one service-role users.platform_role read.',
      coachAccess:
        'Redis GET for mode. Extra admin/allowlist work only when mode is not disabled/public.',
      snapshot: 'Prefetched dashboard bag must produce zero additional snapshot DB reads.',
    },
  }
}
