/**
 * Unit tests for v2.1 script report aggregation (no Confidence, no fabricated scores).
 */

import { describe, expect, it } from 'vitest';
import {
  MIN_SCORED_ANSWERS_FOR_FULL_REPORT,
  aggregateScriptAnswers,
  meanScore,
  placementSignalFor,
  scoreBandFor,
  weightedOverall,
  type ScoredAnswerInput,
} from '@/lib/interview/script-report/aggregate';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';

function dims(
  scores: Partial<Record<DimensionKey, number>>,
): ScoredAnswerInput['dimensions'] {
  const out = {} as ScoredAnswerInput['dimensions'];
  for (const key of DIMENSION_KEYS) {
    out[key] = { score: scores[key] ?? 5, note: `${key} note` };
  }
  return out;
}

function answer(
  partial: Partial<ScoredAnswerInput> & { turnIndex: number },
): ScoredAnswerInput {
  return {
    question: 'Q?',
    transcript: 'A long enough answer for testing.',
    questionType: 'behavioral',
    overall: 6,
    dimensions: dims({}),
    promptVersion: 'score-v1.2',
    scoreSuspect: false,
    ...partial,
  };
}

describe('script-report aggregate', () => {
  it('returns insufficient_data with no numeric overall when zero scored answers', () => {
    const agg = aggregateScriptAnswers([]);
    expect(agg.kind).toBe('insufficient_data');
    if (agg.kind !== 'insufficient_data') return;
    expect(agg.scoredAnswerCount).toBe(0);
    expect(agg.perQuestion).toEqual([]);
    expect(agg).not.toHaveProperty('overall');
  });

  it('marks limitedData when scored count is below the full-report threshold', () => {
    expect(MIN_SCORED_ANSWERS_FOR_FULL_REPORT).toBe(3);
    const one = aggregateScriptAnswers([answer({ turnIndex: 0 })]);
    expect(one.kind).toBe('scored');
    if (one.kind !== 'scored') return;
    expect(one.limitedData).toBe(true);
    expect(one.scoredAnswerCount).toBe(1);
    expect(one.scoredCoreCount).toBe(1);
    expect(one.scoredFollowUpCount).toBe(0);

    const two = aggregateScriptAnswers([
      answer({ turnIndex: 0 }),
      answer({ turnIndex: 1 }),
    ]);
    expect(two.kind).toBe('scored');
    if (two.kind !== 'scored') return;
    expect(two.limitedData).toBe(true);

    const three = aggregateScriptAnswers([
      answer({ turnIndex: 0 }),
      answer({ turnIndex: 1 }),
      answer({ turnIndex: 2 }),
    ]);
    expect(three.kind).toBe('scored');
    if (three.kind !== 'scored') return;
    expect(three.limitedData).toBe(false);
  });

  it('counts follow-ups separately without changing equal-weight average policy', () => {
    const agg = aggregateScriptAnswers([
      answer({ turnIndex: 2, overall: 8, isFollowUp: false }),
      answer({ turnIndex: 3, overall: 4, isFollowUp: true, parentTurnIndex: 2 }),
    ]);
    expect(agg.kind).toBe('scored');
    if (agg.kind !== 'scored') return;
    expect(agg.scoredAnswerCount).toBe(2);
    expect(agg.scoredCoreCount).toBe(1);
    expect(agg.scoredFollowUpCount).toBe(1);
    expect(agg.perQuestion[1]!.isFollowUp).toBe(true);
    expect(agg.perQuestion[1]!.parentTurnIndex).toBe(2);
  });

  it('means per dimension and weights overall like score-v1.2', () => {
    const a = answer({
      turnIndex: 0,
      dimensions: dims({
        relevance: 8,
        content_accuracy: 6,
        communication_clarity: 7,
        structure: 5,
        specificity: 4,
      }),
    });
    const b = answer({
      turnIndex: 1,
      dimensions: dims({
        relevance: 6,
        content_accuracy: 8,
        communication_clarity: 5,
        structure: 7,
        specificity: 6,
      }),
      promptVersion: 'score-v1.2',
    });
    const agg = aggregateScriptAnswers([a, b]);
    expect(agg.kind).toBe('scored');
    if (agg.kind !== 'scored') return;
    expect(agg.dimensionAverages.relevance).toBe(7);
    expect(agg.dimensionAverages.content_accuracy).toBe(7);
    expect(agg.overall).toBe(weightedOverall(agg.dimensionAverages));
    expect(agg.promptVersions).toEqual(['score-v1.2']);
    expect(agg.weakestDimensions[0]).toBe('specificity');
  });

  it('maps score bands without inventing percentiles', () => {
    expect(scoreBandFor(3)).toBe('needs_work');
    expect(scoreBandFor(5)).toBe('developing');
    expect(scoreBandFor(7)).toBe('competitive');
    expect(scoreBandFor(9)).toBe('strong');
    expect(placementSignalFor(7)).toBe('placement_competitive');
  });

  it('meanScore refuses empty input instead of fabricating 5.0', () => {
    expect(() => meanScore([])).toThrow(/refuse to fabricate/);
    expect(meanScore([5, 6, 7])).toBe(6);
    expect(meanScore([5, 5.5])).toBe(5.3);
  });
});
