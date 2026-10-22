/**
 * Deterministic aggregation for v2.1 script-interview reports.
 * Consumes score-v1.2 answer_evaluations — never re-scores, never fabricates.
 */

import {
  DIMENSION_KEYS as ANSWER_SCORE_DIMENSION_KEYS,
  DIMENSION_WEIGHTS as ANSWER_SCORE_WEIGHTS,
  type DimensionKey,
} from '@/lib/interview/answer-score/rubric';

export type ScoredAnswerInput = {
  turnIndex: number;
  question: string;
  transcript: string;
  questionType: 'technical' | 'behavioral';
  overall: number;
  dimensions: Record<DimensionKey, { score: number; note?: string }>;
  promptVersion: string;
  scoreSuspect: boolean;
  oneLineSummary?: string | null;
  /** From script_turns.structured_answer.coaching_reference when present. */
  modelAnswerLines?: string[];
  /** Adaptive follow-up metadata — optional for legacy callers/tests. */
  isFollowUp?: boolean;
  parentTurnIndex?: number | null;
  coreSequence?: number;
  followUpSequence?: number | null;
};

export type ScoreBand = 'needs_work' | 'developing' | 'competitive' | 'strong';

export type PlacementSignal =
  | 'not_ready'
  | 'developing'
  | 'placement_competitive'
  | 'strong_signal';

/**
 * Below this count we still show real aggregates (never invented), but the UI
 * must caveat that the session sample is too thin for confident placement language.
 *
 * Reasoning: one answer's dimension vector equals the "session average" with no
 * cross-question signal; two is still fragile for hire-signal copy. Three scored
 * answers is the minimum where a mean starts to mean "session pattern" rather
 * than "this one answer."
 */
export const MIN_SCORED_ANSWERS_FOR_FULL_REPORT = 3;

export type PerQuestionReportRow = {
  turnIndex: number;
  question: string;
  questionType: 'technical' | 'behavioral';
  /**
   * Numeric score when evaluationStatus is 'scored'. Null when the answer
   * exists but scoring failed / never completed — never coerce to 0.
   */
  overall: number | null;
  dimensions: Record<DimensionKey, { score: number; note?: string }> | null;
  transcript: string;
  scoreSuspect: boolean;
  oneLineSummary: string | null;
  modelAnswerLines: string[];
  focusNote: string | null;
  /** Absent on legacy cached rows → treat as 'scored' when overall+dims present. */
  evaluationStatus?: 'scored' | 'unavailable';
  /** Absent on legacy cached rows → treat as core question. */
  isFollowUp?: boolean;
  parentTurnIndex?: number | null;
  /** 1-based index among core questions in the session. */
  coreSequence?: number;
  /** 1-based index among follow-ups under the same parent core. */
  followUpSequence?: number | null;
  /**
   * Optional deterministic answer-quality kind (e.g. question_echo).
   * Informational only — does not change session score math.
   */
  answerQualityKind?: string;
};

export type AggregatedScriptReport =
  | {
      kind: 'insufficient_data';
      scoredAnswerCount: 0;
      promptVersions: string[];
      perQuestion: [];
    }
  | {
      kind: 'scored';
      overall: number;
      dimensionAverages: Record<DimensionKey, number>;
      scoreBand: ScoreBand;
      placementSignal: PlacementSignal;
      /** Count of scored answers that entered the session average (core + follow-up). */
      scoredAnswerCount: number;
      /** Core questions among the scored inputs (excludes follow-ups). */
      scoredCoreCount: number;
      /** Adaptive follow-ups among the scored inputs. */
      scoredFollowUpCount: number;
      /** True when 1 ≤ count < MIN_SCORED_ANSWERS_FOR_FULL_REPORT */
      limitedData: boolean;
      promptVersions: string[];
      weakestDimensions: DimensionKey[];
      /**
       * Scored rows only — used for synthesis prompts and score math.
       * Full display (including unscored answers) is assembled in generate.ts.
       */
      perQuestion: PerQuestionReportRow[];
    };

const DIMENSION_LABEL: Record<DimensionKey, string> = {
  relevance: 'Relevance',
  content_accuracy: 'Content Accuracy',
  communication_clarity: 'Communication Clarity',
  structure: 'Answer Structure',
  specificity: 'Specificity',
};

export function dimensionLabel(key: DimensionKey): string {
  return DIMENSION_LABEL[key];
}

/** Arithmetic mean, rounded to 1 decimal. Empty input is a caller bug — never invent 5.0. */
export function meanScore(values: number[]): number {
  if (values.length === 0) {
    throw new Error('[script-report] meanScore called with empty values — refuse to fabricate');
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

/**
 * Weighted session overall from dimension averages using the same weights as
 * per-answer scoring — keeps report overall comparable to AnswerScoreCard.
 */
export function weightedOverall(dimAvgs: Record<DimensionKey, number>): number {
  let sum = 0;
  for (const key of ANSWER_SCORE_DIMENSION_KEYS) {
    sum += dimAvgs[key] * ANSWER_SCORE_WEIGHTS[key];
  }
  return Math.round(sum * 10) / 10;
}

export function scoreBandFor(overall: number): ScoreBand {
  if (overall < 4.5) return 'needs_work';
  if (overall < 6.5) return 'developing';
  if (overall < 8) return 'competitive';
  return 'strong';
}

export function placementSignalFor(overall: number): PlacementSignal {
  if (overall < 4.5) return 'not_ready';
  if (overall < 6.5) return 'developing';
  if (overall < 8) return 'placement_competitive';
  return 'strong_signal';
}

export function scoreBandLabel(band: ScoreBand): string {
  switch (band) {
    case 'needs_work':
      return 'Needs significant practice';
    case 'developing':
      return 'Developing';
    case 'competitive':
      return 'Competitive';
    case 'strong':
      return 'Strong';
  }
}

export function placementSignalLabel(signal: PlacementSignal): string {
  switch (signal) {
    case 'not_ready':
      return 'Not placement-ready yet';
    case 'developing':
      return 'Building toward placement readiness';
    case 'placement_competitive':
      return 'Placement-competitive on this session';
    case 'strong_signal':
      return 'Strong placement signal on this session';
  }
}

/** Honest disclaimer — we have no verified cross-candidate population. */
export const PLACEMENT_SIGNAL_DISCLAIMER =
  'Based on your score-band for this session only — not a percentile vs other candidates, and not a hiring guarantee.';

export const INSUFFICIENT_DATA_COPY =
  'Not enough data to generate a report. Approve and score at least one answer in a completed session before a report can be produced. No overall score is shown because nothing was measured.';

export function limitedDataCopy(scoredAnswerCount: number): string {
  return `Limited data: this report is based on only ${scoredAnswerCount} scored answer${
    scoredAnswerCount === 1 ? '' : 's'
  } (full-session confidence needs ${MIN_SCORED_ANSWERS_FOR_FULL_REPORT}+). Treat scores as directional, not a complete assessment.`;
}

export function aggregateScriptAnswers(answers: ScoredAnswerInput[]): AggregatedScriptReport {
  if (answers.length === 0) {
    return {
      kind: 'insufficient_data',
      scoredAnswerCount: 0,
      promptVersions: [],
      perQuestion: [],
    };
  }

  const dimensionAverages = {} as Record<DimensionKey, number>;
  for (const key of ANSWER_SCORE_DIMENSION_KEYS) {
    dimensionAverages[key] = meanScore(answers.map((a) => a.dimensions[key].score));
  }

  const overall = weightedOverall(dimensionAverages);
  const promptVersions = [...new Set(answers.map((a) => a.promptVersion).filter(Boolean))];

  const weakestDimensions = [...ANSWER_SCORE_DIMENSION_KEYS]
    .sort((a, b) => dimensionAverages[a] - dimensionAverages[b])
    .slice(0, 3);

  const scoredCoreCount = answers.filter((a) => a.isFollowUp !== true).length;
  const scoredFollowUpCount = answers.filter((a) => a.isFollowUp === true).length;

  const perQuestion: PerQuestionReportRow[] = answers.map((a) => {
    const weakKey = [...ANSWER_SCORE_DIMENSION_KEYS].sort(
      (x, y) => a.dimensions[x].score - a.dimensions[y].score,
    )[0]!;
    const weak = a.dimensions[weakKey];
    return {
      turnIndex: a.turnIndex,
      question: a.question,
      questionType: a.questionType,
      overall: a.overall,
      dimensions: a.dimensions,
      transcript: a.transcript,
      scoreSuspect: a.scoreSuspect,
      oneLineSummary: a.oneLineSummary ?? null,
      modelAnswerLines: a.modelAnswerLines ?? [],
      focusNote: weak?.note?.trim() || null,
      evaluationStatus: 'scored' as const,
      isFollowUp: a.isFollowUp === true,
      parentTurnIndex: a.parentTurnIndex ?? null,
      coreSequence: a.coreSequence,
      followUpSequence: a.followUpSequence ?? null,
    };
  });

  return {
    kind: 'scored',
    overall,
    dimensionAverages,
    scoreBand: scoreBandFor(overall),
    placementSignal: placementSignalFor(overall),
    scoredAnswerCount: answers.length,
    scoredCoreCount,
    scoredFollowUpCount,
    limitedData: answers.length < MIN_SCORED_ANSWERS_FOR_FULL_REPORT,
    promptVersions,
    weakestDimensions,
    perQuestion,
  };
}
