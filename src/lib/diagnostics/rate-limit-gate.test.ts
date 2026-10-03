import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  redisConfigured: true,
  rateAllowed: true,
  redisUnavailable: false,
  calls: [] as Array<{ key: string; cost?: number; failClosed?: boolean }>,
}));

vi.mock('@/lib/redis/client', () => ({
  isRedisConfigured: () => state.redisConfigured,
}));

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: async (
    key: string,
    _window: number,
    _max: number,
    options?: { failClosed?: boolean; cost?: number },
  ) => {
    state.calls.push({
      key,
      cost: options?.cost,
      failClosed: options?.failClosed,
    });
    return {
      allowed: state.rateAllowed,
      remaining: 0,
      resetInSeconds: 60,
      redisUnavailable: state.redisUnavailable || undefined,
    };
  },
}));

import { checkDiagnosticIngestRateLimit } from '@/lib/diagnostics/rate-limit-gate';

describe('checkDiagnosticIngestRateLimit', () => {
  beforeEach(() => {
    state.redisConfigured = true;
    state.rateAllowed = true;
    state.redisUnavailable = false;
    state.calls = [];
  });

  it('denies when Redis is unconfigured (diagnostics-specific; no unbounded writes)', async () => {
    state.redisConfigured = false;
    const result = await checkDiagnosticIngestRateLimit({
      userId: 'u1',
      interviewId: 'i1',
      eventCost: 3,
    });
    expect(result).toEqual({ allowed: false, reason: 'redis_unconfigured' });
    expect(state.calls).toHaveLength(0);
  });

  it('charges per-event cost with failClosed when Redis is healthy', async () => {
    const result = await checkDiagnosticIngestRateLimit({
      userId: 'u1',
      interviewId: 'i1',
      eventCost: 4,
    });
    expect(result.allowed).toBe(true);
    expect(state.calls).toHaveLength(2);
    expect(state.calls[0]).toMatchObject({
      key: 'diag:user:u1',
      cost: 4,
      failClosed: true,
    });
    expect(state.calls[1]).toMatchObject({
      key: 'diag:iv:i1',
      cost: 4,
      failClosed: true,
    });
  });

  it('denies when Redis is configured but unavailable', async () => {
    state.rateAllowed = false;
    state.redisUnavailable = true;
    const result = await checkDiagnosticIngestRateLimit({
      userId: 'u1',
      interviewId: 'i1',
      eventCost: 1,
    });
    expect(result).toEqual({ allowed: false, reason: 'redis_unavailable' });
  });
});
