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

import { POST, GET } from '@/app/api/interview/feedback/route';

const IV_OWNED = '11111111-1111-4111-8111-111111111111';
const IV_OTHER = '22222222-2222-4222-8222-222222222222';

function postReq(body: unknown): Request {
  return new Request('http://localhost/api/interview/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function getReq(interviewId: string): Request {
  return new Request(`http://localhost/api/interview/feedback?interviewId=${interviewId}`, {
    method: 'GET',
  });
}

describe('POST /api/interview/feedback', () => {
  beforeEach(() => {
    currentUser = USER;
    trackProductEventServer.mockClear();
    db = {
      interviews: [
        { id: IV_OWNED, user_id: USER.id, status: 'completed', role: 'Frontend Engineer' },
        { id: IV_OTHER, user_id: OTHER_USER.id, status: 'completed', role: 'Backend Engineer' },
      ],
      interview_feedbacks: [],
    };
  });

  it('saves after-interview feedback successfully for owned interview', async () => {
    const res = await POST(
      postReq({
        interviewId: IV_OWNED,
        rating: 5,
        likedAspect: 'Questions matched my resume/experience',
        issueType: 'No issues',
        comment: 'Super realistic and helpful.',
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; feedback: { rating: number; liked_aspect: string } };
    expect(body.ok).toBe(true);
    expect(body.feedback.rating).toBe(5);
    expect(body.feedback.liked_aspect).toBe('Questions matched my resume/experience');

    // Stored in database
    expect(db.interview_feedbacks).toHaveLength(1);
    expect(db.interview_feedbacks[0].interview_id).toBe(IV_OWNED);
    expect(db.interview_feedbacks[0].user_id).toBe(USER.id);

    // Tracked in product analytics
    expect(trackProductEventServer).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'after_interview_feedback_submitted',
        user_id: USER.id,
        interview_id: IV_OWNED,
        rating: 5,
      }),
    );
  });

  it('rejects unauthenticated requests with 401', async () => {
    currentUser = null as never;
    const res = await POST(
      postReq({
        interviewId: IV_OWNED,
        rating: 4,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when user tries to submit feedback for another user interview', async () => {
    const res = await POST(
      postReq({
        interviewId: IV_OTHER,
        rating: 4,
      }),
    );
    expect(res.status).toBe(404);
    expect(db.interview_feedbacks).toHaveLength(0);
  });

  it('handles duplicate/retry submission idempotently without error', async () => {
    // First submission
    const res1 = await POST(
      postReq({
        interviewId: IV_OWNED,
        rating: 4,
        likedAspect: 'Voice interview felt realistic',
      }),
    );
    expect(res1.status).toBe(200);

    // Second submission (updated rating / retry)
    const res2 = await POST(
      postReq({
        interviewId: IV_OWNED,
        rating: 5,
        likedAspect: 'Voice interview felt realistic',
        comment: 'Added comment on retry',
      }),
    );
    expect(res2.status).toBe(200);

    // Record count remains 1 due to onConflict: interview_id
    expect(db.interview_feedbacks).toHaveLength(1);
    expect(db.interview_feedbacks[0].rating).toBe(5);
    expect(db.interview_feedbacks[0].comment).toBe('Added comment on retry');
  });
});

describe('GET /api/interview/feedback', () => {
  beforeEach(() => {
    currentUser = USER;
    db = {
      interviews: [
        { id: IV_OWNED, user_id: USER.id, status: 'completed' },
      ],
      interview_feedbacks: [
        {
          id: 'fb-1',
          user_id: USER.id,
          interview_id: IV_OWNED,
          rating: 5,
          liked_aspect: 'Questions matched my resume/experience',
          issue_type: 'No issues',
          comment: 'Spot on!',
          submitted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
    };
  });

  it('retrieves existing feedback for an interview owned by the user', async () => {
    const res = await GET(getReq(IV_OWNED));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; feedback: { id: string; rating: number } | null };
    expect(body.ok).toBe(true);
    expect(body.feedback?.id).toBe('fb-1');
    expect(body.feedback?.rating).toBe(5);
  });

  it('returns null when no feedback has been submitted for the interview', async () => {
    const unsubmittedIv = '33333333-3333-4333-8333-333333333333';
    const res = await GET(getReq(unsubmittedIv));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; feedback: unknown };
    expect(body.ok).toBe(true);
    expect(body.feedback).toBeNull();
  });
});
