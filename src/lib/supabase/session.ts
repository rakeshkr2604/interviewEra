import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Auth errors that mean stored cookies are useless — clear them to stop refresh retries and console noise. */
export function shouldClearStaleAuthCookies(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string; name?: string };
  const code = e.code ?? '';
  if (
    code === 'refresh_token_not_found' ||
    code === 'refresh_token_already_used' ||
    code === 'invalid_grant' ||
    code === 'session_not_found' ||
    code === 'session_expired' ||
    code === 'invalid_refresh_token'
  ) {
    return true;
  }
  if (e.name === 'AuthApiError' && /refresh token/i.test(String(e.message ?? ''))) {
    return true;
  }
  const msg = String(e.message ?? '');
  return /refresh token/i.test(msg) && /invalid|not found|already used|revoked|expired/i.test(msg);
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
  if (error) {
    if (isAuthInfrastructureError(error)) {
      throw error;
    }
    return null;
  }
  return user ?? null;
}

/** Determines if an auth failure is an infrastructure/network outage rather than an invalid credential. */
export function isAuthInfrastructureError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: number; name?: string; message?: string };
  // HTTP 5xx responses from Supabase Auth / Gateway
  if (typeof e.status === 'number' && e.status >= 500) {
    return true;
  }
  // Supabase Auth retryable network fetch failure
  if (e.name === 'AuthRetryableFetchError') {
    return true;
  }
  // Generic network / connection errors
  const msg = String(e.message ?? '').toLowerCase();
  if (
    msg.includes('network') ||
    msg.includes('fetch failed') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('abort')
  ) {
    return true;
  }
  return false;
}

