/**
 * Single switch for the product "Start Interview" entry point.
 *
 * Always returns the v2.1 script path. Legacy v1 entry routes
 * (`/onboarding`, `/interview/new`) redirect here; the
 * `NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT` flag is retired.
 */

export const SCRIPT_INTERVIEW_START_PATH = '/interview/script/start' as const

/** @deprecated Retired — redirects to SCRIPT_INTERVIEW_START_PATH. */
export const V1_ONBOARDING_START_PATH = '/onboarding' as const
/** @deprecated Retired — redirects to SCRIPT_INTERVIEW_START_PATH. */
export const V1_SHORT_START_PATH = '/interview/new' as const

/** Path used by all primary Start Interview / practice-again CTAs. */
export function getDefaultInterviewStartPath(): string {
  return SCRIPT_INTERVIEW_START_PATH
}

/** Absolute URL for emails / external links. */
export function getDefaultInterviewStartUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${getDefaultInterviewStartPath()}`
}
