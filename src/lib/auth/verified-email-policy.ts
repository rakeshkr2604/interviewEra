import type { User } from '@supabase/supabase-js';

export const VERIFICATION_PENDING_PATH = '/auth/verify-pending';

/**
 * Auth and account-recovery routes remain reachable while email verification is
 * pending. Product pages are classified by middleware; sensitive product APIs
 * are explicitly listed here so the gate is not applied blindly to every API.
 */
export const VERIFICATION_ROUTES = new Set([
  '/auth/callback',
  '/auth/confirm',
  '/auth/error',
  VERIFICATION_PENDING_PATH,
]);

export const LIMITED_ACCOUNT_API_ROUTES = new Set([
  '/api/account/avatar',
  '/api/account/profile',
  '/api/auth/forgot-password',
  '/api/auth/resend-verification',
]);

const VERIFIED_EMAIL_API_PREFIXES = [
  '/api/account/onboarding',
  '/api/interview',
  '/api/job-description',
  '/api/onboarding',
  '/api/payments',
  '/api/report',
  '/api/resume',
  '/api/stt',
  '/api/tts',
] as const;

type VerificationUser = Pick<User, 'email' | 'email_confirmed_at' | 'app_metadata'>;

/**
 * Supabase's confirmation timestamp is canonical for password accounts.
 * Google is also trusted because `app_metadata` is server-owned and Google
 * verifies the address before Supabase establishes the OAuth identity.
 */
export function hasVerifiedEmail(user: VerificationUser): boolean {
  if (!user.email) return false;
  if (user.email_confirmed_at) return true;

  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes('google');
}

export function requiresVerifiedEmailApi(pathname: string): boolean {
  return VERIFIED_EMAIL_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export type EmailVerificationAccessDecision = 'allow' | 'redirect_pending' | 'api_forbidden';

export function resolveEmailVerificationAccess(input: {
  pathname: string;
  isApi: boolean;
  isPublic: boolean;
  isAuthRoute: boolean;
  user: VerificationUser | null;
}): EmailVerificationAccessDecision {
  const { pathname, isApi, isPublic, isAuthRoute, user } = input;

  if (!user || hasVerifiedEmail(user) || VERIFICATION_ROUTES.has(pathname)) {
    return 'allow';
  }

  if (isApi) {
    return requiresVerifiedEmailApi(pathname) ? 'api_forbidden' : 'allow';
  }

  return !isPublic || isAuthRoute ? 'redirect_pending' : 'allow';
}
