import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMock = vi.fn();
const incrbyfloatMock = vi.fn();
const expireMock = vi.fn();
const execMock = vi.fn();
const isRedisConfiguredMock = vi.fn();

vi.mock('@/lib/redis/client', () => ({
  default: () => {
    const pipeline = {
      incrbyfloat: (...args: unknown[]) => {
        incrbyfloatMock(...args);
        return pipeline;
      },
      expire: (...args: unknown[]) => {
        expireMock(...args);
        return pipeline;
      },
      exec: (...args: unknown[]) => execMock(...args),
    };
    return {
      get: (...args: unknown[]) => getMock(...args),
      incrbyfloat: (...args: unknown[]) => incrbyfloatMock(...args),
      expire: (...args: unknown[]) => expireMock(...args),
      pipeline: () => pipeline,
    };
  },
  isRedisConfigured: () => isRedisConfiguredMock(),
}));

vi.mock('@/lib/observability/ai-telemetry', () => ({
  emitAiTelemetry: vi.fn(),
}));

import {
  checkLLMCostGuard,
  releaseLLMCostReservation,
  reserveLLMCost,
} from '@/lib/ai/llm-cost-guard';

describe('llm-cost-guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRedisConfiguredMock.mockReturnValue(true);
  });

  it('checkLLMCostGuard allows when under budget', async () => {
    getMock.mockResolvedValue(0.01);
    const r = await checkLLMCostGuard('u1', 'free', 0.01, 'answer_score');
    expect(r.allowed).toBe(true);
  });

  it('checkLLMCostGuard blocks when over budget', async () => {
    getMock.mockResolvedValue(0.099);
    const r = await checkLLMCostGuard('u1', 'free', 0.02, 'answer_score');
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/Monthly LLM cost limit/i);
  });

  it('checkLLMCostGuard fail-open on Redis error by default', async () => {
    getMock.mockRejectedValue(new Error('ECONNREFUSED'));
    const r = await checkLLMCostGuard('u1', 'free', 0.01, 'answer_score');
    expect(r.allowed).toBe(true);
  });

  it('checkLLMCostGuard fail-closed on Redis error when requested', async () => {
    getMock.mockRejectedValue(new Error('timeout'));
    const r = await checkLLMCostGuard('u1', 'free', 0.01, 'answer_score', {
      failClosed: true,
    });
    expect(r.allowed).toBe(false);
    expect(r.redisUnavailable).toBe(true);
    expect(r.reason).not.toMatch(/timeout|ECONNREFUSED|redis/i);
  });

  it('allows when Redis is not configured (local DX)', async () => {
    isRedisConfiguredMock.mockReturnValue(false);
    const r = await reserveLLMCost('u1', 'free', 0.05, 'answer_score', {
      failClosed: true,
    });
    expect(r.ok).toBe(true);
  });

  it('reserveLLMCost atomically blocks over budget and rolls back', async () => {
    // After incr, total exceeds free $0.10 limit
    execMock.mockResolvedValue([0.15, 'OK']);
    incrbyfloatMock.mockResolvedValue(0.05); // rollback

    const r = await reserveLLMCost('u1', 'free', 0.05, 'answer_score', {
      failClosed: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/Monthly LLM cost limit/i);
    }
    expect(incrbyfloatMock).toHaveBeenCalled();
  });

  it('reserveLLMCost succeeds under budget and release refunds', async () => {
    execMock.mockResolvedValue([0.05, 'OK']);
    incrbyfloatMock.mockResolvedValue(0);

    const r = await reserveLLMCost('u1', 'free', 0.05, 'answer_score', {
      failClosed: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      await r.release();
      await r.release(); // idempotent
    }
    expect(incrbyfloatMock).toHaveBeenCalledWith(expect.stringContaining('llm_cost:u1:'), -0.05);
  });

  it('reserveLLMCost concurrent second call can lose after first consumes budget', async () => {
    // Simulate two parallel incrs: first lands at 0.08, second at 0.13 over $0.10 free cap.
    let calls = 0;
    execMock.mockImplementation(async () => {
      calls += 1;
      return calls === 1 ? [0.08, 'OK'] : [0.13, 'OK'];
    });
    incrbyfloatMock.mockResolvedValue(0);

    const [a, b] = await Promise.all([
      reserveLLMCost('u1', 'free', 0.05, 'answer_score', { failClosed: true }),
      reserveLLMCost('u1', 'free', 0.05, 'answer_score', { failClosed: true }),
    ]);
    const oks = [a.ok, b.ok];
    expect(oks.filter(Boolean)).toHaveLength(1);
    expect(oks.filter((x) => !x)).toHaveLength(1);
  });

  it('reserveLLMCost fail-closed on Redis pipeline error', async () => {
    execMock.mockRejectedValue(new Error('upstash down'));
    const r = await reserveLLMCost('u1', 'pro', 0.01, 'script_turn_generation', {
      failClosed: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.redisUnavailable).toBe(true);
      expect(r.reason).not.toMatch(/upstash/i);
    }
  });

  it('releaseLLMCostReservation is best-effort', async () => {
    incrbyfloatMock.mockRejectedValue(new Error('down'));
    await expect(releaseLLMCostReservation('u1', 0.01)).resolves.toBeUndefined();
  });
});
