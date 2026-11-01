import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * In-memory stand-in for Upstash EVAL that mirrors MULTI_WINDOW_RATE_LIMIT_LUA:
 * check every key first, increment all only if every window allows. Redis runs a
 * script atomically, so the emulation runs synchronously once the call is dispatched.
 */
const store = new Map<string, number>();
const state = { configured: true, fail: false };
const evalMock = vi.fn(async (_script: string, keys: string[], args: string[]) => {
  await Promise.resolve();
  if (state.fail) throw new Error('redis down');
  for (let i = 0; i < keys.length; i++) {
    if ((store.get(keys[i]) ?? 0) >= Number(args[i * 2])) return i + 1;
  }
  for (const key of keys) store.set(key, (store.get(key) ?? 0) + 1);
  return 0;
});

vi.mock('./client', () => ({
  default: () => ({ eval: evalMock }),
  isRedisConfigured: () => state.configured,
}));

import {
  MULTI_WINDOW_RATE_LIMIT_LUA,
  checkMultiWindowRateLimit,
  secondsUntilWindowReset,
  type RateLimitWindow,
} from './rate-limit';

const userWindows = (userId: string, ip = '1.1.1.1'): RateLimitWindow[] => [
  { key: `t:user:${userId}:hour`, windowSeconds: 3600, limit: 5 },
  { key: `t:user:${userId}:day`, windowSeconds: 86400, limit: 15 },
  { key: `t:ip:${ip}:hour`, windowSeconds: 3600, limit: 50 },
];

describe('checkMultiWindowRateLimit', () => {
  const previousVercelEnv = process.env.VERCEL_ENV;

  beforeEach(() => {
    store.clear();
    evalMock.mockClear();
    state.configured = true;
    state.fail = false;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-01T10:15:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  });

  it('script checks every window before incrementing any (no partial consumption)', () => {
    const checkLoop = MULTI_WINDOW_RATE_LIMIT_LUA.indexOf("redis.call('GET'");
    const incrLoop = MULTI_WINDOW_RATE_LIMIT_LUA.indexOf("redis.call('INCR'");
    expect(checkLoop).toBeGreaterThan(-1);
    expect(incrLoop).toBeGreaterThan(checkLoop);
  });

  it('uses one EVAL with slot-suffixed keys and limit/ttl args', async () => {
    await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true });
    expect(evalMock).toHaveBeenCalledTimes(1);
    const [, keys, args] = evalMock.mock.calls[0];
    expect(keys[0]).toMatch(/^rl:t:user:a:hour:\d+$/);
    expect(args).toEqual(['5', '7200', '15', '172800', '50', '7200']);
  });

  it('enforces the hourly cap and reports Retry-After until the window resets', async () => {
    for (let i = 0; i < 5; i++) {
      expect(await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true })).toEqual({ allowed: true });
    }
    const denied = await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true });
    expect(denied).toEqual({ allowed: false, blockedIndex: 0, retryAfterSeconds: 45 * 60 });
  });

  it('a denied request does not burn daily or IP capacity', async () => {
    for (let i = 0; i < 8; i++) await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true });
    const dailyKey = [...store.keys()].find((k) => k.includes(':day:'));
    const ipKey = [...store.keys()].find((k) => k.includes(':ip:'));
    expect(store.get(dailyKey!)).toBe(5);
    expect(store.get(ipKey!)).toBe(5);
  });

  it('opens a fresh hourly window but keeps counting the daily window', async () => {
    for (let i = 0; i < 5; i++) await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true });
    vi.setSystemTime(new Date('2026-11-01T11:00:01.000Z'));
    for (let i = 0; i < 5; i++) await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true });
    vi.setSystemTime(new Date('2026-11-01T12:00:01.000Z'));
    for (let i = 0; i < 5; i++) await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true });
    vi.setSystemTime(new Date('2026-11-01T13:00:01.000Z'));
    const denied = await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true });
    expect(denied).toMatchObject({ allowed: false, blockedIndex: 1 });
  });

  it('concurrent calls for one account never exceed the cap', async () => {
    const results = await Promise.all(
      Array.from({ length: 40 }, () => checkMultiWindowRateLimit(userWindows('a'), { failClosed: true })),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  it('accounts sharing a college IP keep independent buckets', async () => {
    const results = await Promise.all(
      ['a', 'b', 'c', 'd'].flatMap((user) =>
        Array.from({ length: 5 }, () => checkMultiWindowRateLimit(userWindows(user), { failClosed: true })),
      ),
    );
    expect(results.every((r) => r.allowed)).toBe(true);
  });

  it('the IP ceiling blocks one network cycling many accounts', async () => {
    const results: boolean[] = [];
    for (let u = 0; u < 12; u++) {
      for (let i = 0; i < 5; i++) {
        results.push((await checkMultiWindowRateLimit(userWindows(`u${u}`), { failClosed: true })).allowed);
      }
    }
    expect(results.filter(Boolean)).toHaveLength(50);
  });

  it('fails closed on Redis errors for expensive tools and open otherwise', async () => {
    state.fail = true;
    expect(await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true })).toMatchObject({
      allowed: false,
      redisUnavailable: true,
    });
    expect(await checkMultiWindowRateLimit(userWindows('a'), { failClosed: false })).toEqual({ allowed: true });
  });

  it('fails closed in production when Upstash is not configured; open locally', async () => {
    state.configured = false;
    delete process.env.VERCEL_ENV;
    expect(await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true })).toEqual({ allowed: true });
    process.env.VERCEL_ENV = 'production';
    expect(await checkMultiWindowRateLimit(userWindows('a'), { failClosed: true })).toMatchObject({
      allowed: false,
      redisUnavailable: true,
    });
    expect(evalMock).not.toHaveBeenCalled();
  });

  it('secondsUntilWindowReset is never zero', () => {
    expect(secondsUntilWindowReset(3600, Date.parse('2026-11-01T10:00:00.000Z'))).toBe(3600);
    expect(secondsUntilWindowReset(3600, Date.parse('2026-11-01T10:59:59.500Z'))).toBe(1);
  });
});
