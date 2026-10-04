import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkRateLimitMock = vi.fn();
const reserveLLMCostMock = vi.fn();
const estimateMock = vi.fn(() => 0.012);

vi.mock('@/lib/redis/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/redis/rate-limit')>(
    '@/lib/redis/rate-limit',
  );
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  };
});

vi.mock('@/lib/ai/llm-cost-guard', () => ({
  estimateLLMCallCostUSD: (...args: unknown[]) => estimateMock(...args),
  reserveLLMCost: (...args: unknown[]) => reserveLLMCostMock(...args),
}));

import {
  enforceScriptLlmRateLimit,
  getScriptLlmRoutePolicy,
  reserveScriptLlmCost,
} from '@/lib/interview/script-llm-guards';

describe('script-llm-guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exposes per-route policies with positive limits', () => {
    for (const route of ['turn', 'answer_score', 'auto_structure', 'report'] as const) {
      const p = getScriptLlmRoutePolicy(route);
      expect(p.limit).toBeGreaterThan(0);
      expect(p.windowSeconds).toBe(60);
      expect(p.operation.length).toBeGreaterThan(0);
    }
  });

  it('rate limit healthy path allows', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 10,
      resetInSeconds: 60,
    });
    await expect(enforceScriptLlmRateLimit('u1', 'turn')).resolves.toBeNull();
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'script_llm:turn:u1',
      60,
      30,
      { failClosed: true },
    );
  });

  it('rate limit exhaustion returns 429', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 40,
    });
    const res = await enforceScriptLlmRateLimit('u1', 'answer_score');
    expect(res?.status).toBe(429);
    const body = await res?.json();
    expect(body.error).toMatch(/scoring/i);
    expect(body.error).not.toMatch(/redis|upstash/i);
  });

  it('rate limit Redis unavailable returns 503', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 60,
      redisUnavailable: true,
    });
    const res = await enforceScriptLlmRateLimit('u1', 'auto_structure');
    expect(res?.status).toBe(503);
    const body = await res?.json();
    expect(body.code).toBe('rate_limit_backend_unavailable');
  });

  it('cost reserve success returns releasable reservation', async () => {
    const release = vi.fn(async () => undefined);
    reserveLLMCostMock.mockResolvedValue({
      ok: true,
      estimatedCostUSD: 0.012,
      currentSpendUSD: 0.05,
      limitUSD: 0.1,
      release,
    });
    const r = await reserveScriptLlmCost('u1', 'free', 'turn');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.reservation.estimatedCostUSD).toBe(0.012);
      await r.reservation.release();
      expect(release).toHaveBeenCalled();
    }
    expect(reserveLLMCostMock).toHaveBeenCalledWith(
      'u1',
      'free',
      0.012,
      'script_turn_generation',
      { failClosed: true },
    );
  });

  it('cost limit exceeded returns 429 with stable code', async () => {
    reserveLLMCostMock.mockResolvedValue({
      ok: false,
      reason: 'Monthly LLM cost limit exceeded',
      currentSpendUSD: 0.1,
      limitUSD: 0.1,
    });
    const r = await reserveScriptLlmCost('u1', 'free', 'report');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(429);
      const body = await r.response.json();
      expect(body.code).toBe('llm_cost_limit_exceeded');
    }
  });

  it('cost Redis unavailable returns 503', async () => {
    reserveLLMCostMock.mockResolvedValue({
      ok: false,
      reason: 'Service temporarily unavailable. Please retry in a moment.',
      currentSpendUSD: 0,
      limitUSD: 5,
      redisUnavailable: true,
    });
    const r = await reserveScriptLlmCost('u1', 'pro', 'turn');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(503);
      const body = await r.response.json();
      expect(body.code).toBe('llm_cost_backend_unavailable');
    }
  });
});
