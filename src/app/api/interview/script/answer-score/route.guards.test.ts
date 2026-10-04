import { beforeEach, describe, expect, it, vi } from 'vitest';

const USER = { id: '11111111-1111-4111-8111-111111111111' };
const INTERVIEW_ID = '33333333-3333-4333-8333-333333333333';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  enforceScriptLlmRateLimit: vi.fn(),
  reserveScriptLlmCost: vi.fn(),
  completeInterviewChat: vi.fn(),
  ownership: vi.fn(),
  existingEval: vi.fn(),
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
      chain.delete = self;
      chain.insert = vi.fn(async () => ({ error: null }));
      chain.maybeSingle = async () => {
        if (table === 'interviews') return mocks.ownership();
        if (table === 'answer_evaluations') return mocks.existingEval();
        if (table === 'users') return mocks.userPlan();
        if (table === 'script_turns') return { data: null, error: null };
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

vi.mock('@/lib/interview/answer-score/question-type', () => ({
  resolveQuestionType: async () => ({
    questionType: 'behavioral',
    typeSource: 'script',
  }),
}));

import { NextResponse } from 'next/server';
import { POST } from '@/app/api/interview/script/answer-score/route';

function scoreRequest(): Request {
  return new Request('http://localhost/api/interview/script/answer-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      interviewId: INTERVIEW_ID,
      turnIndex: 1,
      displayQuestion: 'Tell me about a challenge you faced.',
      transcript: 'I led a migration under a tight deadline and delivered on time.',
      targetRole: 'Backend Engineer',
      questionType: 'behavioral',
    }),
  });
}

describe('answer-score in-route LLM guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mocks.enforceScriptLlmRateLimit.mockResolvedValue(null);
    mocks.reserveScriptLlmCost.mockResolvedValue({
      ok: true,
      reservation: { estimatedCostUSD: 0.01, release: vi.fn(async () => undefined) },
    });
    mocks.ownership.mockResolvedValue({
      data: { id: INTERVIEW_ID, script_type: 'SCRIPT_H' },
      error: null,
    });
    mocks.existingEval.mockResolvedValue({ data: null, error: null });
    mocks.userPlan.mockResolvedValue({ data: { plan_tier: 'free' }, error: null });
    mocks.completeInterviewChat.mockResolvedValue({
      content: JSON.stringify({
        sub_rubric: 'star',
        dimensions: {
          situation: { score: 3, note: 'ok' },
          task: { score: 3, note: 'ok' },
          action: { score: 3, note: 'ok' },
          result: { score: 3, note: 'ok' },
          communication: { score: 3, note: 'ok' },
        },
        overall: 3,
        one_line_summary: 'Solid STAR answer.',
        score_suspect: false,
        suspect_reasons: [],
      }),
      model: 'test-model',
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    });
  });

  it('rejects unauthenticated callers before LLM', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(scoreRequest());
    expect(res.status).toBe(401);
    expect(mocks.completeInterviewChat).not.toHaveBeenCalled();
    expect(mocks.enforceScriptLlmRateLimit).not.toHaveBeenCalled();
  });

  it('blocks on rate limit before ownership/LLM', async () => {
    mocks.enforceScriptLlmRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'Too many scoring requests.', code: 'rate_limit_exceeded' }, { status: 429 }),
    );
    const res = await POST(scoreRequest());
    expect(res.status).toBe(429);
    expect(mocks.completeInterviewChat).not.toHaveBeenCalled();
    expect(mocks.reserveScriptLlmCost).not.toHaveBeenCalled();
  });

  it('rejects unauthorized interview ownership before LLM', async () => {
    mocks.ownership.mockResolvedValue({ data: null, error: null });
    const res = await POST(scoreRequest());
    expect(res.status).toBe(404);
    expect(mocks.completeInterviewChat).not.toHaveBeenCalled();
    expect(mocks.reserveScriptLlmCost).not.toHaveBeenCalled();
  });

  it('blocks on cost reserve before LLM', async () => {
    mocks.reserveScriptLlmCost.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: 'Monthly LLM cost limit exceeded', code: 'llm_cost_limit_exceeded' },
        { status: 429 },
      ),
    });
    const res = await POST(scoreRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('llm_cost_limit_exceeded');
    expect(mocks.completeInterviewChat).not.toHaveBeenCalled();
  });

  it('returns cached score without LLM or cost reserve', async () => {
    mocks.existingEval.mockResolvedValue({
      data: {
        dimensions: { communication: { score: 3 } },
        overall: 3.2,
        score_suspect: false,
        status: 'scored',
        transcript: 'I led a migration under a tight deadline and delivered on time.',
      },
      error: null,
    });
    const res = await POST(scoreRequest());
    expect(res.status).toBe(200);
    expect(mocks.reserveScriptLlmCost).not.toHaveBeenCalled();
    expect(mocks.completeInterviewChat).not.toHaveBeenCalled();
  });

  it('releases cost reservation when LLM fails before any response', async () => {
    const release = vi.fn(async () => undefined);
    mocks.reserveScriptLlmCost.mockResolvedValue({
      ok: true,
      reservation: { estimatedCostUSD: 0.01, release },
    });
    mocks.completeInterviewChat.mockRejectedValue(new Error('provider down'));
    const res = await POST(scoreRequest());
    expect(res.status).toBe(502);
    expect(release).toHaveBeenCalled();
  });
});
