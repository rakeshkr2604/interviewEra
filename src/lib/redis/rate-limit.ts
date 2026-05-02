import getRedis from './client';

// 5 answer submissions per user per 10-second window.
// Prevents a single user hammering /api/interview/answer under load.
const WINDOW_SECONDS = 10;
const MAX_REQUESTS = 5;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
    const windowSlot = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
    const key = `rl:answer:${userId}:${windowSlot}`;

    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, WINDOW_SECONDS * 2); // 2x window as safety buffer
    const [count] = await pipeline.exec<[number, number]>();

    const remaining = Math.max(0, MAX_REQUESTS - count);
    const resetInSeconds = WINDOW_SECONDS - (Math.floor(Date.now() / 1000) % WINDOW_SECONDS);

    return { allowed: count <= MAX_REQUESTS, remaining, resetInSeconds };
  } catch (err) {
    // Fail open: if Redis is down, allow the request rather than breaking interviews
    console.error('[rate-limit] Redis error, failing open:', err);
    return { allowed: true, remaining: MAX_REQUESTS, resetInSeconds: WINDOW_SECONDS };
  }
}