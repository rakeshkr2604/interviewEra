/**
 * Single switch for the product "Start Interview" entry point.
 *
 * Default: v2.1 script onboarding (`/interview/script/start`).
 * Rollback to v1: set `NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT=v1` in Vercel
 * (no code change) — CTAs resolve to `/onboarding`. Direct URLs
 * `/onboarding` and `/interview/new` remain reachable either way.
 *
 * See docs/FLAGS.md → `NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT`.
 */

export const SCRIPT_INTERVIEW_START_PATH = '/interview/script/start' as const
export const V1_ONBOARDING_START_PATH = '/onboarding' as const
/** Legacy short-form v1 start — kept reachable; not the default after cutover. */
export const V1_SHORT_START_PATH = '/interview/new' as const

export type InterviewEngineDefault = 'v2.1' | 'v1'

export function getInterviewEngineDefault(): InterviewEngineDefault {
  return process.env.NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT === 'v1' ? 'v1' : 'v2.1'
}

/** Path used by all primary Start Interview / practice-again CTAs. */
export function getDefaultInterviewStartPath(): string {
  return getInterviewEngineDefault() === 'v1'
    ? V1_ONBOARDING_START_PATH
    : SCRIPT_INTERVIEW_START_PATH
}

/** Absolute URL for emails / external links. */
export function getDefaultInterviewStartUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}${getDefaultInterviewStartPath()}`
}
