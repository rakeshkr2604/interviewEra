import { describe, expect, it } from 'vitest';
import {
  ACTIVE_INTERVIEW_STALE_AFTER_MS,
  ActiveInterviewExistsError,
  activeInterviewAgeMs,
  activeInterviewConflictBody,
  activeInterviewConflictFromRpc,
  activeInterviewResumePath,
  asActiveInterviewConflict,
  isActiveInterviewConflictError,
  userFacingInterviewStartError,
} from '@/lib/interview/active-interview-policy';

describe('active interview policy', () => {
  it('keeps the stale window at 45 minutes', () => {
    expect(ACTIVE_INTERVIEW_STALE_AFTER_MS).toBe(45 * 60 * 1000);
  });

  it('routes v2.1 sessions to the script engine path', () => {
    expect(activeInterviewResumePath('v2.1', '33333333-3333-4333-8333-333333333333')).toBe(
      '/interview/script/33333333-3333-4333-8333-333333333333',
    );
    expect(activeInterviewResumePath('v1', '33333333-3333-4333-8333-333333333333')).toBe(
      '/interview/session/33333333-3333-4333-8333-333333333333',
    );
  });

  it('maps the RPC business conflict to a typed 409 error', () => {
    expect(
      isActiveInterviewConflictError({
        code: 'P0001',
        message: 'Another interview is already active',
      }),
    ).toBe(true);

    const err = activeInterviewConflictFromRpc({
      code: 'P0001',
      message: 'Another interview is already active',
      hint: '33333333-3333-4333-8333-333333333333',
      details: JSON.stringify({
        interview_id: '33333333-3333-4333-8333-333333333333',
        status: 'in_progress',
        engine: 'v2.1',
        started_at: '2026-08-18T10:00:00.000Z',
      }),
    });

    expect(err).toBeInstanceOf(ActiveInterviewExistsError);
    expect(activeInterviewConflictBody(err)).toMatchObject({
      error: 'active_interview',
      interviewId: '33333333-3333-4333-8333-333333333333',
      status: 'in_progress',
      resumeUrl: '/interview/script/33333333-3333-4333-8333-333333333333',
    });
  });

  it('maps a wrapped RPC error and a duck-typed conflict to the same 409 error', () => {
    const wrapped = asActiveInterviewConflict(
      new Error('Interview creation and credit deduction failed: Another interview is already active'),
    );
    expect(wrapped).toBeInstanceOf(ActiveInterviewExistsError);

    const duck = asActiveInterviewConflict({
      code: 'active_interview',
      interviewId: '33333333-3333-4333-8333-333333333333',
      engine: 'v2.1',
    });
    expect(duck).toBeInstanceOf(ActiveInterviewExistsError);
    expect(duck?.interviewId).toBe('33333333-3333-4333-8333-333333333333');
  });

  it('does not treat infrastructure failures as an active-interview conflict', () => {
    expect(asActiveInterviewConflict(new Error('connection refused'))).toBeNull();
  });

  it('maps the unique-index race to the same conflict', () => {
    expect(
      isActiveInterviewConflictError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "uq_interviews_one_active_per_user"',
      }),
    ).toBe(true);
  });

  it('does not treat ledger or resume failures as an active-interview conflict', () => {
    expect(
      isActiveInterviewConflictError({
        code: 'P0001',
        message: 'Active interview is missing its linked debit',
      }),
    ).toBe(false);
    expect(
      isActiveInterviewConflictError({
        code: '23503',
        message: 'Resume does not belong to interview user',
      }),
    ).toBe(false);
  });

  it('detects a unique-index violation when the constraint name is in details', () => {
    expect(
      isActiveInterviewConflictError({
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        details: 'Key (user_id)=(...) already exists. uq_interviews_one_active_per_user',
      }),
    ).toBe(true);
  });

  it('hides internal start-conflict strings from the user', () => {
    expect(userFacingInterviewStartError(409, 'active_interview')).toBe(
      'You already have an active interview.',
    );
    expect(
      userFacingInterviewStartError(
        500,
        'Interview creation and credit deduction failed: Another interview is already active',
      ),
    ).toBe('Failed to start interview. Please try again.');
    expect(userFacingInterviewStartError(402, 'no_credits')).toBe(
      'No credits remaining. Please upgrade your plan.',
    );
  });

  it('returns null age when started_at is missing', () => {
    expect(activeInterviewAgeMs(null)).toBeNull();
    expect(activeInterviewAgeMs('not-a-date')).toBeNull();
  });
});
