import type { SupabaseClient, User } from '@supabase/supabase-js';

/** Auth errors that mean stored cookies are useless — clear them to stop refresh retries and console noise. */
export function shouldClearStaleAuthCookies(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const code = e.code ?? '';
  if (
    code === 'refresh_token_not_found' ||
    code === 'invalid_grant' ||
    code === 'session_not_found'
  ) {
    return true;
  }
  const msg = String(e.message ?? '');
  return /refresh token/i.test(msg) && /invalid|not found/i.test(msg);
}

export async function getServerUser(client: SupabaseClient): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error) return null;
  return user ?? null;
}
