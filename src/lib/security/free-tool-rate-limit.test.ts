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
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 2, resetInSeconds: 3600 });

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

  it('blocks when the hourly window is exhausted', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 1200,
    });

    const r = await checkAndConsumeFreeToolLimit('question-generator', '9.9.9.9', {
      failClosed: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('up to 5 question sets per hour');
    }
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'free-tool:question-generator:9.9.9.9',
      3600,
      FREE_TOOL_RATE_LIMITS['question-generator'].limit,
      { failClosed: true },
    );
  });

  it('fail-closed: Redis unavailable denies expensive free tools', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 3600,
      redisUnavailable: true,
    });

    for (const toolId of [
      'ats-checker',
      'question-generator',
      'question-generator-answer',
      'star-builder',
    ] as const) {
      const r = await checkAndConsumeFreeToolLimit(toolId, '1.1.1.1', {
        failClosed: true,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.message).toBe('Service temporarily unavailable. Please retry in a moment.');
        expect(r.message).not.toMatch(/redis|upstash|ECONNREFUSED/i);
      }
    }
  });

  it('question-generator daily cap blocks when hourly window still allows', async () => {
    checkRateLimitMock
      .mockResolvedValueOnce({ allowed: true, remaining: 2, resetInSeconds: 3600 })
      .mockResolvedValueOnce({ allowed: false, remaining: 0, resetInSeconds: 40000 });

    const r = await checkAndConsumeFreeToolLimit('question-generator', '4.4.4.4', {
      failClosed: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('up to 15 question sets per day');
    }
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      1,
      'free-tool:question-generator:4.4.4.4',
      3600,
      FREE_TOOL_RATE_LIMITS['question-generator'].limit,
      { failClosed: true },
    );
    expect(checkRateLimitMock).toHaveBeenNthCalledWith(
      2,
      'free-tool:question-generator:daily:4.4.4.4',
      86400,
      FREE_TOOL_RATE_LIMITS['question-generator'].secondary?.limit,
      { failClosed: true },
    );
  });

  it('question-generator passes when both hourly and daily windows allow', async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: true, remaining: 5, resetInSeconds: 60 });

    const r = await checkAndConsumeFreeToolLimit('question-generator', '5.5.5.5', {
      failClosed: true,
    });
    expect(r).toEqual({ ok: true });
    expect(checkRateLimitMock).toHaveBeenCalledTimes(2);
  });

  it('question-generator-answer uses a single 30/day bucket', async () => {
    checkRateLimitMock.mockResolvedValue({ allowed: false, remaining: 0, resetInSeconds: 500 });

    const r = await checkAndConsumeFreeToolLimit('question-generator-answer', '6.6.6.6', {
      failClosed: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('up to 30 answer guides per day');
    }
    expect(checkRateLimitMock).toHaveBeenCalledTimes(1);
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      'free-tool:question-generator-answer:6.6.6.6',
      86400,
      FREE_TOOL_RATE_LIMITS['question-generator-answer'].limit,
      { failClosed: true },
    );
  });

  it('recovers after provider failure when Redis allows again', async () => {
    checkRateLimitMock
      .mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetInSeconds: 30,
        redisUnavailable: true,
      })
      .mockResolvedValueOnce({ allowed: true, remaining: 4, resetInSeconds: 3600 });

    const denied = await checkAndConsumeFreeToolLimit('star-builder', '3.3.3.3', {
      failClosed: true,
    });
    expect(denied.ok).toBe(false);

    const allowed = await checkAndConsumeFreeToolLimit('star-builder', '3.3.3.3', {
      failClosed: true,
    });
    expect(allowed).toEqual({ ok: true });
  });
});
