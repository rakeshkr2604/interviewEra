import { describe, expect, it } from 'vitest';
import {
  SCRIPT_ANSWER_MAX_CHARS,
  SCRIPT_DISPLAY_QUESTION_MAX_CHARS,
  SCRIPT_TARGET_ROLE_MAX_CHARS,
} from '@/lib/interview/script-input-limits';
import {
  answerScoreRequestSchema,
  autoStructureSchema,
  turnRequestSchema,
} from '@/lib/interview/script-turn-request-schema';

const IV = '11111111-1111-4111-8111-111111111111';

describe('turnRequestSchema', () => {
  const base = {
    interviewId: IV,
    currentPhase: 'core' as const,
    questionNumber: 1,
  };

  it('accepts empty and special-value answers', () => {
    expect(turnRequestSchema.safeParse({ ...base, lastAnswer: '' }).success).toBe(true);
    expect(turnRequestSchema.safeParse({ ...base, lastAnswer: '[NONE]' }).success).toBe(true);
    expect(turnRequestSchema.safeParse({ ...base, lastAnswer: '[SKIPPED]' }).success).toBe(true);
  });

  it('accepts a normal answer and exactly max length', () => {
    expect(turnRequestSchema.safeParse({ ...base, lastAnswer: 'I built an API.' }).success).toBe(
      true,
    );
    expect(
      turnRequestSchema.safeParse({
        ...base,
        lastAnswer: 'a'.repeat(SCRIPT_ANSWER_MAX_CHARS),
      }).success,
    ).toBe(true);
  });

  it('rejects answers over the max', () => {
    const r = turnRequestSchema.safeParse({
      ...base,
      lastAnswer: 'a'.repeat(SCRIPT_ANSWER_MAX_CHARS + 1),
    });
    expect(r.success).toBe(false);
  });

  it('rejects oversized sttRawTranscript', () => {
    const r = turnRequestSchema.safeParse({
      ...base,
      lastAnswer: 'ok',
      sttRawTranscript: 'b'.repeat(SCRIPT_ANSWER_MAX_CHARS + 1),
    });
    expect(r.success).toBe(false);
  });

  it('rejects extremely large payloads', () => {
    const r = turnRequestSchema.safeParse({
      ...base,
      lastAnswer: 'x'.repeat(500_000),
    });
    expect(r.success).toBe(false);
  });
});

describe('answerScoreRequestSchema', () => {
  const base = {
    interviewId: IV,
    turnIndex: 2,
    transcript: 'I used Redis for caching.',
    displayQuestion: 'How would you scale this?',
    targetRole: 'Software Engineer',
  };

  it('accepts valid score payloads', () => {
    expect(answerScoreRequestSchema.safeParse(base).success).toBe(true);
  });

  it('rejects oversized displayQuestion and targetRole', () => {
    expect(
      answerScoreRequestSchema.safeParse({
        ...base,
        displayQuestion: 'q'.repeat(SCRIPT_DISPLAY_QUESTION_MAX_CHARS + 1),
      }).success,
    ).toBe(false);
    expect(
      answerScoreRequestSchema.safeParse({
        ...base,
        targetRole: 'r'.repeat(SCRIPT_TARGET_ROLE_MAX_CHARS + 1),
      }).success,
    ).toBe(false);
  });
});

describe('autoStructureSchema', () => {
  it('rejects oversized rawTranscript', () => {
    const r = autoStructureSchema.safeParse({
      interviewId: IV,
      turnIndex: 1,
      rawTranscript: 't'.repeat(SCRIPT_ANSWER_MAX_CHARS + 1),
      displayQuestion: 'Tell me about a project.',
      targetRole: 'SDE',
      scriptType: 'SCRIPT_T',
    });
    expect(r.success).toBe(false);
  });
});
