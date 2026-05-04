/**
 * Feature-flag defaults for InterviewEra (MVP: no remote flag service).
 *
 * Previously read from PostHog client-side; that dependency was removed.
 * Re-introduce remote flags later via env or a server endpoint if needed.
 *
 * Flag keys kept for documentation:
 *   free_credit_count — was "5" | "7"
 *   first_interview_questions — was "6" (control) | "4" (variant)
 */

export const FLAGS = {
  FREE_CREDIT_COUNT: 'free_credit_count',
  FIRST_INTERVIEW_QUESTIONS: 'first_interview_questions',
} as const;

export type FlagName = (typeof FLAGS)[keyof typeof FLAGS];

/** Values used when no remote override is configured. */
export const FLAG_DEFAULTS: Record<FlagName, string> = {
  [FLAGS.FREE_CREDIT_COUNT]: '5',
  [FLAGS.FIRST_INTERVIEW_QUESTIONS]: '6',
};

/**
 * Read a feature-flag value (currently always the compile-time default).
 * Optional `NEXT_PUBLIC_*` override for first-interview count only.
 */
export function getFlag(flag: FlagName): string {
  if (
    flag === FLAGS.FIRST_INTERVIEW_QUESTIONS &&
    typeof process.env.NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS === 'string'
  ) {
    const raw = process.env.NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS.trim();
    if (/^\d+$/.test(raw)) return raw;
  }
  return FLAG_DEFAULTS[flag];
}

/**
 * First-interview question count: default 6, optional env override, clamped 4–10.
 */
export function getFirstInterviewQuestionCount(): number {
  const raw = getFlag(FLAGS.FIRST_INTERVIEW_QUESTIONS);
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return parseInt(FLAG_DEFAULTS[FLAGS.FIRST_INTERVIEW_QUESTIONS], 10);
  }
  return Math.min(Math.max(parsed, 4), 10);
}
