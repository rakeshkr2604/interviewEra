/**
 * Lightweight in-memory cache for admin analytics API routes.
 *
 * Vercel serverless functions stay warm for several minutes after the last
 * request, so this meaningfully reduces DB queries when an admin loads the
 * page (4 routes fire simultaneously) or clicks Refresh back-to-back.
 *
 * TTLs are short (30–60 s) because admin analytics is "approximate is fine"
 * and manual refresh is the primary update mechanism.
 */

interface CacheEntry<T> {
  data:      T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

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
}

export function invalidateAll(): void {
  store.clear();
}
