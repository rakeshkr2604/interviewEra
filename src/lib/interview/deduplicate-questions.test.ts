import { describe, expect, it } from 'vitest';
import { deduplicateQuestions, questionSimilarity } from '@/lib/interview/deduplicate-questions';

describe('deduplicateQuestions', () => {
  it('removes exact duplicates', () => {
    const input = [
      { question_text: 'Tell me about your React project.' },
      { question_text: 'Tell me about your React project.' },
      { question_text: 'How do you handle production incidents?' },
    ];
    const result = deduplicateQuestions(input);
    expect(result).toHaveLength(2);
    expect(result[0].order).toBe(0);
    expect(result[1].order).toBe(1);
  });

  it('removes near-duplicates via token similarity', () => {
    const input = [
      { question_text: 'Walk me through your experience with React hooks and state management.' },
      { question_text: 'Can you walk me through your React hooks and state management experience?' },
      { question_text: 'Describe a time you disagreed with your manager.' },
    ];
    const result = deduplicateQuestions(input);
    expect(result).toHaveLength(2);
  });

  it('preserves distinct questions', () => {
    const input = [
      { question_text: 'Explain REST vs GraphQL trade-offs.' },
      { question_text: 'Tell me about a conflict you resolved on your team.' },
      { question_text: 'How would you design a rate limiter?' },
    ];
    expect(deduplicateQuestions(input)).toHaveLength(3);
  });
});

describe('questionSimilarity', () => {
  it('returns 1 for identical normalized text', () => {
    expect(questionSimilarity('Hello world test', 'hello world test')).toBe(1);
  });

  it('returns low score for unrelated questions', () => {
    expect(
      questionSimilarity('Explain binary search complexity.', 'Tell me about your hobbies.'),
    ).toBeLessThan(0.3);
  });
});
