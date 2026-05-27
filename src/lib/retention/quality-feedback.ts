/**
 * User-facing copy for quality-streak outcomes — derived from {@link evaluateQuality}
 * and {@link QUALITY_CRITERIA} (no hardcoded thresholds).
 */

import { QUALITY_CRITERIA } from './constants';
import { evaluateQuality, type QualityVerdict } from './streak-tracker';

export interface SessionQualityFeedback {
  qualityMet: false;
  headline: string;
  sessionScore: number;
  minSessionScore: number;
  minAvgDurationSec: number;
  suggestion: string;
}

function pickSuggestion(verdict: QualityVerdict): string {
  const { criteria } = verdict;
  if (!criteria.allQuestionsAnswered) {
    return 'Answer every question in the session — skipped or incomplete sets do not count toward your streak.';
  }
  if (!criteria.durationOk) {
    return `Spend at least ${QUALITY_CRITERIA.minAvgDurationSec} seconds on average per answer so each response has enough depth.`;
  }
  if (!criteria.scoreOk) {
    return `Raise your session average to at least ${QUALITY_CRITERIA.minSessionScore}/10 with clearer structure and specific examples in each answer.`;
  }
  return 'Complete a full session with steady pacing and stronger answers to extend your streak.';
}

/**
 * Builds dashboard/report notice payload when a session did not meet quality criteria.
 */
export function buildSessionQualityFeedback(
  verdict: QualityVerdict,
  sessionScore: number,
): SessionQualityFeedback | null {
  if (verdict.passed) return null;

  return {
    qualityMet: false,
    headline:
      'This session did not meet the minimum interview quality threshold, so your streak was not extended.',
    sessionScore,
    minSessionScore: QUALITY_CRITERIA.minSessionScore,
    minAvgDurationSec: QUALITY_CRITERIA.minAvgDurationSec,
    suggestion: pickSuggestion(verdict),
  };
}

/** Reconstruct notice from a persisted `session_quality_log` row (report/dashboard). */
export function sessionQualityFeedbackFromLogRow(row: {
  interview_id: string;
  session_score: number;
  questions_answered: number;
  total_questions: number;
  avg_answer_duration_sec: number;
  quality_met: boolean;
}): SessionQualityFeedback | null {
  if (row.quality_met) return null;
  const verdict = evaluateQuality({
    interviewId: row.interview_id,
    questionsAnswered: row.questions_answered,
    totalQuestions: row.total_questions,
    avgAnswerDurationSec: row.avg_answer_duration_sec,
    sessionScore: Number(row.session_score),
  });
  return buildSessionQualityFeedback(verdict, Number(row.session_score));
}
