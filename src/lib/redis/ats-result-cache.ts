/**
 * Cross-instance ATS checker result cache (Upstash Redis).
 * Cost optimization — fail open on Redis errors (same pattern as question-cache).
 */

import getRedis from './client';
import type { AtsResultV2 } from '@/lib/ats/types';

const TTL_SECONDS = 60 * 60; // 1 hour — matches prior in-memory TTL
const KEY_PREFIX = 'ats-result-v2:';

export async function getCachedAtsResult(cacheKey: string): Promise<AtsResultV2 | null> {
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
  try {
    const redis = getRedis();
    await redis.set(`${KEY_PREFIX}${cacheKey}`, result, { ex: TTL_SECONDS });
  } catch (err) {
    console.error('[ats-result-cache] Redis set error, skipping cache write:', err);
  }
}
