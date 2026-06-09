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
  UPGRADE_CTA: 'upgrade_cta',
  SEE_HOW_IT_WORKS: 'see_how_it_works',
  TOOL_CTA: 'tool_cta',
} as const;

export type CtaKey = (typeof CTA_KEYS)[keyof typeof CTA_KEYS];
