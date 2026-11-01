import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkMultiWindowRateLimitMock = vi.fn();

vi.mock('@/lib/redis/rate-limit', () => ({
  checkMultiWindowRateLimit: (...args: unknown[]) => checkMultiWindowRateLimitMock(...args),
}));

import {
  FREE_TIER_TOOL_LIMITS,
  IP_ABUSE_TOOL_LIMITS,
  PAID_TIER_TOOL_LIMITS,
  RATE_LIMIT_UNAVAILABLE_MESSAGE,
  buildFreeToolWindows,
  checkAndConsumeFreeToolLimit,
  formatRetryAfter,
  type FreeToolId,
} from '@/lib/security/free-tool-rate-limit';

const SUBJECT = { userId: 'user-a', ip: '10.0.0.1', tier: 'free' as const };

describe('fair-use policy tables', () => {
  it('matches the approved per-account Free limits', () => {
    expect(FREE_TIER_TOOL_LIMITS).toEqual({
      'ats-checker': { hourly: 5, daily: 15 },
      'question-generator': { hourly: 5, daily: 15 },
      'question-generator-answer': { hourly: 10, daily: 30 },
      'star-builder': { hourly: 5, daily: 15 },
      'prompt-builder': { hourly: 20, daily: 40 },
    });
  });

  it('never gives paid tiers less than Free or than the pre-launch per-IP policy', () => {
    const legacy: Record<FreeToolId, { hourly: number; daily: number }> = {
      'ats-checker': { hourly: 3, daily: 3 * 24 },
      'question-generator': { hourly: 5, daily: 15 },
      'question-generator-answer': { hourly: 30, daily: 30 },
      'star-builder': { hourly: 5, daily: 5 * 24 },
      'prompt-builder': { hourly: 40, daily: 40 * 24 },
    };
    for (const tool of Object.keys(FREE_TIER_TOOL_LIMITS) as FreeToolId[]) {
      const paid = PAID_TIER_TOOL_LIMITS[tool];
      expect(paid.hourly).toBeGreaterThanOrEqual(FREE_TIER_TOOL_LIMITS[tool].hourly);
      expect(paid.daily).toBeGreaterThanOrEqual(FREE_TIER_TOOL_LIMITS[tool].daily);
      expect(paid.hourly).toBeGreaterThanOrEqual(legacy[tool].hourly);
      expect(paid.daily).toBeGreaterThanOrEqual(legacy[tool].daily);
    }
  });

  it('keeps the shared-IP ceiling well above one account so a hostel network is not blocked', () => {
    for (const tool of Object.keys(FREE_TIER_TOOL_LIMITS) as FreeToolId[]) {
      expect(IP_ABUSE_TOOL_LIMITS[tool].hourly).toBeGreaterThanOrEqual(FREE_TIER_TOOL_LIMITS[tool].hourly * 10);
      expect(IP_ABUSE_TOOL_LIMITS[tool].daily).toBeGreaterThanOrEqual(FREE_TIER_TOOL_LIMITS[tool].daily * 10);
    }
  });
});

describe('buildFreeToolWindows', () => {
  it('keys the primary hourly + daily windows on the verified account id, IP second', () => {
    const windows = buildFreeToolWindows('ats-checker', SUBJECT);
    expect(windows).toEqual([
      { key: 'free-tool:ats-checker:user:user-a:hour', windowSeconds: 3600, limit: 5 },
      { key: 'free-tool:ats-checker:user:user-a:day', windowSeconds: 86400, limit: 15 },
      { key: 'free-tool:ats-checker:ip:10.0.0.1:hour', windowSeconds: 3600, limit: 50 },
      { key: 'free-tool:ats-checker:ip:10.0.0.1:day', windowSeconds: 86400, limit: 150 },
    ]);
  });

  it('isolates accounts: two users on the same IP get different user buckets', () => {
    const a = buildFreeToolWindows('star-builder', SUBJECT);
    const b = buildFreeToolWindows('star-builder', { ...SUBJECT, userId: 'user-b' });
    expect(a[0].key).not.toBe(b[0].key);
    expect(a[1].key).not.toBe(b[1].key);
    expect(a[2].key).toBe(b[2].key);
  });

  it('applies paid limits to paid tiers', () => {
    const windows = buildFreeToolWindows('prompt-builder', { ...SUBJECT, tier: 'paid' });
    expect(windows[0].limit).toBe(40);
    expect(windows[1].limit).toBe(960);
  });
});

describe('checkAndConsumeFreeToolLimit', () => {
  beforeEach(() => checkMultiWindowRateLimitMock.mockReset());

  it('allows and forwards failClosed to the atomic limiter in a single call', async () => {
    checkMultiWindowRateLimitMock.mockResolvedValue({ allowed: true });
    const r = await checkAndConsumeFreeToolLimit('question-generator', SUBJECT, { failClosed: true });
    expect(r).toEqual({ ok: true });
    expect(checkMultiWindowRateLimitMock).toHaveBeenCalledTimes(1);
    expect(checkMultiWindowRateLimitMock).toHaveBeenCalledWith(
      buildFreeToolWindows('question-generator', SUBJECT),
      { failClosed: true },
    );
  });

  it('returns an hourly message with Retry-After seconds when the hourly window blocks', async () => {
    checkMultiWindowRateLimitMock.mockResolvedValue({ allowed: false, blockedIndex: 0, retryAfterSeconds: 1380 });
    const r = await checkAndConsumeFreeToolLimit('ats-checker', SUBJECT, { failClosed: true });
    expect(r).toMatchObject({ ok: false, code: 'RATE_LIMITED', retryAfterSeconds: 1380 });
    if (!r.ok) {
      expect(r.message).toContain('5 ATS checks for this hour');
      expect(r.message).toContain('23 minutes');
      expect(r.message).toContain('never use your mock-interview credits');
    }
  });

  it('returns a daily message when the daily window blocks', async () => {
    checkMultiWindowRateLimitMock.mockResolvedValue({ allowed: false, blockedIndex: 1, retryAfterSeconds: 7200 });
    const r = await checkAndConsumeFreeToolLimit('question-generator', SUBJECT, { failClosed: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("today's fair-use limit of 15 question sets");
  });

  it('returns a network message when the IP abuse ceiling blocks', async () => {
    checkMultiWindowRateLimitMock.mockResolvedValue({ allowed: false, blockedIndex: 2, retryAfterSeconds: 60 });
    const r = await checkAndConsumeFreeToolLimit('star-builder', SUBJECT, { failClosed: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('your network');
  });

  it('fails closed with a generic message when Redis is unavailable', async () => {
    checkMultiWindowRateLimitMock.mockResolvedValue({
      allowed: false,
      blockedIndex: -1,
      retryAfterSeconds: 60,
      redisUnavailable: true,
    });
    const r = await checkAndConsumeFreeToolLimit('ats-checker', SUBJECT, { failClosed: true });
    expect(r).toEqual({
      ok: false,
      code: 'RATE_LIMIT_UNAVAILABLE',
      message: RATE_LIMIT_UNAVAILABLE_MESSAGE,
      retryAfterSeconds: 60,
    });
  });
});

describe('formatRetryAfter', () => {
  it('formats short, minute and hour waits', () => {
    expect(formatRetryAfter(30)).toBe('about a minute');
    expect(formatRetryAfter(600)).toBe('10 minutes');
    expect(formatRetryAfter(7200)).toBe('2 hours');
  });
});
