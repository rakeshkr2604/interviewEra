import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER = { id: '11111111-1111-4111-8111-111111111111' };
const RESUME_ID = '22222222-2222-4222-8222-222222222222';
const INTERVIEW_ID = '33333333-3333-4333-8333-333333333333';

const state = vi.hoisted(() => ({
  recentInterviewId: null as string | null,
  createResult: {
    success: true,
    remaining: 2,
    interviewId: '33333333-3333-4333-8333-333333333333',
    creditTransactionId: '44444444-4444-4444-8444-444444444444',
  } as Record<string, unknown>,
}));
const mocks = vi.hoisted(() => ({
  createInterviewWithCredit: vi.fn(),
  refundCredit: vi.fn(),
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
        data: { id: RESUME_ID, user_id: USER.id, parsed_data: {}, status: 'parsed' },
        error: null,
      };
    }
    if (this.table === 'interviews' && this.filters.get('status') === 'pending') {
      return {
        data: state.recentInterviewId
          ? { id: state.recentInterviewId, status: 'pending', created_at: new Date().toISOString() }
          : null,
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
  refundCredit: mocks.refundCredit,
}));
vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, remaining: 4, resetInSeconds: 60 })),
  buildRateLimitHttpResponse: vi.fn(() => null),
}));
vi.mock('@/lib/analytics/experiments', () => ({
  getExperimentFirstInterviewQuestionCount: vi.fn(async () => 4),
}));
vi.mock('@/lib/retention', () => ({
  getUserProgress: vi.fn(async () => null),
}));
vi.mock('@/lib/analytics/product-events', () => ({
  trackProductEvent: vi.fn(),
}));
vi.mock('@/lib/analytics/interview-events', () => ({
  trackInterviewEvent: vi.fn(),
}));
vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnce: vi.fn(),
}));
vi.mock('@/lib/resume/interview-snapshot', () => ({
  createResumeInterviewSnapshot: vi.fn(async () => null),
}));

import { POST } from '@/app/api/interview/start/route';
import { ActiveInterviewExistsError } from '@/lib/interview/active-interview-policy';

function request(): Request {
  return new Request('http://localhost/api/interview/start', {
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
    }),
  });
}

describe('legacy interview start credit ownership', () => {
  beforeEach(() => {
    state.recentInterviewId = null;
    mocks.createInterviewWithCredit.mockReset();
    mocks.refundCredit.mockReset();
    mocks.createInterviewWithCredit.mockImplementation(async () => state.createResult);
  });

  it('returns the interview created by the atomic ownership RPC', async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      interviewId: INTERVIEW_ID,
      creditsRemaining: 2,
      preparing: true,
    });
    expect(mocks.createInterviewWithCredit).toHaveBeenCalledOnce();
    expect(mocks.createInterviewWithCredit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER.id, resumeId: RESUME_ID, status: 'pending' }),
    );
  });

  it('reuses a recent pending interview without another debit', async () => {
    state.recentInterviewId = INTERVIEW_ID;

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      interviewId: INTERVIEW_ID,
      deduped: true,
    });
    expect(mocks.createInterviewWithCredit).not.toHaveBeenCalled();
  });

  it('returns 409 for a genuine active interview without another debit', async () => {
    mocks.createInterviewWithCredit.mockRejectedValue(
      new ActiveInterviewExistsError(INTERVIEW_ID, 'pending', 'v1', null),
    );

    const response = await POST(request());

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: 'active_interview',
      interviewId: INTERVIEW_ID,
      resumeUrl: `/interview/session/${INTERVIEW_ID}`,
    });
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
});
