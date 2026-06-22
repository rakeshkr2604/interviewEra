import { getBaseUrl } from '@/lib/server/get-base-url';

/** App-hosted signup confirmation — mirrors password reset flow. */
export function buildSignupConfirmUrl(
  hashedToken: string,
  next = '/dashboard',
  baseUrl?: string,
  otpType: 'signup' | 'magiclink' = 'signup',
): string {
  const origin = (baseUrl ?? getBaseUrl()).replace(/\/$/, '');
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  const url = new URL('/auth/confirm', origin);
  url.searchParams.set('token_hash', hashedToken);
  url.searchParams.set('type', otpType);
  url.searchParams.set('next', safeNext);
  return url.toString();
}
