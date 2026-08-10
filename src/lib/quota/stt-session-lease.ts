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

const LUA_REFRESH_LEASE = `
local lease_key = KEYS[1]
local active_key = KEYS[2]
local expected_user = ARGV[1]
local ttl_seconds = tonumber(ARGV[2])

local owner = redis.call("GET", lease_key)
if owner ~= expected_user then
    return 0
end

redis.call("EXPIRE", lease_key, ttl_seconds)

if redis.call("EXISTS", active_key) == 1 then
    redis.call("EXPIRE", active_key, ttl_seconds)
    return 1
else
    return 2
end
`;

export async function validateRefreshLease(userId: string, leaseId: string): Promise<boolean> {
  if (!isRedisConfigured()) return true;
  try {
    const redis = getRedis();
    const activeKey = `vs:active:${userId}`;
    const result = await redis.eval<[string, string], number>(
      LUA_REFRESH_LEASE,
      [leaseKey(leaseId), activeKey],
      [userId, String(LEASE_TTL_SECONDS)],
    );

    if (result === 0) {
      return false;
    }

    if (result === 2) {
      console.warn('[voice-quota] active counter missing during lease refresh', { userId, leaseId });
    }

    return true;
  } catch {
    return false;
  }
}

const RELEASED_TOMBSTONE = 'released';
const TOMBSTONE_TTL_SECONDS = 5 * 60; // 5-minute deduplication window

const LUA_RELEASE_LEASE = `
local lease_key = KEYS[1]
local active_key = KEYS[2]
local expected_user = ARGV[1]
local tombstone = "${RELEASED_TOMBSTONE}"
local tombstone_ttl = ${TOMBSTONE_TTL_SECONDS}

local owner = redis.call("GET", lease_key)

if owner == tombstone then
    return 0
end

if owner == nil then
    return -2
end

if owner ~= expected_user then
    return -1
end

redis.call("SET", lease_key, tombstone, "EX", tombstone_ttl)
local current = tonumber(redis.call("GET", active_key) or "0")
if current > 0 then
    redis.call("DECR", active_key)
end

return 1
`;

export async function releaseSessionLease(
  userId: string,
  leaseId: string,
  durationSeconds?: number,
): Promise<void> {
  if (!isRedisConfigured()) {
    await releaseSession(userId);

    if (durationSeconds != null && durationSeconds > 0) {
      await recordSTTUsage(userId, durationSeconds);
    }

    return;
  }

  try {
    const redis = getRedis();
    const activeKey = `vs:active:${userId}`;

    const result = await redis.eval<[string], number>(
      LUA_RELEASE_LEASE,
      [leaseKey(leaseId), activeKey],
      [userId],
    );

    if (result === 0) {
      console.info('[voice-quota] release ignored — lease already released', { leaseId });
      return;
    }

    if (result === -1) {
      console.warn('[voice-quota] release ignored — lease owner mismatch', { leaseId });
      return;
    }

    if (result === -2) {
      console.info('[voice-quota] release ignored — lease missing or expired', { leaseId });
      return;
    }

    if (result === 1) {
      if (durationSeconds != null && durationSeconds > 0) {
        await recordSTTUsage(userId, durationSeconds);
      }
    }
  } catch (err) {
    console.error('[voice-quota] lease release failed:', err);
  }
}