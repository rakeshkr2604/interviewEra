import { describe, expect, it } from 'vitest';
import { feedbackSubmitSchema } from '@/lib/validations/schemas';
import { isOwnedScreenshotPath } from '@/lib/feedback/screenshot';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const base = {
  name: 'Rakesh',
  rating: 3,
  likedText: '',
  confusionText: '',
  bugsText: '',
  feedbackCategory: 'technical_issue',
  pageUrl: 'https://interviewera.com/feedback',
  browserInfo: 'Chrome',
};

describe('technical feedback validation', () => {
  it('requires an interview, controlled category, and description', () => {
    const result = feedbackSubmitSchema.safeParse(base);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining([
        'interviewId',
        'technicalFailureCategory',
        'technicalIssueDescription',
      ]),
    );
  });

  it('accepts a complete manual-review technical issue', () => {
    const result = feedbackSubmitSchema.safeParse({
      ...base,
      rating: null,
      interviewId: INTERVIEW_ID,
      technicalFailureCategory: 'transcription_service_failure',
      technicalIssueDescription: 'Transcription stopped during the second question.',
      screenshotPath: 'feedback/owner/screenshot.webp',
    });

    expect(result.success).toBe(true);
  });

  it('accepts technical issues without a star rating or screenshot', () => {
    const result = feedbackSubmitSchema.safeParse({
      ...base,
      rating: null,
      interviewId: INTERVIEW_ID,
      technicalFailureCategory: 'unexpected_interruption',
      technicalIssueDescription: 'Microphone produced silence after the greeting.',
    });

    expect(result.success).toBe(true);
  });

  it('still requires a rating for non-technical feedback', () => {
    const result = feedbackSubmitSchema.safeParse({
      ...base,
      rating: null,
      feedbackCategory: 'bug',
      bugsText: 'Login button spins forever',
    });

    expect(result.success).toBe(false);
  });

  it('rejects arbitrary failure classifications and unsafe screenshot paths', () => {
    const result = feedbackSubmitSchema.safeParse({
      ...base,
      interviewId: INTERVIEW_ID,
      technicalFailureCategory: 'user_closed_browser',
      technicalIssueDescription: 'Browser closed.',
      screenshotPath: '../private/file.png',
    });

    expect(result.success).toBe(false);
  });

  it('accepts screenshot references only from the authenticated owner folder', () => {
    expect(isOwnedScreenshotPath('feedback/user-a/shot.webp', 'user-a')).toBe(true);
    expect(isOwnedScreenshotPath('feedback/user-b/shot.webp', 'user-a')).toBe(false);
    expect(isOwnedScreenshotPath('feedback/user-a/../user-b/shot.webp', 'user-a')).toBe(false);
  });
});
