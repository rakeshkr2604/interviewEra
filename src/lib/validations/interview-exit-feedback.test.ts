import { describe, it, expect } from 'vitest';
import {
  interviewExitFeedbackSubmitSchema,
  EXIT_REASON_OPTIONS,
  TECHNICAL_ISSUE_OPTIONS,
} from '@/lib/validations/interview-exit-feedback';

describe('interviewExitFeedbackSubmitSchema', () => {
  const validUuid = '11111111-2222-4333-8444-555555555555';

  it('validates a complete exit feedback submission with technical issue and comment', () => {
    const input = {
      interviewId: validUuid,
      exitReason: 'I ran into a technical problem',
      issueType: TECHNICAL_ISSUE_OPTIONS[0],
      comment: 'Microphone was echoing and cutting off.',
      questionIndex: 3,
      progressPercent: 30,
      engine: 'script',
      deviceInfo: { browser: 'Chrome', screen: '1920x1080' },
    };

    const parsed = interviewExitFeedbackSubmitSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.exitReason).toBe('I ran into a technical problem');
      expect(parsed.data.issueType).toBe(TECHNICAL_ISSUE_OPTIONS[0]);
      expect(parsed.data.comment).toBe('Microphone was echoing and cutting off.');
      expect(parsed.data.questionIndex).toBe(3);
      expect(parsed.data.progressPercent).toBe(30);
    }
  });

  it('validates a minimal exit feedback submission with only exitReason', () => {
    const input = {
      interviewId: validUuid,
      exitReason: 'I need to leave for a personal reason',
    };

    const parsed = interviewExitFeedbackSubmitSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.exitReason).toBe('I need to leave for a personal reason');
      expect(parsed.data.issueType).toBe('');
      expect(parsed.data.comment).toBe('');
      expect(parsed.data.engine).toBe('script');
    }
  });

  it('validates all canonical EXIT_REASON_OPTIONS', () => {
    for (const reason of EXIT_REASON_OPTIONS) {
      const parsed = interviewExitFeedbackSubmitSchema.safeParse({
        interviewId: validUuid,
        exitReason: reason,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('rejects empty exitReason', () => {
    const parsed = interviewExitFeedbackSubmitSchema.safeParse({
      interviewId: validUuid,
      exitReason: '',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid or missing interviewId', () => {
    expect(
      interviewExitFeedbackSubmitSchema.safeParse({
        exitReason: 'I need to leave for a personal reason',
      }).success,
    ).toBe(false);

    expect(
      interviewExitFeedbackSubmitSchema.safeParse({
        interviewId: 'not-a-valid-uuid',
        exitReason: 'I need to leave for a personal reason',
      }).success,
    ).toBe(false);
  });

  it('rejects comments exceeding 1000 characters', () => {
    const longComment = 'x'.repeat(1200);
    const parsed = interviewExitFeedbackSubmitSchema.safeParse({
      interviewId: validUuid,
      exitReason: 'Other',
      comment: longComment,
    });
    expect(parsed.success).toBe(false);
  });
});
