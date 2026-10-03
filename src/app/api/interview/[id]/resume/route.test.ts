import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER = { id: '11111111-1111-4111-8111-111111111111' };
const OTHER = { id: '22222222-2222-4222-8222-222222222222' };
const INTERVIEW_ID = '33333333-3333-4333-8333-333333333333';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  trackInterviewEvent: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
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
    mocks.getUser.mockReset();
    mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
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

  it('returns 401 when unauthenticated', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(request(), params);
    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns 409 when another interview is genuinely active', async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          ok: false,
          interview_id: '44444444-4444-4444-8444-444444444444',
          engine: 'v1',
          reason: 'other_active',
        },
      ],
      error: null,
    });

    const response = await POST(request(), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: 'active_interview',
      interviewId: '44444444-4444-4444-8444-444444444444',
      resumeUrl: '/dashboard',
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

  it('rejects no_credit and does not emit resume analytics', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ok: false, interview_id: INTERVIEW_ID, engine: 'v2.1', reason: 'no_credit' }],
      error: null,
    });

    const response = await POST(request(), params);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'not_eligible' });
    expect(mocks.trackInterviewEvent).not.toHaveBeenCalled();
  });

  it('rejects completed interviews', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ok: false, interview_id: INTERVIEW_ID, engine: 'v2.1', reason: 'completed' }],
      error: null,
    });

    const response = await POST(request(), params);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: 'not_eligible' });
  });

  it('blocks another authenticated user (RPC ownership → not_found)', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: OTHER }, error: null });
    mocks.rpc.mockResolvedValue({
      data: [{ ok: false, interview_id: null, engine: null, reason: 'not_found' }],
      error: null,
    });

    const response = await POST(request(), params);
    expect(response.status).toBe(404);
    expect(mocks.rpc).toHaveBeenCalledWith('resume_abandoned_interview', {
      p_user_id: OTHER.id,
      p_interview_id: INTERVIEW_ID,
    });
  });

  it('passes authenticated user id into RPC (ownership)', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ ok: true, interview_id: INTERVIEW_ID, engine: 'v2.1', reason: 'already_active' }],
      error: null,
    });

    await POST(request(), params);

    expect(mocks.rpc).toHaveBeenCalledWith('resume_abandoned_interview', {
      p_user_id: USER.id,
      p_interview_id: INTERVIEW_ID,
    });
  });
});
