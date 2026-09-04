import { describe, it, expect } from 'vitest';
import {
  interviewFeedbackSubmitSchema,
  LIKED_ASPECT_OPTIONS,
  ISSUE_TYPE_OPTIONS,
} from '@/lib/validations/interview-feedback';

describe('interviewFeedbackSubmitSchema', () => {
  const validUuid = '11111111-2222-4333-8444-555555555555';

  it('validates a correct feedback submission with all fields', () => {
    const input = {
      interviewId: validUuid,
      rating: 5,
      likedAspect: LIKED_ASPECT_OPTIONS[0],
      issueType: ISSUE_TYPE_OPTIONS[0],
      comment: 'Great interview session, questions were spot on!',
      deviceInfo: { browser: 'Chrome', screen: '1920x1080' },
    };

    const parsed = interviewFeedbackSubmitSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rating).toBe(5);
      expect(parsed.data.likedAspect).toBe(LIKED_ASPECT_OPTIONS[0]);
      expect(parsed.data.issueType).toBe(ISSUE_TYPE_OPTIONS[0]);
      expect(parsed.data.comment).toBe('Great interview session, questions were spot on!');
    }
  });

  it('validates a minimal feedback submission with only required rating', () => {
    const input = {
      interviewId: validUuid,
      rating: 4,
    };

    const parsed = interviewFeedbackSubmitSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rating).toBe(4);
      expect(parsed.data.likedAspect).toBe('');
      expect(parsed.data.issueType).toBe('');
      expect(parsed.data.comment).toBe('');
    }
  });

  it('rejects invalid rating numbers (outside 1-5)', () => {
    expect(
      interviewFeedbackSubmitSchema.safeParse({
        interviewId: validUuid,
        rating: 0,
      }).success,
    ).toBe(false);

    expect(
      interviewFeedbackSubmitSchema.safeParse({
        interviewId: validUuid,
        rating: 6,
      }).success,
    ).toBe(false);

    expect(
      interviewFeedbackSubmitSchema.safeParse({
        interviewId: validUuid,
        rating: -1,
      }).success,
    ).toBe(false);
  });

  it('rejects missing or invalid interviewId', () => {
    expect(
      interviewFeedbackSubmitSchema.safeParse({
        rating: 5,
      }).success,
    ).toBe(false);

    expect(
      interviewFeedbackSubmitSchema.safeParse({
        interviewId: 'not-a-uuid',
        rating: 5,
      }).success,
    ).toBe(false);
  });

  it('sanitizes and truncates overly long comments', () => {
    const longComment = 'a'.repeat(2500);
    const parsed = interviewFeedbackSubmitSchema.safeParse({
      interviewId: validUuid,
      rating: 4,
      comment: longComment,
    });
    expect(parsed.success).toBe(false);
  });
});
