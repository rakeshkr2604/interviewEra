import getRedis, { isRedisConfigured as isRedisConfiguredImpl } from './client';

function isRedisConfigured(): boolean {
  // Test doubles that omit the export are treated as configured (pre-existing behavior).
  return typeof isRedisConfiguredImpl === 'function' ? isRedisConfiguredImpl() : true;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  /** Set when Redis is unavailable and fail-closed mode blocked the request. */
  redisUnavailable?: boolean;
}

export type RateLimitOptions = {
  /**
   * When true, deny requests if Redis is unavailable (expensive / abuse-prone routes).
   * Default false — fail open for availability on low-risk endpoints.
   */
  failClosed?: boolean;
  /**
   * How much capacity this check consumes (default 1).
   * Used by batch ingest to charge per event rather than per HTTP request.
   */
  cost?: number;
};

/**
 * Fixed-window rate limiter backed by Upstash Redis (slot = floor(now/window)).
 * @param key      Unique cache key, e.g. `start:${userId}`
 * @param windowSeconds  Length of the time window
 * @param maxRequests    Maximum allowed cost units within the window
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const { failClosed = false } = options;
  const cost = Math.max(1, Math.min(100, Math.floor(options.cost ?? 1)));

  // Unconfigured Redis (typical local): fail-open even for failClosed callers.
  // Production must configure Upstash; failClosed applies on Redis errors below.
  if (!isRedisConfigured()) {
    return { allowed: true, remaining: maxRequests, resetInSeconds: windowSeconds };
  }

  try {
    const redis = getRedis();
    const windowSlot = Math.floor(Date.now() / (windowSeconds * 1000));
    const redisKey = `rl:${key}:${windowSlot}`;

    const pipeline = redis.pipeline();
    if (cost === 1) {
      pipeline.incr(redisKey);
    } else {
      pipeline.incrby(redisKey, cost);
    }
    pipeline.expire(redisKey, windowSeconds * 2); // 2x window as safety buffer
    const [count] = await pipeline.exec<[number, number]>();

    const remaining = Math.max(0, maxRequests - count);
    const resetInSeconds = windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);

    return { allowed: count <= maxRequests, remaining, resetInSeconds };
  } catch (err) {
    if (failClosed) {
      console.error('[rate-limit] Redis error, failing closed:', err);
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: windowSeconds,
        redisUnavailable: true,
      };
    }

    console.error('[rate-limit] Redis error, failing open:', err);
    return { allowed: true, remaining: maxRequests, resetInSeconds: windowSeconds };
  }
}

export type RateLimitWindow = {
  /** Logical key without window slot, e.g. `free-tool:ats-checker:user:<uuid>:hour`. */
  key: string;
  windowSeconds: number;
  limit: number;
};

export type MultiWindowRateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      /** Index into the input windows that denied; -1 when Redis was unavailable. */
      blockedIndex: number;
      retryAfterSeconds: number;
      redisUnavailable?: boolean;
    };

/**
 * All-or-nothing: denies when ANY window is full, and increments every window only
 * when all allow. Runs as one Lua script so concurrent requests cannot overshoot and
 * a denied request never burns capacity in the windows that still had room.
 * Returns 0 when allowed, else the 1-based index of the first full window.
 */
export const MULTI_WINDOW_RATE_LIMIT_LUA = `
for i = 1, #KEYS do
  local c = tonumber(redis.call('GET', KEYS[i]) or '0')
  if c >= tonumber(ARGV[i * 2 - 1]) then return i end
end
for i = 1, #KEYS do
  redis.call('INCR', KEYS[i])
  redis.call('EXPIRE', KEYS[i], tonumber(ARGV[i * 2]))
end
return 0
`;

export function secondsUntilWindowReset(windowSeconds: number, nowMs: number = Date.now()): number {
  return Math.max(1, windowSeconds - (Math.floor(nowMs / 1000) % windowSeconds));
}

export async function checkMultiWindowRateLimit(
  windows: readonly RateLimitWindow[],
  options: { failClosed: boolean },
): Promise<MultiWindowRateLimitResult> {
  if (windows.length === 0) return { allowed: true };
  const longestWindow = Math.max(...windows.map((w) => w.windowSeconds));

  if (!isRedisConfigured()) {
    // Local / CI fail-open for DX. A production deploy without Upstash must not
    // hand out unmetered AI calls, so fail-closed callers are denied there.
    if (options.failClosed && process.env.VERCEL_ENV === 'production') {
      console.error('[rate-limit] Upstash not configured in production; failing closed');
      return { allowed: false, blockedIndex: -1, retryAfterSeconds: 60, redisUnavailable: true };
    }
    return { allowed: true };
  }

  try {
    const nowMs = Date.now();
    const keys = windows.map(
      (w) => `rl:${w.key}:${Math.floor(nowMs / (w.windowSeconds * 1000))}`,
    );
    const args = windows.flatMap((w) => [String(w.limit), String(w.windowSeconds * 2)]);
    const raw = await getRedis().eval<string[], number>(MULTI_WINDOW_RATE_LIMIT_LUA, keys, args);
    const blocked = Number(raw);
    if (blocked === 0) return { allowed: true };
    const index = blocked - 1;
    return {
      allowed: false,
      blockedIndex: index,
      retryAfterSeconds: secondsUntilWindowReset(windows[index]?.windowSeconds ?? longestWindow, nowMs),
    };
  } catch (err) {
    if (options.failClosed) {
      console.error('[rate-limit] Redis error, failing closed:', err);
      return { allowed: false, blockedIndex: -1, retryAfterSeconds: 60, redisUnavailable: true };
    }
    console.error('[rate-limit] Redis error, failing open:', err);
    return { allowed: true };
  }
}

/** HTTP 503 payload when rate limiting cannot run (Redis down, fail-closed). */
export function rateLimitUnavailableResponse(resetInSeconds: number) {
  return {
    error: 'Service temporarily unavailable. Please retry in a moment.',
    code: 'rate_limit_backend_unavailable',
    retryAfterSeconds: resetInSeconds,
  };
}

/** Returns HTTP status/body when limited, or null if allowed. */
export function buildRateLimitHttpResponse(
  rateLimit: RateLimitResult,
  tooManyMessage: string,
): { status: number; body: Record<string, unknown>; headers: Record<string, string> } | null {
  if (rateLimit.allowed) return null;

  if (rateLimit.redisUnavailable) {
    return {
      status: 503,
      body: rateLimitUnavailableResponse(rateLimit.resetInSeconds),
      headers: { 'Retry-After': String(rateLimit.resetInSeconds) },
    };
  }

  return {
    status: 429,
    body: { error: tooManyMessage },
    headers: { 'Retry-After': String(rateLimit.resetInSeconds) },
  };
}
