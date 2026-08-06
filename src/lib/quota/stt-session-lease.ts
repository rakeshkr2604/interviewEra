/**
 * STT session lease tracking — prevents double-count on token refresh.
 *
 * Redis keys:
 *   vs:lease:{lease_id}  → user_id (TTL 30 min)
 *   vs:active:{user_id}    → concurrent count (existing)
 */

import getRedis, { isRedisConfigured } from '@/lib/redis/client';
import { checkAndAcquireSession, releaseSession, recordSTTUsage } from '@/lib/quota/voice-quota';
import type { PlanTier } from '@/lib/quota/plan-limits';

const LEASE_TTL_SECONDS = 30 * 60;

function leaseKey(leaseId: string): string {
  return `vs:lease:${leaseId}`;
}

export async function createSessionLease(userId: string, planTier: PlanTier): Promise<{
  ok: true;
  lease_id: string;
  active_sessions: number;
} | {
  ok: false;
  active_sessions: number;
  max_sessions: number;
}> {
  const acquired = await checkAndAcquireSession(userId, planTier);
  if (!acquired.allowed) {
    return {
      ok: false,
      active_sessions: acquired.active_sessions,
      max_sessions: acquired.max_sessions,
    };
  }

  const leaseId = crypto.randomUUID();
  if (!isRedisConfigured()) {
    return { ok: true, lease_id: leaseId, active_sessions: acquired.active_sessions };
  }

  try {
    const redis = getRedis();
    await redis.set(leaseKey(leaseId), userId, { ex: LEASE_TTL_SECONDS });
  } catch (err) {
    console.error('[voice-quota] lease create failed:', err);
    await releaseSession(userId);
    throw err;
  }

  return { ok: true, lease_id: leaseId, active_sessions: acquired.active_sessions };
}

export async function validateRefreshLease(userId: string, leaseId: string): Promise<boolean> {
  if (!isRedisConfigured()) return true;
  try {
    const redis = getRedis();
    const owner = await redis.get<string>(leaseKey(leaseId));
    if (owner !== userId) return false;
    await redis.expire(leaseKey(leaseId), LEASE_TTL_SECONDS);
    return true;
  } catch {
    return false;
  }
}

export async function releaseSessionLease(
  userId: string,
  leaseId: string,
  durationSeconds?: number,
): Promise<void> {
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const owner = await redis.get<string>(leaseKey(leaseId));
      if (owner !== userId) {
        console.warn('[voice-quota] release ignored — lease owner mismatch', { leaseId });
        return;
      }
      await redis.del(leaseKey(leaseId));
    } catch (err) {
      console.error('[voice-quota] lease delete failed:', err);
    }
  }

  await releaseSession(userId);

  if (durationSeconds != null && durationSeconds > 0) {
    await recordSTTUsage(userId, durationSeconds);
  }
}
