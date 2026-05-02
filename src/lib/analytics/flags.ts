/**
 * PostHog Feature Flag definitions for InterviewEra A/B tests.
 *
 * Flags are configured in PostHog Dashboard → Feature Flags.
 * Client-side: use `posthog.getFeatureFlag(FLAG.NAME)` (returns variant string or undefined).
 * Server-side: requires posthog-node (not yet installed — add when needed in Phase 3+).
 *
 * Current flags:
 *   free_credit_count   — control: "5" | variant: "7"
 *   first_interview_questions — control: "6" | variant: "4"
 */

import { posthog } from './posthog';

export const FLAGS = {
  FREE_CREDIT_COUNT: 'free_credit_count',
  FIRST_INTERVIEW_QUESTIONS: 'first_interview_questions',
} as const;

export type FlagName = (typeof FLAGS)[keyof typeof FLAGS];

/** Default values used when PostHog is unavailable or the flag is not enrolled. */
export const FLAG_DEFAULTS: Record<FlagName, string> = {
  [FLAGS.FREE_CREDIT_COUNT]: '5',
  [FLAGS.FIRST_INTERVIEW_QUESTIONS]: '6',
};

/**
 * Read a feature flag value client-side.
 * Returns the variant string, or the default if PostHog hasn't loaded or the flag is absent.
 */
export function getFlag(flag: FlagName): string {
  try {
    const value = posthog.getFeatureFlag(flag);
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
  } catch {
    // posthog-js may throw if called before init
  }
  return FLAG_DEFAULTS[flag];
}

/**
 * Read the first_interview_questions flag.
 * Returns 6 (control) or 4 (variant), clamped to valid range.
 *
 * A/B TEST NOTE — CLAUDE.md rule: "First interview ALWAYS: 6 questions"
 * This flag is an approved controlled experiment testing whether 4-question
 * first interviews improve completion rates vs the 6-question control.
 * Approved deviation from CLAUDE.md for analytics purposes only.
 * Review at Week 12 of Phase 3. Remove flag once test concludes.
 *
 * Guard: never allows fewer than 4 or more than 10 questions regardless of
 * what PostHog returns — PRD hard limits.
 */
export function getFirstInterviewQuestionCount(): number {
  const raw = getFlag(FLAGS.FIRST_INTERVIEW_QUESTIONS);
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return parseInt(FLAG_DEFAULTS[FLAGS.FIRST_INTERVIEW_QUESTIONS], 10);
  }
  // Hard clamp: minimum 4 (never below), maximum 10 (PRD hard limit)
  return Math.min(Math.max(parsed, 4), 10);
}
