import getRedis from './client';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

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
): Promise<RateLimitResult> {
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
    // Fail open: if Redis is down, allow the request rather than breaking the app
    console.error('[rate-limit] Redis error, failing open:', err);
    return { allowed: true, remaining: maxRequests, resetInSeconds: windowSeconds };
  }
}
