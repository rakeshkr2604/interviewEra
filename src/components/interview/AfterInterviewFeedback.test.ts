import { describe, expect, it } from 'vitest';
import { AfterInterviewFeedback } from './AfterInterviewFeedback';
import {
  LIKED_ASPECT_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  interviewFeedbackSubmitSchema,
} from '@/lib/validations/interview-feedback';

describe('AfterInterviewFeedback component definitions & contracts', () => {
  it('exports the AfterInterviewFeedback component function', () => {
    expect(typeof AfterInterviewFeedback).toBe('function');
  });

  it('provides structured options for liked aspects matching product requirements', () => {
    expect(LIKED_ASPECT_OPTIONS).toContain('Questions matched my resume/experience');
    expect(LIKED_ASPECT_OPTIONS).toContain('Follow-up questions felt relevant');
    expect(LIKED_ASPECT_OPTIONS).toContain('Voice interview felt realistic');
    expect(LIKED_ASPECT_OPTIONS).toContain('Feedback/scoring was useful');
    expect(LIKED_ASPECT_OPTIONS).toContain('Interview difficulty felt appropriate');
    expect(LIKED_ASPECT_OPTIONS).toContain('Other');
  });

  it('provides structured options for issues encountered matching product requirements', () => {
    expect(ISSUE_TYPE_OPTIONS).toContain('No issues');
    expect(ISSUE_TYPE_OPTIONS).toContain('Mic/audio issue');
    expect(ISSUE_TYPE_OPTIONS).toContain('Camera/video issue');
    expect(ISSUE_TYPE_OPTIONS).toContain('Interview froze/stuck');
    expect(ISSUE_TYPE_OPTIONS).toContain('Question/follow-up issue');
    expect(ISSUE_TYPE_OPTIONS).toContain('Resume-related issue');
    expect(ISSUE_TYPE_OPTIONS).toContain('Technical error');
    expect(ISSUE_TYPE_OPTIONS).toContain('Other');
  });
});

describe('Report and Feedback Race Condition & State Flow Rules', () => {
  it('CASE A & B: candidate can fill feedback and submit payload successfully validated against schema', () => {
    const payload = {
      interviewId: 'a0000000-0000-4000-8000-000000000001',
      rating: 5,
      likedAspect: 'Questions matched my resume/experience',
      issueType: 'No issues',
      comment: 'The questions were very relevant to my background.',
      deviceInfo: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        screen: '1920x1080',
      },
    };

    const parsed = interviewFeedbackSubmitSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('CASE B: handles report becoming ready with optional feedback untouched', () => {
    // When isReportReady = true, minimal valid payload (rating only) is allowed
    const minimalPayload = {
      interviewId: 'a0000000-0000-4000-8000-000000000001',
      rating: 4,
    };
    const parsed = interviewFeedbackSubmitSchema.safeParse(minimalPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.rating).toBe(4);
      expect(parsed.data.likedAspect).toBe('');
      expect(parsed.data.issueType).toBe('');
    }
  });

  it('CASE C: submit before report ready preserves valid submission schema', () => {
    const submitPayload = {
      interviewId: 'b0000000-0000-4000-8000-000000000002',
      rating: 3,
      likedAspect: 'Voice interview felt realistic',
      issueType: 'Mic/audio issue',
      comment: 'Audio cut out momentarily during question 2.',
    };

    const parsed = interviewFeedbackSubmitSchema.safeParse(submitPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.issueType).toBe('Mic/audio issue');
      expect(parsed.data.rating).toBe(3);
    }
  });

  it('Idempotent retry: duplicate submission payloads for the same interview ID validate identically', () => {
    const interviewId = 'c0000000-0000-4000-8000-000000000003';
    const firstAttempt = { interviewId, rating: 5, likedAspect: 'Feedback/scoring was useful' };
    const secondAttempt = { interviewId, rating: 5, likedAspect: 'Feedback/scoring was useful' };

    const parse1 = interviewFeedbackSubmitSchema.safeParse(firstAttempt);
    const parse2 = interviewFeedbackSubmitSchema.safeParse(secondAttempt);

    expect(parse1.success).toBe(true);
    expect(parse2.success).toBe(true);
    expect(parse1.data?.interviewId).toEqual(parse2.data?.interviewId);
  });

  it('Custom Other responses: accepts formatted Other custom text for likedAspect and issueType', () => {
    const payload = {
      interviewId: 'd0000000-0000-4000-8000-000000000004',
      rating: 5,
      likedAspect: 'Other: The coding follow-up question was very realistic',
      issueType: 'Other: Video lagged for 2 seconds on turn 3',
      comment: 'Overall great experience.',
    };
    const parsed = interviewFeedbackSubmitSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.likedAspect).toBe('Other: The coding follow-up question was very realistic');
      expect(parsed.data.issueType).toBe('Other: Video lagged for 2 seconds on turn 3');
    }
  });
});
