/**
 * User-facing copy for quality-streak outcomes — derived from {@link evaluateQuality}
 * and {@link QUALITY_CRITERIA} (no hardcoded thresholds).
 */

import { QUALITY_CRITERIA } from './constants';
import { evaluateQuality, type QualityVerdict } from './streak-tracker';

/** Which criterion actually blocked the streak — drives which stat line the UI shows. */
export type FailedQualityCriterion = 'questions_answered' | 'avg_duration' | 'score';

export interface SessionQualityFeedback {
  qualityMet: false;
  headline: string;
  /**
   * The criterion that actually failed. Session score can be well above
   * minSessionScore while the streak still didn't extend (e.g. questions
   * skipped) — the UI must show the metric that matches this, not always
   * the score, or a high-scoring session reads as "your score was too low"
   * when it wasn't.
   */
  failedCriterion: FailedQualityCriterion;
  sessionScore: number;
  minSessionScore: number;
  questionsAnswered: number;
  totalQuestions: number;
  avgAnswerDurationSec: number;
  minAvgDurationSec: number;
  suggestion: string;
}

function pickFailedCriterion(verdict: QualityVerdict): FailedQualityCriterion {
  const { criteria } = verdict;
  if (!criteria.allQuestionsAnswered) return 'questions_answered';
  if (!criteria.durationOk) return 'avg_duration';
  return 'score';
}

function pickSuggestion(verdict: QualityVerdict): string {
  const { criteria } = verdict;
  if (!criteria.allQuestionsAnswered) {
    return 'Answer every question in the session — skipped questions do not earn XP.';
  }
  if (!criteria.durationOk) {
    return `Spend at least ${QUALITY_CRITERIA.minAvgDurationSec} seconds on average per answer so each response has enough depth.`;
  }
  if (!criteria.scoreOk) {
    return `Raise your session average to at least ${QUALITY_CRITERIA.minSessionScore}/10 with clearer structure and specific examples in each answer.`;
  }
  return 'Complete a full session with steady pacing and stronger answers to earn XP.';
}

export interface SessionQualityInput {
  sessionScore: number;
  questionsAnswered: number;
  totalQuestions: number;
  avgAnswerDurationSec: number;
}

/**
 * Builds dashboard/report notice payload when a session did not meet quality criteria.
 */
export function buildSessionQualityFeedback(
  verdict: QualityVerdict,
  session: SessionQualityInput,
): SessionQualityFeedback | null {
  if (verdict.passed) return null;

  return {
    qualityMet: false,
    headline:
      'Your streak is safe, but this session did not meet the quality threshold, so it earned no XP.',
    failedCriterion: pickFailedCriterion(verdict),
    sessionScore: session.sessionScore,
    minSessionScore: QUALITY_CRITERIA.minSessionScore,
    questionsAnswered: session.questionsAnswered,
    totalQuestions: session.totalQuestions,
    avgAnswerDurationSec: session.avgAnswerDurationSec,
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
  return buildSessionQualityFeedback(verdict, {
    sessionScore: Number(row.session_score),
    questionsAnswered: row.questions_answered,
    totalQuestions: row.total_questions,
    avgAnswerDurationSec: row.avg_answer_duration_sec,
  });
}
