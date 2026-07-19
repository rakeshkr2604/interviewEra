import { describe, expect, it } from 'vitest';
import { validateCategoryDistribution } from './validate';
import type { QgQuestion } from './schemas';

function makeQuestion(order: number, category: QgQuestion['category']): QgQuestion {
  return {
    order,
    question_text: `Question number ${order} about the topic in question, spanning enough characters.`,
    category,
    difficulty: 'medium',
    probing: 'Evaluates whether the candidate understands the underlying concept clearly.',
  };
}

function buildSet(categories: QgQuestion['category'][]): QgQuestion[] {
  return categories.map((category, i) => makeQuestion(i + 1, category));
}

const BALANCED_SET: QgQuestion['category'][] = [
  'technical',
  'technical',
  'technical',
  'technical',
  'behavioral',
  'behavioral',
  'behavioral',
  'situational',
  'situational',
  'situational',
];

const ALL_TECHNICAL_SET: QgQuestion['category'][] = Array.from(
  { length: 10 },
  () => 'technical' as const,
);

describe('validateCategoryDistribution — default (non-relaxed)', () => {
  it('accepts a set meeting the minimum ratios', () => {
    expect(validateCategoryDistribution(buildSet(BALANCED_SET))).toEqual({ ok: true });
  });

  it('rejects an empty set regardless of options', () => {
    expect(validateCategoryDistribution([])).toEqual({
      ok: false,
      message: 'Set contains no questions.',
    });
    expect(validateCategoryDistribution([], { relaxed: true })).toEqual({
      ok: false,
      message: 'Set contains no questions.',
    });
  });

  it('rejects a skewed set missing behavioral/situational coverage', () => {
    const result = validateCategoryDistribution(buildSet(ALL_TECHNICAL_SET));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('behavioral');
      expect(result.message).toContain('situational');
    }
  });
});

describe('validateCategoryDistribution — relaxed (topic mode)', () => {
  it('accepts an all-technical set when relaxed', () => {
    expect(validateCategoryDistribution(buildSet(ALL_TECHNICAL_SET), { relaxed: true })).toEqual({
      ok: true,
    });
  });

  it('still accepts a naturally balanced set when relaxed', () => {
    expect(validateCategoryDistribution(buildSet(BALANCED_SET), { relaxed: true })).toEqual({
      ok: true,
    });
  });
});
