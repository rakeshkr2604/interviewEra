import getRedis, { isRedisConfigured } from './client';

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
};

/**
 * Sliding-window rate limiter backed by Upstash Redis.
 * @param key      Unique cache key, e.g. `start:${userId}`
 * @param windowSeconds  Length of the time window
 * @param maxRequests    Maximum allowed requests within the window
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number,
  options: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const { failClosed = false } = options;

  if (typeof isRedisConfigured === 'function' && !isRedisConfigured()) {
    return { allowed: true, remaining: maxRequests, resetInSeconds: windowSeconds };
  }

  try {
    const redis = getRedis();
    const windowSlot = Math.floor(Date.now() / (windowSeconds * 1000));
    const redisKey = `rl:${key}:${windowSlot}`;

    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
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
