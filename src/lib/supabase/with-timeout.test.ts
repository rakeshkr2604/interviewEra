import { describe, expect, it, vi } from 'vitest';
import { SupabaseTimeoutError, withSupabaseTimeout } from './with-timeout';

describe('withSupabaseTimeout', () => {
  it('resolves with the inner value when it finishes before the deadline', async () => {
    const result = await withSupabaseTimeout('fast', () => Promise.resolve({ data: 'ok' }), 50);
    expect(result).toEqual({ data: 'ok' });
  });

  it('rejects with SupabaseTimeoutError when the inner call never settles', async () => {
    vi.useFakeTimers();
    const hung = new Promise(() => {
      /* never resolves — simulates a hung upstream Supabase call */
    });
    const pending = withSupabaseTimeout('slow', () => hung, 10);
    const assertion = expect(pending).rejects.toBeInstanceOf(SupabaseTimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    vi.useRealTimers();
  });

  it('propagates a genuine rejection from the inner call unchanged, not as a timeout', async () => {
    const boom = new Error('real db error');
    await expect(
      withSupabaseTimeout('errors', () => Promise.reject(boom), 1000),
    ).rejects.toBe(boom);
  });

  it('accepts a PromiseLike (Supabase/PostgREST query builders are thenable, not full Promises)', async () => {
    const thenable = {
      then<T>(resolve: (value: { data: number }) => T) {
        return Promise.resolve(resolve({ data: 42 }));
      },
    };
    const result = await withSupabaseTimeout('thenable', () => thenable, 50);
    expect(result).toEqual({ data: 42 });
  });

  it('clears its internal timer on a fast resolve (no dangling timer)', async () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    await withSupabaseTimeout('fast', () => Promise.resolve('done'), 1000);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
    vi.useRealTimers();
  });

  it('SupabaseTimeoutError carries the label and ms in its message', () => {
    const err = new SupabaseTimeoutError('getCachedAuthUser', 5000);
    expect(err.name).toBe('SupabaseTimeoutError');
    expect(err.message).toContain('getCachedAuthUser');
    expect(err.message).toContain('5000');
  });
});
