/**
 * Voice quota enforcement backed by Upstash Redis.
 *
 * Redis key schema (all values are integers):
 *   vq:stt:{user_id}:{YYYY-MM}   → seconds used this month
 *   vq:tts:{user_id}:{YYYY-MM}   → chars used this month
 *   vs:active:{user_id}          → concurrent session count (INCR/DECR)
 *
 * TTL strategy:
 *   Monthly keys: expire at start of next month + 2 days (safety buffer)
 *   Active session keys: expire after 30 min (hard ceiling, orphan protection)
 */

import getRedis, { isRedisConfigured } from '@/lib/redis/client';
import { getPlanLimits, getWarningLevel } from '@/lib/quota/plan-limits';
import type { QuotaWarningLevel, PlanTier } from '@/lib/quota/plan-limits';

// Max voice session duration — orphaned sessions auto-expire after this
const ACTIVE_SESSION_TTL_SECONDS = 30 * 60;

function monthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function secondsUntilNextMonth(): number {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000) + 172_800; // +2 day buffer
}

// ─── STT Quota ───────────────────────────────────────────────────────────────

export interface STTQuotaCheck {
  allowed: boolean;
  used_seconds: number;
  limit_seconds: number;
  warning: QuotaWarningLevel;
  remaining_seconds: number;
}

export async function checkSTTQuota(
  userId: string,
  planTier: PlanTier,
  requestedSeconds = 0,
): Promise<STTQuotaCheck> {
  const limits = getPlanLimits(planTier);
  const limit = limits.stt_seconds_per_month;

  if (!isRedisConfigured()) {
    return { allowed: true, used_seconds: 0, limit_seconds: limit, warning: 'ok', remaining_seconds: limit };
  }

  try {
    const redis = getRedis();
    const key = `vq:stt:${userId}:${monthKey()}`;
    const used = Number(await redis.get(key) ?? 0);
    const warning = getWarningLevel(used + requestedSeconds, limit, limits.warning_threshold);

    return {
      allowed:           used + requestedSeconds <= limit,
      used_seconds:      used,
      limit_seconds:     limit,
      warning,
      remaining_seconds: Math.max(0, limit - used),
    };
  } catch {
    // Redis down: fail open (don't block interviews)
    return { allowed: true, used_seconds: 0, limit_seconds: limit, warning: 'ok', remaining_seconds: limit };
  }
}

export async function recordSTTUsage(userId: string, seconds: number): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    const key = `vq:stt:${userId}:${monthKey()}`;
    const pipeline = redis.pipeline();
    pipeline.incrby(key, Math.ceil(seconds));
    pipeline.expire(key, secondsUntilNextMonth());
    await pipeline.exec();
  } catch (err) {
    console.error('[voice-quota] STT record failed:', err);
  }
}

// ─── TTS Quota ───────────────────────────────────────────────────────────────

export interface TTSQuotaCheck {
  allowed: boolean;
  used_chars: number;
  limit_chars: number;
  warning: QuotaWarningLevel;
  remaining_chars: number;
}

export async function checkTTSQuota(
  userId: string,
  planTier: PlanTier,
  requestedChars = 0,
): Promise<TTSQuotaCheck> {
  const limits = getPlanLimits(planTier);
  const limit = limits.tts_chars_per_month;

  if (!isRedisConfigured()) {
    return { allowed: true, used_chars: 0, limit_chars: limit, warning: 'ok', remaining_chars: limit };
  }

  try {
    const redis = getRedis();
    const key = `vq:tts:${userId}:${monthKey()}`;
    const used = Number(await redis.get(key) ?? 0);
    const warning = getWarningLevel(used + requestedChars, limit, limits.warning_threshold);

    return {
      allowed:        used + requestedChars <= limit,
      used_chars:     used,
      limit_chars:    limit,
      warning,
      remaining_chars: Math.max(0, limit - used),
    };
  } catch {
    return { allowed: true, used_chars: 0, limit_chars: limit, warning: 'ok', remaining_chars: limit };
  }
}

export async function recordTTSUsage(userId: string, chars: number): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    const key = `vq:tts:${userId}:${monthKey()}`;
    const pipeline = redis.pipeline();
    pipeline.incrby(key, chars);
    pipeline.expire(key, secondsUntilNextMonth());
    await pipeline.exec();
  } catch (err) {
    console.error('[voice-quota] TTS record failed:', err);
  }
}

// ─── Concurrent session enforcement ─────────────────────────────────────────

export interface ConcurrencyCheck {
  allowed: boolean;
  active_sessions: number;
  max_sessions: number;
}

export async function checkAndAcquireSession(
  userId: string,
  planTier: PlanTier,
): Promise<ConcurrencyCheck> {
  const limits = getPlanLimits(planTier);
  const maxSessions = limits.max_concurrent_sessions;

  if (!isRedisConfigured()) {
    return { allowed: true, active_sessions: 0, max_sessions: maxSessions };
  }

  try {
    const redis = getRedis();
    const key = `vs:active:${userId}`;
    const current = Number(await redis.get(key) ?? 0);

    if (current >= maxSessions) {
      return { allowed: false, active_sessions: current, max_sessions: maxSessions };
    }

    // Atomically increment — set TTL so orphaned sessions self-clean
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ACTIVE_SESSION_TTL_SECONDS);
    const [newCount] = await pipeline.exec<[number, number]>();

    // Double-check after increment (handles race between two parallel requests)
    if (newCount > maxSessions) {
      void redis.decr(key); // rollback
      return { allowed: false, active_sessions: newCount - 1, max_sessions: maxSessions };
    }

    return { allowed: true, active_sessions: newCount, max_sessions: maxSessions };
  } catch {
    return { allowed: true, active_sessions: 0, max_sessions: maxSessions };
  }
}

export async function releaseSession(userId: string): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    const key = `vs:active:${userId}`;
    const current = Number(await redis.get(key) ?? 0);
    if (current > 0) await redis.decr(key);
  } catch (err) {
    console.error('[voice-quota] Session release failed:', err);
  }
}

// ─── Per-interview hard ceilings ─────────────────────────────────────────────

export function enforcePerInterviewTTSLimit(
  chars: number,
  planTier: PlanTier,
): { clamped: number; was_clamped: boolean } {
  const limit = getPlanLimits(planTier).tts_chars_per_interview;
  if (chars <= limit) return { clamped: chars, was_clamped: false };
  return { clamped: limit, was_clamped: true };
}

export function enforcePerInterviewSTTLimit(
  requestedSeconds: number,
  planTier: PlanTier,
): { allowed_seconds: number; was_clamped: boolean } {
  const limit = getPlanLimits(planTier).stt_seconds_per_interview;
  if (requestedSeconds <= limit) return { allowed_seconds: requestedSeconds, was_clamped: false };
  return { allowed_seconds: limit, was_clamped: true };
}
