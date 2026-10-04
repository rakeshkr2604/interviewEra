/**
 * Server-side input ceilings for v2.1 script interview LLM routes.
 * Reject oversized payloads at the Zod boundary before persistence / model calls.
 *
 * Limits are intentionally above typical spoken-answer lengths and aligned with
 * operation-registry context budgets (answer_score / auto_structure).
 */

/** Max chars for a candidate answer / STT transcript on script turn + score paths. */
export const SCRIPT_ANSWER_MAX_CHARS = 12_000;

/** Max chars for the displayed interviewer question sent with score/structure requests. */
export const SCRIPT_DISPLAY_QUESTION_MAX_CHARS = 2_000;

/** Max chars for target role strings on score/structure requests (matches interview start). */
export const SCRIPT_TARGET_ROLE_MAX_CHARS = 100;
