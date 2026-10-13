import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCached,
  getOrComputeCached,
  invalidateAll,
  setCached,
} from '@/lib/admin/cache';

afterEach(() => {
  invalidateAll();
});

describe('admin cache', () => {
  it('returns cached values within TTL', () => {
    setCached('k', { n: 1 }, 60_000);
    expect(getCached<{ n: number }>('k')).toEqual({ n: 1 });
  });

  it('misses after expiry', () => {
    vi.useFakeTimers();
    setCached('k', 'x', 1000);
    vi.advanceTimersByTime(1001);
    expect(getCached('k')).toBeNull();
    vi.useRealTimers();
  });

  it('coalesces concurrent misses into one compute', async () => {
    let calls = 0;
    const compute = async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 20));
      return { v: calls };
    };

    const [a, b] = await Promise.all([
      getOrComputeCached('coalesce', 60_000, compute),
      getOrComputeCached('coalesce', 60_000, compute),
    ]);

    expect(calls).toBe(1);
    expect(a.data).toEqual({ v: 1 });
    expect(b.data).toEqual({ v: 1 });
    expect(new Set([a.cache, b.cache])).toEqual(new Set(['miss', 'coalesced']));
  });

  it('serves hit after warm', async () => {
    await getOrComputeCached('warm', 60_000, async () => 42);
    const second = await getOrComputeCached('warm', 60_000, async () => 99);
    expect(second).toEqual({ data: 42, cache: 'hit' });
  });

  it('fresh=1 bypasses hit and refreshes', async () => {
    await getOrComputeCached('fresh', 60_000, async () => 1);
    const refreshed = await getOrComputeCached('fresh', 60_000, async () => 2, { fresh: true });
    expect(refreshed).toEqual({ data: 2, cache: 'fresh' });
    expect(getCached('fresh')).toBe(2);
  });
});
