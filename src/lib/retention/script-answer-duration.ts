/**
 * V2.1 retention duration helpers — pure, no I/O.
 *
 * Authoritative answer timing is script_turns.answered_at (set when the
 * candidate submits via /api/interview/script/turn). Duration is
 * answered_at − created_at (question presented). Interviewer / closing /
 * warmup / CQ turns never contribute.
 */

/** Candidate answer markers that count as a real submission for retention. */
const COUNTED_SUBMITTED_AS = new Set(['raw', 'structured', 'timeout', 'auto_submit']);

export type ScriptTurnDurationRow = {
  turn_index: number;
  phase: string | null;
  is_question: boolean | null;
  submitted_as: string | null;
  answer_text: string | null;
  created_at: string | null;
  answered_at: string | null;
  llm_output: unknown;
  structured_answer?: unknown;
};

/**
 * Core parent questions (not warmup / CQ / follow-ups) that received a real
 * candidate submission. Skips do not count toward questionsAnswered.
 */
export function selectCoreAnsweredTurns(
  turns: readonly ScriptTurnDurationRow[],
): ScriptTurnDurationRow[] {
  return turns.filter((turn) => {
    if (turn.phase !== 'core') return false;
    if (turn.is_question !== true) return false;
    if (!turn.submitted_as || !COUNTED_SUBMITTED_AS.has(turn.submitted_as)) return false;
    const llm = turn.llm_output as { is_follow_up?: unknown } | null;
    if (llm && llm.is_follow_up === true) return false;
    const answer = typeof turn.answer_text === 'string' ? turn.answer_text.trim() : '';
    if (!answer || answer === '[SKIPPED]' || answer === '[NONE]') return false;
    return true;
  });
}

/**
 * Mean per-answer duration from question-presented → answer-submitted.
 * Missing/invalid answered_at values are skipped (never fabricated). Returns 0
 * when no reliable pair exists so the session cannot auto-qualify on duration.
 */
export function computeScriptAvgAnswerDurationSec(
  turns: readonly ScriptTurnDurationRow[],
): number {
  const answered = selectCoreAnsweredTurns(turns);
  const durations: number[] = [];
  for (const turn of answered) {
    const answeredAt =
      typeof turn.answered_at === 'string' && Number.isFinite(Date.parse(turn.answered_at))
        ? Date.parse(turn.answered_at)
        : null;
    if (answeredAt === null) continue;

    const presentedAt =
      typeof turn.created_at === 'string' && Number.isFinite(Date.parse(turn.created_at))
        ? Date.parse(turn.created_at)
        : null;
    if (presentedAt === null || answeredAt < presentedAt) continue;

    durations.push(Math.max(0, Math.round((answeredAt - presentedAt) / 1000)));
  }
  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}
