import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseTimeoutError } from '@/lib/supabase/with-timeout';
import { getServerUser, isAuthInfrastructureError } from './session';

function fakeClient(getUser: () => Promise<unknown>): SupabaseClient {
  return { auth: { getUser } } as unknown as SupabaseClient;
}

describe('isAuthInfrastructureError', () => {
  it('treats a SupabaseTimeoutError as infrastructure, not "no user"', () => {
    expect(isAuthInfrastructureError(new SupabaseTimeoutError('getServerUser', 5000))).toBe(true);
  });

  it('still treats a 5xx Supabase error as infrastructure', () => {
    expect(isAuthInfrastructureError({ status: 503 })).toBe(true);
  });

  it('does not treat a plain invalid-credential error as infrastructure', () => {
    expect(isAuthInfrastructureError({ status: 400, message: 'invalid login credentials' })).toBe(false);
  });
});

describe('getServerUser', () => {
  it('rethrows when the auth check times out, instead of silently returning null', async () => {
    vi.useFakeTimers();
    const client = fakeClient(() => new Promise(() => {}));
    const pending = getServerUser(client);
    const assertion = expect(pending).rejects.toBeInstanceOf(SupabaseTimeoutError);
    // The default bound lives in with-timeout.ts; fast-forward past any reasonable value.
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    vi.useRealTimers();
  });

  it('returns null for a normal "no session" response', async () => {
    const client = fakeClient(() => Promise.resolve({ data: { user: null }, error: null }));
    await expect(getServerUser(client)).resolves.toBeNull();
  });

  it('returns the user on success', async () => {
    const user = { id: 'u1' };
    const client = fakeClient(() => Promise.resolve({ data: { user }, error: null }));
    await expect(getServerUser(client)).resolves.toBe(user);
  });
});
