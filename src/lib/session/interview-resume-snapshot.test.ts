import { describe, expect, it } from 'vitest';
import {
  isResumeSession,
  resolveResumeQuestionIndex,
  snapshotToDraftForRestore,
  type InterviewResumeSnapshot,
} from '@/lib/session/interview-resume-snapshot';

const baseSnapshot = (overrides: Partial<InterviewResumeSnapshot> = {}): InterviewResumeSnapshot => ({
  version: 1,
  questionIndex: 2,
  phase: 'candidate_answering',
  transcript: 'partial answer',
  timerRemaining: 42,
  timerBudget: 60,
  skipCount: 1,
  pendingFollowUp: null,
  inputMode: 'text',
  followUpForIndex: -1,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('resolveResumeQuestionIndex', () => {
  it('uses snapshot index for active interviews when present', () => {
    expect(
      resolveResumeQuestionIndex({
        questionCount: 5,
        answeredCount: 0,
        status: 'in_progress',
        snapshot: baseSnapshot({ questionIndex: 2 }),
      }),
    ).toBe(2);
  });

  it('falls back to answeredCount when no snapshot', () => {
    expect(
      resolveResumeQuestionIndex({
        questionCount: 5,
        answeredCount: 2,
        status: 'in_progress',
        snapshot: null,
      }),
    ).toBe(2);
  });

  it('clamps to last question', () => {
    expect(
      resolveResumeQuestionIndex({
        questionCount: 3,
        answeredCount: 0,
        status: 'in_progress',
        snapshot: baseSnapshot({ questionIndex: 99 }),
      }),
    ).toBe(2);
  });
});

describe('isResumeSession', () => {
  it('detects resume when snapshot exists', () => {
    expect(
      isResumeSession({
        status: 'in_progress',
        answeredCount: 0,
        snapshot: baseSnapshot(),
      }),
    ).toBe(true);
  });

  it('is false for completed interviews', () => {
    expect(
      isResumeSession({
        status: 'completed',
        answeredCount: 3,
        snapshot: baseSnapshot(),
      }),
    ).toBe(false);
  });
});

describe('snapshotToDraftForRestore', () => {
  it('maps server snapshot to client draft for answering', () => {
    const draft = snapshotToDraftForRestore(
      baseSnapshot({ questionIndex: 2, skipCount: 1 }),
      'iv-1',
    );
    expect(draft.questionIndex).toBe(2);
    expect(draft.skipCount).toBe(1);
    expect(draft.phase).toBe('candidate_answering');
  });

  it('preserves feedback phase and lastFeedback', () => {
    const draft = snapshotToDraftForRestore(
      baseSnapshot({
        phase: 'feedback',
        lastFeedback: 'Strong STAR structure.',
      }),
      'iv-1',
    );
    expect(draft.phase).toBe('feedback');
    expect(draft.lastFeedback).toBe('Strong STAR structure.');
  });
});
