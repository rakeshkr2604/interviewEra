import { describe, expect, it } from 'vitest';
import { InterviewExitFeedbackModal } from './InterviewExitFeedbackModal';
import {
  EXIT_REASON_OPTIONS,
  TECHNICAL_ISSUE_OPTIONS,
  interviewExitFeedbackSubmitSchema,
} from '@/lib/validations/interview-exit-feedback';

describe('InterviewExitFeedbackModal component definitions & contracts', () => {
  it('exports the InterviewExitFeedbackModal component function', () => {
    expect(typeof InterviewExitFeedbackModal).toBe('function');
  });

  it('contains expected first-class exit reasons for incomplete sessions', () => {
    expect(EXIT_REASON_OPTIONS).toContain('I need to leave for a personal reason');
    expect(EXIT_REASON_OPTIONS).toContain('I ran into a technical problem');
    expect(EXIT_REASON_OPTIONS).toContain("The interview wasn't working as expected");
    expect(EXIT_REASON_OPTIONS).toContain('The questions were too difficult');
    expect(EXIT_REASON_OPTIONS).toContain("The questions weren't relevant to me");
    expect(EXIT_REASON_OPTIONS).toContain('I was confused about what to do');
    expect(EXIT_REASON_OPTIONS).toContain('The interview was taking too long');
    expect(EXIT_REASON_OPTIONS).toContain("I didn't find the interview useful");
    expect(EXIT_REASON_OPTIONS).toContain("I wasn't satisfied with the experience");
    expect(EXIT_REASON_OPTIONS).toContain('I started the interview by mistake');
    expect(EXIT_REASON_OPTIONS).toContain('Other');
  });

  it('contains expected technical issue options for secondary selection', () => {
    expect(TECHNICAL_ISSUE_OPTIONS).toContain('Mic/audio problem');
    expect(TECHNICAL_ISSUE_OPTIONS).toContain('Camera/video problem');
    expect(TECHNICAL_ISSUE_OPTIONS).toContain('Interview froze/stuck');
    expect(TECHNICAL_ISSUE_OPTIONS).toContain('Voice recognition problem');
    expect(TECHNICAL_ISSUE_OPTIONS).toContain('AI/response problem');
    expect(TECHNICAL_ISSUE_OPTIONS).toContain("Page didn't load/work correctly");
    expect(TECHNICAL_ISSUE_OPTIONS).toContain('Network problem');
    expect(TECHNICAL_ISSUE_OPTIONS).toContain('Other technical issue');
  });
});

describe('Interview Exit Feedback Schema & Flow Scenarios', () => {
  const interviewId = 'e0000000-0000-4000-8000-000000000001';

  it('CASE 1: Zero-friction personal reason exit', () => {
    const payload = {
      interviewId,
      exitReason: 'I need to leave for a personal reason',
      engine: 'script',
    };

    const parsed = interviewExitFeedbackSubmitSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.exitReason).toBe('I need to leave for a personal reason');
      expect(parsed.data.issueType).toBe('');
      expect(parsed.data.comment).toBe('');
    }
  });

  it('CASE 2: Technical problem with secondary issue selected', () => {
    const payload = {
      interviewId,
      exitReason: 'I ran into a technical problem',
      issueType: 'Mic/audio problem',
      comment: 'Audio disconnected on question 3',
      questionIndex: 3,
      progressPercent: 30,
      engine: 'script',
    };

    const parsed = interviewExitFeedbackSubmitSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.issueType).toBe('Mic/audio problem');
      expect(parsed.data.questionIndex).toBe(3);
    }
  });

  it('CASE 3: Custom other exit reason', () => {
    const payload = {
      interviewId,
      exitReason: 'Other: Had an urgent call with a client',
      comment: 'Will resume later',
      engine: 'standard',
    };

    const parsed = interviewExitFeedbackSubmitSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.exitReason).toBe('Other: Had an urgent call with a client');
      expect(parsed.data.engine).toBe('standard');
    }
  });

  it('CASE 4: Idempotent submission payload validation for retries', () => {
    const payload1 = {
      interviewId,
      exitReason: 'I started the interview by mistake',
      engine: 'script',
    };
    const payload2 = {
      interviewId,
      exitReason: 'I started the interview by mistake',
      engine: 'script',
    };

    const parsed1 = interviewExitFeedbackSubmitSchema.safeParse(payload1);
    const parsed2 = interviewExitFeedbackSubmitSchema.safeParse(payload2);
    expect(parsed1.success).toBe(true);
    expect(parsed2.success).toBe(true);
  });
});
