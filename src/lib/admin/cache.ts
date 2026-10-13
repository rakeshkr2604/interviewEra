/**
 * Lightweight in-memory cache for admin analytics API routes.
 *
 * Vercel serverless functions stay warm for several minutes after the last
 * request, so this meaningfully reduces DB queries when an admin loads the
 * page (4 routes fire simultaneously) or clicks Refresh back-to-back.
 *
 * TTLs are short because admin analytics is "approximate is fine"
 * and manual refresh (`fresh=1`) is the primary update mechanism.
 *
 * Concurrent cache misses for the same key share one in-flight compute to
 * avoid a query stampede on cold instances.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry || Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function invalidateCache(key: string): void {
  store.delete(key);
  inflight.delete(key);
}

export function invalidateAll(): void {
  store.clear();
  inflight.clear();
}

/**
 * Cache-aside with single-flight: concurrent callers share one compute.
 * When `fresh` is true, always recompute and refresh the cache entry.
 */
export async function getOrComputeCached<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
  options?: { fresh?: boolean },
): Promise<{ data: T; cache: 'hit' | 'miss' | 'fresh' | 'coalesced' }> {
  const fresh = options?.fresh === true;

  if (!fresh) {
    const cached = getCached<T>(key);
    if (cached !== null) {
      return { data: cached, cache: 'hit' };
    }

    const pending = inflight.get(key) as Promise<T> | undefined;
    if (pending) {
      const data = await pending;
      return { data, cache: 'coalesced' };
    }
  }

  const run = compute()
    .then((data) => {
      setCached(key, data, ttlMs);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  if (!fresh) {
    inflight.set(key, run);
  }

  const data = await run;
  return { data, cache: fresh ? 'fresh' : 'miss' };
}
