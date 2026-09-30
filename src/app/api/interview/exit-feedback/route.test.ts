import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

const USER = { id: 'user-1', email: 'candidate@example.com' };
const OTHER_USER = { id: 'user-2', email: 'other@example.com' };

let db: FakeDb;
let currentUser = USER;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: currentUser },
        error: currentUser ? null : { message: 'Not logged in' },
      }),
    },
  }),
  createServiceClient: () => makeFakeServiceClient(db),
}));

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: async () => ({ allowed: true, remaining: 10 }),
}));

const trackProductEventServer = vi.fn();
vi.mock('@/lib/analytics/product-events-server', () => ({
  trackProductEventServer: (...args: unknown[]) => trackProductEventServer(...args),
}));

const persistMilestoneEventOnce = vi.fn();
vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnce: (...args: unknown[]) => persistMilestoneEventOnce(...args),
}));

import { POST, GET } from '@/app/api/interview/exit-feedback/route';

const IV_INCOMPLETE = '11111111-1111-4111-8111-111111111111';
const IV_COMPLETED = '22222222-2222-4222-8222-222222222222';
const IV_OTHER = '33333333-3333-4333-8333-333333333333';

function postReq(body: unknown): Request {
  return new Request('http://localhost/api/interview/exit-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getReq(interviewId: string): Request {
  return new Request(`http://localhost/api/interview/exit-feedback?interviewId=${interviewId}`, {
    method: 'GET',
  });
}

describe('POST /api/interview/exit-feedback', () => {
  beforeEach(() => {
    currentUser = USER;
    trackProductEventServer.mockClear();
    persistMilestoneEventOnce.mockClear();
    db = {
      interviews: [
        { id: IV_INCOMPLETE, user_id: USER.id, status: 'in_progress', role: 'Full Stack Engineer', engine: 'script' },
        { id: IV_COMPLETED, user_id: USER.id, status: 'completed', role: 'Frontend Engineer', engine: 'script' },
        { id: IV_OTHER, user_id: OTHER_USER.id, status: 'in_progress', role: 'Backend Engineer', engine: 'script' },
      ],
      interview_exit_feedbacks: [],
    };
  });

  it('successfully saves exit feedback and marks in_progress interview as abandoned', async () => {
    const res = await POST(
      postReq({
        interviewId: IV_INCOMPLETE,
        exitReason: 'I ran into a technical problem',
        issueType: 'Mic/audio problem',
        comment: 'Echo in voice input',
        questionIndex: 2,
        progressPercent: 20,
        engine: 'script',
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; feedback: { exit_reason: string; issue_type: string } };
    expect(body.ok).toBe(true);
    expect(body.feedback.exit_reason).toBe('I ran into a technical problem');
    expect(body.feedback.issue_type).toBe('Mic/audio problem');

    // Stored in database
    expect(db.interview_exit_feedbacks).toHaveLength(1);
    expect(db.interview_exit_feedbacks[0].interview_id).toBe(IV_INCOMPLETE);
    expect(db.interview_exit_feedbacks[0].user_id).toBe(USER.id);

    // Interview marked as abandoned
    const updatedIv = db.interviews.find((i) => i.id === IV_INCOMPLETE);
    expect(updatedIv?.status).toBe('abandoned');

    // Lifecycle milestone once; feedback product event kept; no duplicate interview_abandoned track
    expect(persistMilestoneEventOnce).toHaveBeenCalledTimes(1);
    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_abandoned', {
      user_id: USER.id,
      interview_id: IV_INCOMPLETE,
      previous_status: 'in_progress',
      source: 'exit_feedback',
    });
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'interview_exit_feedback_submitted',
        user_id: USER.id,
        interview_id: IV_INCOMPLETE,
        exit_reason: 'I ran into a technical problem',
      }),
    );
    expect(trackProductEventServer).not.toHaveBeenCalledWith(
      expect.objectContaining({ event_name: 'interview_abandoned' }),
    );
  });

  it('already abandoned: persists feedback without a second lifecycle milestone', async () => {
    db.interviews[0].status = 'abandoned';
    const res = await POST(
      postReq({
        interviewId: IV_INCOMPLETE,
        exitReason: 'I need to leave for a personal reason',
      }),
    );
    expect(res.status).toBe(200);
    expect(db.interview_exit_feedbacks).toHaveLength(1);
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({ event_name: 'interview_exit_feedback_submitted' }),
    );
    expect(trackProductEventServer).not.toHaveBeenCalledWith(
      expect.objectContaining({ event_name: 'interview_abandoned' }),
    );
  });

  it('rejects submission for an already completed interview with 400', async () => {
    const res = await POST(
      postReq({
        interviewId: IV_COMPLETED,
        exitReason: 'I need to leave for a personal reason',
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('already been completed');
    expect(db.interview_exit_feedbacks).toHaveLength(0);
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests with 401', async () => {
    currentUser = null as never;
    const res = await POST(
      postReq({
        interviewId: IV_INCOMPLETE,
        exitReason: 'I need to leave for a personal reason',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when user tries to submit exit feedback for another user interview', async () => {
    const res = await POST(
      postReq({
        interviewId: IV_OTHER,
        exitReason: 'I need to leave for a personal reason',
      }),
    );
    expect(res.status).toBe(404);
    expect(db.interview_exit_feedbacks).toHaveLength(0);
  });

  it('handles duplicate/retry submission idempotently without creating duplicate rows', async () => {
    const res1 = await POST(
      postReq({
        interviewId: IV_INCOMPLETE,
        exitReason: 'I need to leave for a personal reason',
      }),
    );
    expect(res1.status).toBe(200);

    const res2 = await POST(
      postReq({
        interviewId: IV_INCOMPLETE,
        exitReason: 'I ran into a technical problem',
        issueType: 'Camera/video problem',
      }),
    );
    expect(res2.status).toBe(200);

    // Only 1 record in database due to onConflict: interview_id
    expect(db.interview_exit_feedbacks).toHaveLength(1);
    expect(db.interview_exit_feedbacks[0].exit_reason).toBe('I ran into a technical problem');
  });
});

describe('GET /api/interview/exit-feedback', () => {
  beforeEach(() => {
    currentUser = USER;
    db = {
      interviews: [
        { id: IV_INCOMPLETE, user_id: USER.id, status: 'abandoned' },
      ],
      interview_exit_feedbacks: [
        {
          id: 'exit-1',
          user_id: USER.id,
          interview_id: IV_INCOMPLETE,
          exit_reason: 'I need to leave for a personal reason',
          issue_type: '',
          comment: '',
          question_index: 2,
          progress_percent: 20,
          engine: 'script',
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
    };
  });

  it('retrieves existing exit feedback for an interview owned by the user', async () => {
    const res = await GET(getReq(IV_INCOMPLETE));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; feedback: { id: string; exit_reason: string } | null };
    expect(body.ok).toBe(true);
    expect(body.feedback?.id).toBe('exit-1');
    expect(body.feedback?.exit_reason).toBe('I need to leave for a personal reason');
  });

  it('returns null when no exit feedback has been submitted', async () => {
    const unsubmittedIv = '44444444-4444-4444-8444-444444444444';
    const res = await GET(getReq(unsubmittedIv));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; feedback: unknown };
    expect(body.ok).toBe(true);
    expect(body.feedback).toBeNull();
  });
});
