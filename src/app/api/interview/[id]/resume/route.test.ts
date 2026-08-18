import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER = { id: '11111111-1111-4111-8111-111111111111' };
const INTERVIEW_ID = '33333333-3333-4333-8333-333333333333';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  trackInterviewEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: USER }, error: null }) },
  }),
  createServiceClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 9, resetInSeconds: 60 })),
}));
vi.mock('@/lib/analytics/interview-events', () => ({
  trackInterviewEvent: mocks.trackInterviewEvent,
}));

import { POST } from '@/app/api/interview/[id]/resume/route';

function request(): Request {
  return new Request(`http://localhost/api/interview/${INTERVIEW_ID}/resume`, {
    method: 'POST',
  });
}

const params = { params: Promise.resolve({ id: INTERVIEW_ID }) };

describe('POST /api/interview/[id]/resume', () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.trackInterviewEvent.mockReset();
  });

  it('reopens an abandoned interview without creating a debit', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ok: true, interview_id: INTERVIEW_ID, engine: 'v2.1', reason: 'reopened' }],
      error: null,
    });

    const response = await POST(request(), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      interviewId: INTERVIEW_ID,
      resumeUrl: `/interview/script/${INTERVIEW_ID}`,
      reason: 'reopened',
    });
    expect(mocks.rpc).toHaveBeenCalledWith('resume_abandoned_interview', {
      p_user_id: USER.id,
      p_interview_id: INTERVIEW_ID,
    });
    expect(mocks.trackInterviewEvent).toHaveBeenCalledWith(
      'interview_resumed',
      expect.objectContaining({ interviewId: INTERVIEW_ID, source: 'history_continue' }),
    );
  });

  it('returns 409 when another interview is genuinely active', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        ok: false,
        interview_id: '44444444-4444-4444-8444-444444444444',
        engine: 'v1',
        reason: 'other_active',
      }],
      error: null,
    });

    const response = await POST(request(), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: 'active_interview',
      interviewId: '44444444-4444-4444-8444-444444444444',
      resumeUrl: '/interview/session/44444444-4444-4444-8444-444444444444',
    });
  });

  it('rejects a second continue on the same abandoned interview', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ok: false, interview_id: INTERVIEW_ID, engine: 'v2.1', reason: 'already_resumed' }],
      error: null,
    });

    const response = await POST(request(), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: 'already_resumed' });
    expect(mocks.trackInterviewEvent).not.toHaveBeenCalled();
  });
});
