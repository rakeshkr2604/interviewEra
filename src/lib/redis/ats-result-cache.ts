/**
 * Cross-instance ATS checker result cache (Upstash Redis).
 * Cost optimization — fail open on Redis errors (same pattern as question-cache).
 */

import getRedis, { isRedisConfigured } from './client';
import type { AtsResultV2 } from '@/lib/ats/types';

const TTL_SECONDS = 60 * 60; // 1 hour — matches prior in-memory TTL
const KEY_PREFIX = 'ats-result-v2:';

/**
 * Local dev always misses on read (writes still happen, for parity with
 * prod). AtsResultV2's shape has changed silently under a stale cache entry
 * more than once during live manual testing — severity relabeling, new
 * fields (pointsEstimate, requiredTotalCount, ...) landed but a 1h-TTL
 * cached blob from before the change kept getting served verbatim with no
 * error, making "did my fix actually work" impossible to answer from the
 * browser alone. Skipping reads outside production removes that class of
 * confusion for good — no prefix/version bump to remember. Production
 * freshness on deploy is handled separately by folding the deploy commit
 * into the cache key (see actions.ts buildCacheKey).
 */
function cacheReadsEnabled(): boolean {
  return process.env.NODE_ENV === 'production';
}

export async function getCachedAtsResult(cacheKey: string): Promise<AtsResultV2 | null> {
  if (!cacheReadsEnabled() || !isRedisConfigured()) return null;
  try {
    const redis = getRedis();
    const cached = await redis.get<AtsResultV2>(`${KEY_PREFIX}${cacheKey}`);
    return cached ?? null;
  } catch (err) {
    console.error('[ats-result-cache] Redis get error, skipping cache:', err);
    return null;
  }
}

export async function setCachedAtsResult(
  cacheKey: string,
  result: AtsResultV2,
): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    await redis.set(`${KEY_PREFIX}${cacheKey}`, result, { ex: TTL_SECONDS });
  } catch (err) {
    console.error('[ats-result-cache] Redis set error, skipping cache write:', err);
  }
}
