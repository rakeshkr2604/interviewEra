import { describe, expect, it } from 'vitest';
import { feedbackSubmitSchema } from '@/lib/validations/schemas';
import { anonymousFeedbackSchema } from '@/lib/validations/anonymous-feedback';

const baseAuthPayload = {
  name: 'Rakesh',
  rating: 5,
  likedText: 'Great practice flow',
  confusionText: '',
  bugsText: '',
  pageUrl: 'https://interviewera.com/feedback',
  browserInfo: 'test-agent',
};

describe('feedback consentPublicDisplay', () => {
  it('defaults to false when omitted (auth submit)', () => {
    const parsed = feedbackSubmitSchema.safeParse(baseAuthPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.consentPublicDisplay).toBe(false);
    }
  });

  it('stores true when explicitly opted in', () => {
    const parsed = feedbackSubmitSchema.safeParse({
      ...baseAuthPayload,
      consentPublicDisplay: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.consentPublicDisplay).toBe(true);
    }
  });

  it('stores false when explicitly unchecked', () => {
    const parsed = feedbackSubmitSchema.safeParse({
      ...baseAuthPayload,
      consentPublicDisplay: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.consentPublicDisplay).toBe(false);
    }
  });

  it('defaults to false for anonymous submit when omitted', () => {
    const parsed = anonymousFeedbackSchema.safeParse({
      message: 'This is long enough anonymous feedback text.',
      pageUrl: 'https://interviewera.com/',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.consentPublicDisplay).toBe(false);
    }
  });
});
