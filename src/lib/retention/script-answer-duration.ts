/**
 * V2.1 retention duration helpers — pure, no I/O.
 *
 * Authoritative answer timing is script_turns.answered_at (set when the
 * candidate submits via /api/interview/script/turn). Duration is
 * answered_at − created_at (question presented). Interviewer / closing /
 * warmup / CQ turns never contribute.
 *
 * Resumed sessions: a question presented days earlier then answered on resume
 * must NOT count idle calendar time. Samples above {@link MAX_RELIABLE_ANSWER_DURATION_SEC}
 * (or timer-based ceiling) are treated as missing evidence, not as long answers.
 */

/** Candidate answer markers that count as a real submission for retention. */
const COUNTED_SUBMITTED_AS = new Set(['raw', 'structured', 'timeout', 'auto_submit']);

/**
 * Absolute ceiling for a single answer. Multi-day resume gaps (observed
 * production: ~4.5e6 seconds) are excluded so idle time cannot inflate the mean
 * past the 45s quality floor.
 */
export const MAX_RELIABLE_ANSWER_DURATION_SEC = 30 * 60;

export type ScriptTurnDurationRow = {
  turn_index: number;
  phase: string | null;
  is_question: boolean | null;
  submitted_as: string | null;
  answer_text: string | null;
  created_at: string | null;
  answered_at: string | null;
  timer_seconds?: number | null;
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

/** Per-answer reliability ceiling: timer×3 (min 3m) when timer known, else global max. */
export function maxReliableDurationForTurn(turn: {
  timer_seconds?: number | null;
}): number {
  const timer = Number(turn.timer_seconds);
  if (Number.isFinite(timer) && timer > 0) {
    return Math.min(MAX_RELIABLE_ANSWER_DURATION_SEC, Math.max(180, Math.round(timer * 3)));
  }
  return MAX_RELIABLE_ANSWER_DURATION_SEC;
}

/**
 * Mean per-answer duration from question-presented → answer-submitted.
 * Missing/invalid/unreliable (resume-idle) pairs are skipped — never fabricated.
 * Returns 0 when no reliable pair exists so the session cannot auto-qualify.
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

    const durationSec = Math.max(0, Math.round((answeredAt - presentedAt) / 1000));
    const ceiling = maxReliableDurationForTurn(turn);
    // Resume / multi-visit idle gap — treat as missing timing evidence.
    if (durationSec > ceiling) continue;

    durations.push(durationSec);
  }
  if (durations.length === 0) return 0;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}
