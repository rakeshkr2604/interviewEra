/**
 * Diagnostics-specific rate-limit gate.
 *
 * Does NOT change global checkRateLimit defaults used by payments/STT/start/etc.
 *
 * Policy (bounded writes):
 * - Redis unconfigured / placeholder → deny (drop ingest; no DB write)
 * - Redis configured but errors/timeouts → deny via failClosed
 * - Healthy Redis → charge per-event cost against user + interview windows
 */

import { isRedisConfigured } from '@/lib/redis/client';
import { checkRateLimit } from '@/lib/redis/rate-limit';

export type DiagnosticRateLimitDecision = {
  allowed: boolean;
  reason?:
    | 'redis_unconfigured'
    | 'user_limited'
    | 'interview_limited'
    | 'redis_unavailable';
};

export async function checkDiagnosticIngestRateLimit(args: {
  userId: string;
  interviewId: string;
  eventCost: number;
  userWindowSeconds?: number;
  userMaxEvents?: number;
  interviewWindowSeconds?: number;
  interviewMaxEvents?: number;
}): Promise<DiagnosticRateLimitDecision> {
  const {
    userId,
    interviewId,
    eventCost,
    userWindowSeconds = 60,
    userMaxEvents = 60,
    interviewWindowSeconds = 60,
    interviewMaxEvents = 40,
  } = args;

  const cost = Math.max(1, Math.min(100, Math.floor(eventCost)));

  if (!isRedisConfigured()) {
    return { allowed: false, reason: 'redis_unconfigured' };
  }

  const userRl = await checkRateLimit(`diag:user:${userId}`, userWindowSeconds, userMaxEvents, {
    failClosed: true,
    cost,
  });
  if (!userRl.allowed) {
    return {
      allowed: false,
      reason: userRl.redisUnavailable ? 'redis_unavailable' : 'user_limited',
    };
  }

  const ivRl = await checkRateLimit(
    `diag:iv:${interviewId}`,
    interviewWindowSeconds,
    interviewMaxEvents,
    { failClosed: true, cost },
  );
  if (!ivRl.allowed) {
    return {
      allowed: false,
      reason: ivRl.redisUnavailable ? 'redis_unavailable' : 'interview_limited',
    };
  }

  return { allowed: true };
}
