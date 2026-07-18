import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkRateLimitMock = vi.fn();

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
}));

import {
  FREE_TOOL_RATE_LIMITS,
  checkAndConsumeFreeToolLimit,
} from '@/lib/security/free-tool-rate-limit';

describe('checkAndConsumeFreeToolLimit', () => {
  beforeEach(() => {
    checkRateLimitMock.mockReset();
  });

  it('uses Redis fixed-window limits and forwards caller failClosed (healthy path)', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: 2,
      resetInSeconds: 3600,
    });

    const r = await checkAndConsumeFreeToolLimit('ats-checker', '1.2.3.4', {
      failClosed: true,
    });
    expect(r).toEqual({ ok: true });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'free-tool:ats-checker:1.2.3.4',
      3600,
      FREE_TOOL_RATE_LIMITS['ats-checker'].limit,
      { failClosed: true },
    );
  });

  it('does not change over-limit messaging when Redis is healthy', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 1200,
    });

    const r = await checkAndConsumeFreeToolLimit('question-generator', '9.9.9.9', {
      failClosed: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('up to 5 question sets per hour');
      expect(r.message).toContain('Please wait and try again');
    }
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'free-tool:question-generator:9.9.9.9',
      3600,
      FREE_TOOL_RATE_LIMITS['question-generator'].limit,
      { failClosed: false },
    );
  });

  it('ATS fail-closed: Redis unavailable blocks the request', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 3600,
      redisUnavailable: true,
    });

    const r = await checkAndConsumeFreeToolLimit('ats-checker', '1.1.1.1', {
      failClosed: true,
    });
    expect(r).toEqual({
      ok: false,
      message: 'Service temporarily unavailable. Please retry in a moment.',
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'free-tool:ats-checker:1.1.1.1',
      3600,
      FREE_TOOL_RATE_LIMITS['ats-checker'].limit,
      { failClosed: true },
    );
  });

  it('question-generator fail-open: Redis unavailable allows the request', async () => {
    // Mirrors checkRateLimit fail-open return shape.
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: FREE_TOOL_RATE_LIMITS['question-generator'].limit,
      resetInSeconds: 3600,
    });

    const r = await checkAndConsumeFreeToolLimit('question-generator', '2.2.2.2', {
      failClosed: false,
    });
    expect(r).toEqual({ ok: true });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'free-tool:question-generator:2.2.2.2',
      3600,
      FREE_TOOL_RATE_LIMITS['question-generator'].limit,
      { failClosed: false },
    );
  });

  it('STAR builder fail-open: Redis unavailable allows the request', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: true,
      remaining: FREE_TOOL_RATE_LIMITS['star-builder'].limit,
      resetInSeconds: 3600,
    });

    const r = await checkAndConsumeFreeToolLimit('star-builder', '3.3.3.3', {
      failClosed: false,
    });
    expect(r).toEqual({ ok: true });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'free-tool:star-builder:3.3.3.3',
      3600,
      FREE_TOOL_RATE_LIMITS['star-builder'].limit,
      { failClosed: false },
    );
  });
});
