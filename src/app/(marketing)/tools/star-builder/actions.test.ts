import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkAndConsumeFreeToolLimitMock = vi.fn();
const completeFreeToolChatChainMock = vi.fn();
const logToolUsageMock = vi.fn();

vi.mock('@/lib/security/free-tool-rate-limit', () => ({
  checkAndConsumeFreeToolLimit: (...args: unknown[]) =>
    checkAndConsumeFreeToolLimitMock(...args),
}));

const requireFreeToolUserMock = vi.fn();

vi.mock('@/lib/security/free-tool-access', () => ({
  requireFreeToolUser: () => requireFreeToolUserMock(),
  clientIpFromHeaders: (h: Headers) => h.get('x-forwarded-for') ?? 'unknown',
}));

vi.mock('@/lib/analytics/free-tool-events', () => ({
  recordFreeToolCompleted: () => undefined,
}));


vi.mock('@/lib/ai/tool-chat-completion', () => ({
  isFreeToolAiConfigured: () => true,
  completeFreeToolChatChain: (...args: unknown[]) => completeFreeToolChatChainMock(...args),
}));

vi.mock('@/lib/telemetry/tool-usage-logger', () => ({
  isSignedInFromHeaders: () => false,
  logToolUsage: (...args: unknown[]) => logToolUsageMock(...args),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.10' }),
}));

import { buildStarAction } from './actions';

function starFormData(): FormData {
  const fd = new FormData();
  fd.set('targetRole', 'Backend Engineer');
  fd.set('level', 'fresher');
  fd.set('domain', 'general');
  fd.set('situation', 'A production incident took down checkout for 20 minutes.');
  fd.set('task', 'I needed to identify and roll back the bad deploy fast.');
  fd.set('action', 'I checked recent deploys, found the offending change, and reverted it.');
  fd.set('result', 'Checkout was restored within 8 minutes and we added a rollback runbook.');
  return fd;
}

const VALID_LLM_JSON = JSON.stringify({
  polished_answer:
    'When our checkout service went down for twenty minutes during a peak traffic window, I owned the incident response end to end. I quickly reviewed recent deploys, isolated the change that broke checkout, and rolled it back within minutes. Checkout was fully restored in eight minutes, and I followed up by writing a rollback runbook so the team could respond even faster next time. This experience sharpened my instinct for fast, methodical debugging under pressure.',
  scores: { structure: 8, specificity: 7, impact: 8 },
  suggestions: ['Mention the monitoring tool that surfaced the incident.', 'Quantify user impact in numbers.'],
});

describe('buildStarAction — error-event logging on primary-AI failure (dashboard visibility fix)', () => {
  beforeEach(() => {
    requireFreeToolUserMock.mockReset().mockResolvedValue({ ok: true, userId: 'u1', tier: 'free' });
    checkAndConsumeFreeToolLimitMock.mockReset().mockResolvedValue({ ok: true });
    completeFreeToolChatChainMock.mockReset();
    logToolUsageMock.mockReset();
  });

  it('logs event: "run" (not "error") on a clean success', async () => {
    completeFreeToolChatChainMock.mockResolvedValue(VALID_LLM_JSON);

    const state = await buildStarAction({}, starFormData());

    expect(state.result).toBeDefined();
    expect(state.notice).toBeUndefined();
    expect(logToolUsageMock).toHaveBeenCalledTimes(1);
    expect(logToolUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'star', event: 'run' }),
    );
  });

  it('logs event: "error" when completeFreeToolChatChain throws (OpenRouter failure)', async () => {
    completeFreeToolChatChainMock.mockRejectedValue(new Error('OpenRouter 503'));

    const state = await buildStarAction({}, starFormData());

    // Degraded but still returns a usable offline draft — degrade-don't-fail.
    expect(state.result).toBeDefined();
    expect(state.notice).toMatch(/AI is over quota or unavailable/i);
    expect(logToolUsageMock).toHaveBeenCalledTimes(1);
    expect(logToolUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'star', event: 'error' }),
    );
    // Must NOT also fire a 'run' event for a degraded response.
    expect(logToolUsageMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'run' }),
    );
  });

  it('logs event: "error" when the model returns unusable JSON (no throw, but unparseable)', async () => {
    completeFreeToolChatChainMock.mockResolvedValue('not valid json at all');

    const state = await buildStarAction({}, starFormData());

    expect(state.result).toBeDefined();
    expect(state.notice).toMatch(/AI is over quota or unavailable/i);
    expect(logToolUsageMock).toHaveBeenCalledTimes(1);
    expect(logToolUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'star', event: 'error' }),
    );
  });

  it('logs event: "error" when polishedAnswer is below the minimum length gate', async () => {
    completeFreeToolChatChainMock.mockResolvedValue(
      JSON.stringify({
        polished_answer: 'Too short.',
        scores: { structure: 5, specificity: 5, impact: 5 },
        suggestions: ['a', 'b'],
      }),
    );

    const state = await buildStarAction({}, starFormData());

    expect(state.notice).toMatch(/AI is over quota or unavailable/i);
    expect(logToolUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'star', event: 'error' }),
    );
  });
});

describe('buildStarAction — verified account required', () => {
  beforeEach(() => {
    requireFreeToolUserMock.mockReset().mockResolvedValue({
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Create a free InterviewEra account or sign in to use this tool.',
      status: 401,
    });
    checkAndConsumeFreeToolLimitMock.mockReset();
    completeFreeToolChatChainMock.mockReset();
  });

  it('returns AUTH_REQUIRED before rate limiting or any AI / parsing work', async () => {
    const state = await buildStarAction({}, starFormData());
    expect(state.code).toBe('AUTH_REQUIRED');
    expect(state.error).toMatch(/sign in/i);
    expect(checkAndConsumeFreeToolLimitMock).not.toHaveBeenCalled();
    expect(completeFreeToolChatChainMock).not.toHaveBeenCalled();
    expect(completeFreeToolChatChainMock).not.toHaveBeenCalled();
  });
});
