import { getBaseUrl } from '@/lib/server/get-base-url';

/** App-hosted recovery URL — avoids Supabase redirect whitelist stripping callback paths. */
export function buildPasswordResetConfirmUrl(hashedToken: string, baseUrl?: string): string {
  const origin = (baseUrl ?? getBaseUrl()).replace(/\/$/, '');
  const url = new URL('/auth/confirm', origin);
  url.searchParams.set('token_hash', hashedToken);
  url.searchParams.set('type', 'recovery');
  url.searchParams.set('next', '/reset-password');
  return url.toString();
}
