import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Auth errors that mean stored cookies are useless — clear them to stop refresh retries and console noise. */
export function shouldClearStaleAuthCookies(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; name?: string };
  const code = e.code ?? '';
  if (
    code === 'refresh_token_not_found' ||
    code === 'invalid_grant' ||
    code === 'session_not_found' ||
    code === 'invalid_refresh_token'
  ) {
    return true;
  }
  if (e.name === 'AuthApiError' && /refresh token/i.test(String(e.message ?? ''))) {
    return true;
  }
  const msg = String(e.message ?? '');
  return /refresh token/i.test(msg) && /invalid|not found/i.test(msg);
}

/** Browser: remove dead sb-* cookies / storage after getUser/getSession refresh failure. */
export async function signOutIfStaleAuth(client: SupabaseClient, error: unknown): Promise<void> {
  if (!shouldClearStaleAuthCookies(error)) return;
  try {
    await client.auth.signOut();
  } catch {
    /* signOut can fail if storage is inconsistent; cookies still expire */
  }
}

export async function getServerUser(client: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error) return null;
  return user ?? null;
}
