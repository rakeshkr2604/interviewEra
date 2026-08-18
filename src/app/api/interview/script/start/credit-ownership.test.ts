import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER = { id: '11111111-1111-4111-8111-111111111111' };
const RESUME_ID = '22222222-2222-4222-8222-222222222222';
const INTERVIEW_ID = '33333333-3333-4333-8333-333333333333';

const state = vi.hoisted(() => ({
  recentInterviewId: null as string | null,
}));
const mocks = vi.hoisted(() => ({
  createInterviewWithCredit: vi.fn(),
}));

class Query {
  private filters = new Map<string, unknown>();
  private head = false;

  constructor(private readonly table: string) {}

  select(_columns?: string, options?: { head?: boolean }) {
    this.head = options?.head === true;
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }
  in() { return this; }
  gte() { return this; }
  order() { return this; }
  limit() { return this; }

  async maybeSingle() {
    if (this.table === 'resumes') {
      return {
        data: {
          id: RESUME_ID,
          status: 'parsed',
          lifecycle_status: 'verified',
          deleted_at: null,
        },
        error: null,
      };
    }
    if (
      this.table === 'interviews' &&
      this.filters.get('engine') === 'v2.1' &&
      this.filters.get('status') === 'in_progress'
    ) {
      return {
        data: state.recentInterviewId ? { id: state.recentInterviewId } : null,
        error: null,
      };
    }
    return { data: null, error: null };
  }

  then(resolve: (value: unknown) => unknown) {
    return Promise.resolve(
      this.head ? { data: null, error: null, count: 0 } : { data: [], error: null },
    ).then(resolve);
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: USER }, error: null }) },
  }),
  createServiceClient: () => ({
    from: (table: string) => new Query(table),
  }),
}));
vi.mock('@/lib/utils/credits', () => ({
  createInterviewWithCredit: mocks.createInterviewWithCredit,
}));
vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 4, resetInSeconds: 60 })),
  buildRateLimitHttpResponse: vi.fn(() => null),
}));
vi.mock('@/lib/resume/interview-snapshot', () => ({
  createResumeInterviewSnapshot: vi.fn(async () => ({
    id: '55555555-5555-4555-8555-555555555555',
  })),
}));
vi.mock('@/lib/analytics/interview-events', () => ({
  trackInterviewEvent: vi.fn(),
}));
vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnce: vi.fn(),
}));

import { POST } from '@/app/api/interview/script/start/route';
import { ActiveInterviewExistsError } from '@/lib/interview/active-interview-policy';

function request(): Request {
  return new Request('http://localhost/api/interview/script/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resumeId: RESUME_ID,
      role: 'Backend Engineer',
      difficulty: 'medium',
      interviewerId: 'priya',
      goal: 'general_practice',
      interviewMode: 'technical',
      experienceYears: 2,
      selfIntroEnabled: true,
      followUpEnabled: true,
      cameraMode: true,
    }),
  });
}

describe('script interview start credit ownership', () => {
  beforeEach(() => {
    state.recentInterviewId = null;
    mocks.createInterviewWithCredit.mockReset();
    mocks.createInterviewWithCredit.mockResolvedValue({
      success: true,
      remaining: 2,
      interviewId: INTERVIEW_ID,
      creditTransactionId: '44444444-4444-4444-8444-444444444444',
    });
  });

  it('returns the script interview created by the atomic ownership RPC', async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      interviewId: INTERVIEW_ID,
      scriptType: 'SCRIPT_T',
    });
    expect(mocks.createInterviewWithCredit).toHaveBeenCalledOnce();
    expect(mocks.createInterviewWithCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER.id,
        resumeId: RESUME_ID,
        engine: 'v2.1',
        status: 'in_progress',
      }),
    );
  });

  it('reuses a recent script interview without another debit', async () => {
    state.recentInterviewId = INTERVIEW_ID;

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      interviewId: INTERVIEW_ID,
      deduped: true,
    });
    expect(mocks.createInterviewWithCredit).not.toHaveBeenCalled();
  });

  it('returns 409 for a genuine active interview without creating another debit', async () => {
    mocks.createInterviewWithCredit.mockRejectedValue(
      new ActiveInterviewExistsError(INTERVIEW_ID, 'in_progress', 'v2.1', '2026-08-18T10:00:00.000Z'),
    );

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: 'active_interview',
      interviewId: INTERVIEW_ID,
      resumeUrl: `/interview/script/${INTERVIEW_ID}`,
    });
    expect(mocks.createInterviewWithCredit).toHaveBeenCalledOnce();
  });

  it('returns 409, not 500, when the helper still wraps the RPC conflict string', async () => {
    mocks.createInterviewWithCredit.mockRejectedValue(
      new Error('Interview creation and credit deduction failed: Another interview is already active'),
    );

    const response = await POST(request());
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe('active_interview');
    expect(JSON.stringify(body)).not.toContain('Interview creation and credit deduction failed');
  });

  it('returns 402 when the RPC reports no credits', async () => {
    mocks.createInterviewWithCredit.mockResolvedValue({
      success: false,
      remaining: 0,
      reason: 'no_credits',
    });

    const response = await POST(request());

    expect(response.status).toBe(402);
    await expect(response.json()).resolves.toMatchObject({ error: 'no_credits' });
  });

  it('returns 500 for unexpected infrastructure errors, not 409', async () => {
    mocks.createInterviewWithCredit.mockRejectedValue(new Error('connection refused'));

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
  });

  it('returns 201 with a single debit when the RPC creates the interview', async () => {
    mocks.createInterviewWithCredit.mockResolvedValue({
      success: true,
      remaining: 1,
      interviewId: INTERVIEW_ID,
      creditTransactionId: '44444444-4444-4444-8444-444444444444',
      created: true,
    });

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(mocks.createInterviewWithCredit).toHaveBeenCalledOnce();
  });

  it('returns the existing interview when the RPC dedupes a concurrent retry', async () => {
    mocks.createInterviewWithCredit.mockResolvedValue({
      success: true,
      remaining: 2,
      interviewId: INTERVIEW_ID,
      creditTransactionId: '44444444-4444-4444-8444-444444444444',
      created: false,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      interviewId: INTERVIEW_ID,
      deduped: true,
    });
    expect(mocks.createInterviewWithCredit).toHaveBeenCalledOnce();
  });
});
