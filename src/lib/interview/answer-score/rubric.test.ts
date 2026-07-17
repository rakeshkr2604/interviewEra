import { describe, expect, it } from 'vitest';
import {
  computeOverall,
  findContradictions,
  noteCriticizes,
  notePraises,
  subRubricForQuestionType,
  validateAnswerScoreOutput,
  DIMENSION_WEIGHTS,
  type DimensionKey,
  type ScoredDimension,
} from './rubric';

function dims(
  scores: Partial<Record<DimensionKey, number>>,
  notes?: Partial<Record<DimensionKey, string>>,
): Record<DimensionKey, ScoredDimension> {
  const base: Record<DimensionKey, ScoredDimension> = {
    relevance: { score: 7, note: 'addresses the question directly' },
    content_accuracy: { score: 7, note: 'claims are technically sound' },
    communication_clarity: { score: 7, note: 'point lands clearly' },
    structure: { score: 7, note: 'follows a clear arc' },
    specificity: { score: 7, note: 'names concrete tools and outcomes' },
  };
  for (const [k, v] of Object.entries(scores)) {
    base[k as DimensionKey].score = v as number;
  }
  for (const [k, v] of Object.entries(notes ?? {})) {
    base[k as DimensionKey].note = v as string;
  }
  return base;
}

function llmOutput(overrides?: {
  scores?: Partial<Record<DimensionKey, number>>;
  notes?: Partial<Record<DimensionKey, string>>;
  sub_rubric?: string;
}) {
  return {
    sub_rubric: overrides?.sub_rubric ?? 'logical_flow',
    dimensions: dims(overrides?.scores ?? {}, overrides?.notes),
    one_line_summary: 'Add a concrete outcome to the example.',
  };
}

describe('subRubricForQuestionType', () => {
  it('routes behavioral → star, technical → logical_flow', () => {
    expect(subRubricForQuestionType('behavioral')).toBe('star');
    expect(subRubricForQuestionType('technical')).toBe('logical_flow');
  });
});

describe('computeOverall', () => {
  it('weights sum to 1.0', () => {
    const total = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });

  it('computes the approved weighted mean (accuracy 0.30 dominant)', () => {
    const d = dims({
      relevance: 10,
      content_accuracy: 0,
      communication_clarity: 10,
      structure: 10,
      specificity: 10,
    });
    // 10*0.2 + 0*0.3 + 10*0.15 + 10*0.15 + 10*0.2 = 7.0
    expect(computeOverall(d)).toBe(7.0);
  });

  it('rounds to one decimal', () => {
    const d = dims({
      relevance: 7.5,
      content_accuracy: 6.5,
      communication_clarity: 8,
      structure: 5.5,
      specificity: 7,
    });
    // 1.5 + 1.95 + 1.2 + 0.825 + 1.4 = 6.875 → 6.9
    expect(computeOverall(d)).toBe(6.9);
  });
});

describe('noteCriticizes / notePraises (clause-aware negation)', () => {
  it('reads unnegated negative-quality words as criticism', () => {
    expect(noteCriticizes('the explanation of indexing is incorrect')).toBe(true);
    expect(noteCriticizes('claims are vague and generic')).toBe(true);
    expect(noteCriticizes('answer contradicts itself on the conflict claim')).toBe(true);
  });

  it('reads negated negative-quality words as praise, not criticism', () => {
    expect(noteCriticizes('clear answer, no missing elements')).toBe(false);
    expect(noteCriticizes('point lands without rambling')).toBe(false);
    expect(noteCriticizes('no errors in the technical claims')).toBe(false);
  });

  it('reads negated positive-quality words as criticism', () => {
    expect(noteCriticizes('the central point is not clear')).toBe(true);
    expect(noteCriticizes('no concrete specifics offered')).toBe(true);
    expect(noteCriticizes('never addresses the question asked')).toBe(true);
  });

  it('reads off-topic as criticism regardless of surrounding words', () => {
    expect(noteCriticizes('details are concrete but entirely off-topic')).toBe(true);
  });

  it('notePraises requires an unnegated positive-quality word', () => {
    expect(notePraises('excellent well structured STAR arc')).toBe(true);
    expect(notePraises('the point is not clear')).toBe(false);
  });

  it('hedged praise does not count as praise', () => {
    expect(notePraises('only superficially addresses the question')).toBe(false);
    expect(notePraises('partially relevant to the question asked')).toBe(false);
  });
});

describe('findContradictions', () => {
  it('flags negative note with score >= 8', () => {
    const d = dims(
      { content_accuracy: 9 },
      { content_accuracy: 'the explanation of indexing is incorrect' },
    );
    expect(findContradictions(d)).toEqual(['note_contradicts_high_score:content_accuracy']);
  });

  it('flags praise note with score <= 3', () => {
    const d = dims({ structure: 2 }, { structure: 'excellent well-structured STAR arc' });
    expect(findContradictions(d)).toEqual(['note_contradicts_low_score:structure']);
  });

  it('does not flag consistent note/score pairs', () => {
    const d = dims(
      { specificity: 2 },
      { specificity: 'vague generic claims with no examples' },
    );
    expect(findContradictions(d)).toEqual([]);
  });

  it('does not flag a 3 whose note names the one present element (anchor-consistent)', () => {
    const d = dims(
      { specificity: 3 },
      { specificity: 'one concrete example named, rest generic' },
    );
    expect(findContradictions(d)).toEqual([]);
  });

  it('does not flag clarity 10 whose note criticizes only relevance ("clear but off-topic")', () => {
    const d = dims(
      { communication_clarity: 10 },
      { communication_clarity: 'very clear delivery but content entirely off-topic and irrelevant' },
    );
    expect(findContradictions(d)).toEqual([]);
  });

  it('does not flag specificity 0 with praise note when relevance is 0 (hard-rule artifact)', () => {
    const d = dims(
      { relevance: 0, specificity: 0 },
      {
        relevance: 'entirely off-topic; never engages the question',
        specificity: 'concrete details about the tech fest, but all off the question',
      },
    );
    expect(findContradictions(d)).toEqual([]);
  });

  it('still flags specificity 0 with praise note when the answer is on-topic', () => {
    const d = dims(
      { relevance: 7, specificity: 0 },
      { specificity: 'concrete book index analogy supports the point' },
    );
    expect(findContradictions(d)).toEqual(['note_contradicts_low_score:specificity']);
  });

  it('does not flag high scores whose notes contain benign negation (v1 false positive)', () => {
    const d = dims(
      { content_accuracy: 9.5, communication_clarity: 9 },
      {
        content_accuracy: 'technically sound, no errors or misconceptions',
        communication_clarity: 'point lands clearly without rambling',
      },
    );
    expect(findContradictions(d)).toEqual([]);
  });
});

describe('validateAnswerScoreOutput', () => {
  it('accepts a valid payload and computes overall in app code', () => {
    const result = validateAnswerScoreOutput(llmOutput(), 'logical_flow');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.overall).toBe(7.0);
      expect(result.value.score_suspect).toBe(false);
    }
  });

  it('ignores any overall the LLM tries to inject', () => {
    const payload = { ...llmOutput(), overall: 10 };
    const result = validateAnswerScoreOutput(payload, 'logical_flow');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.overall).toBe(7.0);
  });

  it('rejects out-of-range scores', () => {
    const result = validateAnswerScoreOutput(
      llmOutput({ scores: { relevance: 11 } }),
      'logical_flow',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/relevance/);
  });

  it('rejects scores not in steps of 0.5', () => {
    const result = validateAnswerScoreOutput(
      llmOutput({ scores: { structure: 6.3 } }),
      'logical_flow',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/multiple of 0\.5/);
  });

  it('rejects sub_rubric mismatch against routed question type', () => {
    const result = validateAnswerScoreOutput(llmOutput({ sub_rubric: 'star' }), 'logical_flow');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/sub_rubric/);
  });

  it('rejects structurally malformed output', () => {
    const result = validateAnswerScoreOutput({ dimensions: {} }, 'star');
    expect(result.ok).toBe(false);
  });

  it('flags contradictions as score_suspect but still returns the score', () => {
    const result = validateAnswerScoreOutput(
      llmOutput({
        scores: { content_accuracy: 9 },
        notes: { content_accuracy: 'core claim about indexing is wrong' },
      }),
      'logical_flow',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.score_suspect).toBe(true);
      expect(result.value.suspect_reasons).toContain(
        'note_contradicts_high_score:content_accuracy',
      );
      expect(result.value.overall).toBeGreaterThan(0);
    }
  });

  it('clamps specificity to 0 when relevance is 0 (off-topic hard rule, enforced in code)', () => {
    const result = validateAnswerScoreOutput(
      llmOutput({ scores: { relevance: 0, specificity: 5 } }),
      'logical_flow',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.dimensions.specificity.score).toBe(0);
      expect(result.value.dimensions.specificity.note).toMatch(/clamped to 0/);
      // overall reflects the clamped value: 0*0.2 + 7*0.3 + 7*0.15 + 7*0.15 + 0*0.2 = 4.2
      expect(result.value.overall).toBe(4.2);
    }
  });

  it('leaves specificity untouched when relevance is above 0', () => {
    const result = validateAnswerScoreOutput(
      llmOutput({ scores: { relevance: 3, specificity: 5 } }),
      'logical_flow',
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.dimensions.specificity.score).toBe(5);
  });

  it('appends low_stt_confidence to suspect reasons when flagged', () => {
    const result = validateAnswerScoreOutput(llmOutput(), 'logical_flow', {
      lowSttConfidence: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.score_suspect).toBe(true);
      expect(result.value.suspect_reasons).toContain('low_stt_confidence');
    }
  });
});
