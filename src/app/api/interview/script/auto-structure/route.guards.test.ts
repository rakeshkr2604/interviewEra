import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const USER = { id: '11111111-1111-4111-8111-111111111111' };
const INTERVIEW_ID = '33333333-3333-4333-8333-333333333333';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  enforceScriptLlmRateLimit: vi.fn(),
  reserveScriptLlmCost: vi.fn(),
  completeInterviewChat: vi.fn(),
  ownership: vi.fn(),
  userPlan: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.select = self;
      chain.eq = self;
      chain.update = () => ({
        eq: () => ({
          eq: async () => ({ error: null }),
        }),
      });
      chain.maybeSingle = async () => {
        if (table === 'interviews') return mocks.ownership();
        if (table === 'users') return mocks.userPlan();
        return { data: null, error: null };
      };
      return chain;
    },
  }),
}));

vi.mock('@/lib/interview/script-llm-guards', () => ({
  enforceScriptLlmRateLimit: (...args: unknown[]) => mocks.enforceScriptLlmRateLimit(...args),
  reserveScriptLlmCost: (...args: unknown[]) => mocks.reserveScriptLlmCost(...args),
}));

vi.mock('@/lib/ai/interview-completion', () => ({
  completeInterviewChat: (...args: unknown[]) => mocks.completeInterviewChat(...args),
}));

import { POST } from '@/app/api/interview/script/auto-structure/route';

function structureRequest(): Request {
  return new Request('http://localhost/api/interview/script/auto-structure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      interviewId: INTERVIEW_ID,
      turnIndex: 1,
      rawTranscript: 'I worked on a hard project and finished it.',
      displayQuestion: 'Tell me about a challenge.',
      targetRole: 'SDE',
      scriptType: 'SCRIPT_H',
    }),
  });
}

describe('auto-structure in-route LLM guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mocks.enforceScriptLlmRateLimit.mockResolvedValue(null);
    mocks.reserveScriptLlmCost.mockResolvedValue({
      ok: true,
      reservation: { estimatedCostUSD: 0.01, release: vi.fn(async () => undefined) },
    });
    mocks.ownership.mockResolvedValue({ data: { id: INTERVIEW_ID }, error: null });
    mocks.userPlan.mockResolvedValue({ data: { plan_tier: 'free' }, error: null });
    mocks.completeInterviewChat.mockResolvedValue({
      content: JSON.stringify({
        corrected_transcript: 'I worked on a hard project and finished it.',
        coaching_reference: {
          structure_notes: ['Add a clearer Result'],
          restructured_example: ['Situation…', 'Task…', 'Action…', 'Result…'],
        },
      }),
      model: 'test-model',
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    });
  });

  it('rejects unauthenticated callers before LLM', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(structureRequest());
    expect(res.status).toBe(401);
    expect(mocks.completeInterviewChat).not.toHaveBeenCalled();
  });

  it('blocks Redis-unavailable rate limit before LLM', async () => {
    mocks.enforceScriptLlmRateLimit.mockResolvedValue(
      NextResponse.json(
        { error: 'Service temporarily unavailable', code: 'rate_limit_backend_unavailable' },
        { status: 503, headers: { 'Retry-After': '30' } },
      ),
    );
    const res = await POST(structureRequest());
    expect(res.status).toBe(503);
    expect(mocks.completeInterviewChat).not.toHaveBeenCalled();
    expect(mocks.reserveScriptLlmCost).not.toHaveBeenCalled();
  });

  it('blocks cost backend unavailable before LLM', async () => {
    mocks.reserveScriptLlmCost.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        {
          error: 'Service temporarily unavailable. Please retry in a moment.',
          code: 'llm_cost_backend_unavailable',
        },
        { status: 503 },
      ),
    });
    const res = await POST(structureRequest());
    expect(res.status).toBe(503);
    expect(mocks.completeInterviewChat).not.toHaveBeenCalled();
  });
});
