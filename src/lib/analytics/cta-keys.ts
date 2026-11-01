/**
 * Stable CTA identifiers for reporting (low GA4 cardinality).
 * Use cta_key in dashboards; cta_text is display-only.
 */

export const CTA_KEYS = {
  START_FREE_INTERVIEW: 'start_free_interview',
  START_MOCK_INTERVIEW: 'start_mock_interview',
  GET_STARTED: 'get_started',
  SIGN_UP: 'sign_up',
  PRICING_CTA: 'pricing_cta',
  COMPARE_PLANS: 'compare_plans',
  LAUNCH_OFFER: 'launch_offer',
  UPGRADE_CTA: 'upgrade_cta',
  SEE_HOW_IT_WORKS: 'see_how_it_works',
  SEE_SAMPLE_REPORT: 'see_sample_report',
  TOOL_CTA: 'tool_cta',
  FOR_COLLEGES: 'for_colleges',
  FOR_TEAMS: 'for_teams',
  CAMPUS_WORKSPACE: 'campus_workspace',
  AUDIENCE_STUDENTS: 'audience_students',
  AUDIENCE_COLLEGES: 'audience_colleges',
  AUDIENCE_HIRING_TEAMS: 'audience_hiring_teams',
} as const;

export type CtaKey = (typeof CTA_KEYS)[keyof typeof CTA_KEYS];
