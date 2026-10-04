import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'u@example.com' };
const INTERVIEW_ID = '33333333-3333-4333-8333-333333333333';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  enforceScriptLlmRateLimit: vi.fn(),
  loadOrGenerateScriptReport: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
  }),
  createServiceClient: () => ({}),
}));

vi.mock('@/lib/interview/script-llm-guards', () => ({
  enforceScriptLlmRateLimit: (...args: unknown[]) => mocks.enforceScriptLlmRateLimit(...args),
}));

vi.mock('@/lib/interview/script-report/generate', () => ({
  loadOrGenerateScriptReport: (...args: unknown[]) => mocks.loadOrGenerateScriptReport(...args),
}));

vi.mock('@/lib/email/lifecycle/try-send-script-completion-email', () => ({
  trySendScriptCompletionEmail: vi.fn(async () => undefined),
}));

import { GET } from '@/app/api/interview/script/report/route';

function reportRequest(): Request {
  return new Request(
    `http://localhost/api/interview/script/report?interviewId=${INTERVIEW_ID}`,
  );
}

describe('script report in-route LLM guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mocks.enforceScriptLlmRateLimit.mockResolvedValue(null);
    mocks.loadOrGenerateScriptReport.mockResolvedValue({
      ok: true,
      created: false,
      report: {
        id: 'r1',
        interview_id: INTERVIEW_ID,
        overall: 3,
        scored_answer_count: 1,
        status: 'ready',
      },
    });
  });

  it('rejects unauthenticated callers before generate', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET(reportRequest());
    expect(res.status).toBe(401);
    expect(mocks.loadOrGenerateScriptReport).not.toHaveBeenCalled();
  });

  it('blocks rate limit before generate', async () => {
    mocks.enforceScriptLlmRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'Too many report requests.', code: 'rate_limit_exceeded' }, { status: 429 }),
    );
    const res = await GET(reportRequest());
    expect(res.status).toBe(429);
    expect(mocks.loadOrGenerateScriptReport).not.toHaveBeenCalled();
  });

  it('surfaces cost-guard denial from generate without leaking internals', async () => {
    mocks.loadOrGenerateScriptReport.mockResolvedValue({
      ok: false,
      error: 'Monthly LLM cost limit exceeded',
      status: 429,
      code: 'llm_cost_limit_exceeded',
    });
    const res = await GET(reportRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('llm_cost_limit_exceeded');
    expect(JSON.stringify(body)).not.toMatch(/redis|upstash|pipeline/i);
  });
});
