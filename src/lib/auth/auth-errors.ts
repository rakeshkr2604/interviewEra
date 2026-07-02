/**
 * Auth V2 — error catalogue for /auth/error recovery hub and inline banners.
 */

import type { AuthIntent } from '@/lib/auth/auth-intent';

export const AUTH_ERROR_CODES = [
  'auth_callback_failed',
  'oauth_cancelled',
  'account_exists',
  'invalid_credentials',
  'email_not_verified',
  'verification_expired',
  'verification_failed',
  'business_email_required',
  'invite_expired',
  'invite_no_seats',
  'invite_email_mismatch',
  'rate_limited',
  'network_error',
  'session_expired',
  'unauthorized',
  'signup_unavailable',
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export interface RecoveryActionDef {
  id: string;
  title: string;
  description: string;
  href: string;
  analyticsAction: string;
}

export interface AuthErrorDefinition {
  code: AuthErrorCode;
  title: string;
  description: string;
  recoveryActions: RecoveryActionDef[];
  supportEmail?: string;
  httpStatus?: number;
}

function buildHref(
  path: string,
  params?: Record<string, string | undefined>,
): string {
  const url = new URL(path, 'https://interviewera.com');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return `${url.pathname}${url.search}`;
}

function candidateSignupHref(intent?: AuthIntent, email?: string): string {
  return buildHref('/signup', { intent: intent ?? 'candidate', email });
}

export const AUTH_ERROR_CATALOGUE: Record<AuthErrorCode, AuthErrorDefinition> = {
  auth_callback_failed: {
    code: 'auth_callback_failed',
    title: "Sign-in didn't complete",
    description:
      'Something went wrong during sign-in. Try again or use your email instead.',
    recoveryActions: [
      {
        id: 'retry_login',
        title: 'Try signing in again',
        description: 'Return to the login page.',
        href: '/login',
        analyticsAction: 'retry_login',
      },
      {
        id: 'go_home',
        title: 'Go to home',
        description: 'Return to the InterviewEra homepage.',
        href: '/',
        analyticsAction: 'go_home',
      },
    ],
  },
  oauth_cancelled: {
    code: 'oauth_cancelled',
    title: 'Sign-in cancelled',
    description: 'You closed the sign-in window before finishing.',
    recoveryActions: [
      {
        id: 'retry_login',
        title: 'Try again',
        description: 'Sign in with Google or email.',
        href: '/login',
        analyticsAction: 'retry_login',
      },
      {
        id: 'go_home',
        title: 'Go to home',
        description: 'Return to the InterviewEra homepage.',
        href: '/',
        analyticsAction: 'go_home',
      },
    ],
  },
  account_exists: {
    code: 'account_exists',
    title: 'Account already exists',
    description: 'An account with this email is already registered.',
    recoveryActions: [
      {
        id: 'login',
        title: 'Log in',
        description: 'Sign in with your existing account.',
        href: '/login',
        analyticsAction: 'login',
      },
      {
        id: 'forgot_password',
        title: 'Reset password',
        description: 'Get a link to choose a new password.',
        href: '/forgot-password',
        analyticsAction: 'forgot_password',
      },
    ],
  },
  invalid_credentials: {
    code: 'invalid_credentials',
    title: 'Incorrect email or password',
    description: 'Check your details and try again.',
    recoveryActions: [
      {
        id: 'retry_login',
        title: 'Try again',
        description: 'Return to sign in.',
        href: '/login',
        analyticsAction: 'retry_login',
      },
      {
        id: 'forgot_password',
        title: 'Forgot password?',
        description: 'We will email you a reset link.',
        href: '/forgot-password',
        analyticsAction: 'forgot_password',
      },
    ],
  },
  email_not_verified: {
    code: 'email_not_verified',
    title: 'Verify your email first',
    description: 'We sent a confirmation link when you signed up. Check your inbox.',
    recoveryActions: [
      {
        id: 'login',
        title: 'Back to sign in',
        description: 'Try again after verifying.',
        href: '/login',
        analyticsAction: 'login',
      },
    ],
    supportEmail: 'help@interviewera.com',
  },
  verification_expired: {
    code: 'verification_expired',
    title: 'Link expired',
    description: 'This verification link is no longer valid.',
    recoveryActions: [
      {
        id: 'signup',
        title: 'Sign up again',
        description: 'Create a new account or request a fresh link.',
        href: '/signup',
        analyticsAction: 'signup',
      },
      {
        id: 'forgot_password',
        title: 'Request reset link',
        description: 'For password recovery links.',
        href: '/forgot-password',
        analyticsAction: 'forgot_password',
      },
    ],
    supportEmail: 'help@interviewera.com',
  },
  verification_failed: {
    code: 'verification_failed',
    title: "Couldn't verify this link",
    description: 'We could not confirm this link. Request a new one.',
    recoveryActions: [
      {
        id: 'signup',
        title: 'Back to sign up',
        description: 'Start again or resend verification.',
        href: '/signup',
        analyticsAction: 'signup',
      },
    ],
    supportEmail: 'help@interviewera.com',
  },
  business_email_required: {
    code: 'business_email_required',
    title: "This email can't open a team workspace",
    description:
      'Team accounts need a work email (yourcompany.com). Personal addresses like Gmail are not supported for hiring workspaces.',
    recoveryActions: [
      {
        id: 'candidate_signup',
        title: 'Practice interviews instead',
        description: 'Free mock interviews for students and candidates.',
        href: candidateSignupHref('candidate'),
        analyticsAction: 'candidate_signup',
      },
      {
        id: 'business_signup',
        title: 'Try a different work email',
        description: 'Sign up with your company email.',
        href: candidateSignupHref('business'),
        analyticsAction: 'business_signup',
      },
      {
        id: 'college_signup',
        title: 'Set up a college workspace',
        description: 'For T&P officers and campus programs.',
        href: candidateSignupHref('college'),
        analyticsAction: 'college_signup',
      },
    ],
    supportEmail: 'campus@interviewera.com',
  },
  invite_expired: {
    code: 'invite_expired',
    title: 'Invitation expired',
    description: 'This invite is no longer valid. Ask your T&P officer to resend.',
    recoveryActions: [
      {
        id: 'go_home',
        title: 'Go to home',
        description: 'Return to InterviewEra.',
        href: '/',
        analyticsAction: 'go_home',
      },
    ],
    supportEmail: 'help@interviewera.com',
  },
  invite_no_seats: {
    code: 'invite_no_seats',
    title: 'No seats available',
    description: 'This campus program has reached its student limit.',
    recoveryActions: [
      {
        id: 'go_home',
        title: 'Go to home',
        description: 'Contact your T&P officer for help.',
        href: '/',
        analyticsAction: 'go_home',
      },
    ],
  },
  invite_email_mismatch: {
    code: 'invite_email_mismatch',
    title: 'Wrong account',
    description: 'This invitation was sent to a different email address.',
    recoveryActions: [
      {
        id: 'login',
        title: 'Sign in with the invited email',
        description: 'Use the address your college invited.',
        href: '/login',
        analyticsAction: 'login',
      },
    ],
  },
  rate_limited: {
    code: 'rate_limited',
    title: 'Too many attempts',
    description: 'Please wait a few minutes before trying again.',
    recoveryActions: [
      {
        id: 'retry_login',
        title: 'Back to sign in',
        description: 'Try again shortly.',
        href: '/login',
        analyticsAction: 'retry_login',
      },
    ],
  },
  network_error: {
    code: 'network_error',
    title: 'Connection issue',
    description: 'Check your internet connection and try again.',
    recoveryActions: [
      {
        id: 'retry_login',
        title: 'Try again',
        description: 'Return to sign in.',
        href: '/login',
        analyticsAction: 'retry_login',
      },
    ],
  },
  session_expired: {
    code: 'session_expired',
    title: 'Session ended',
    description: 'Sign in again to continue where you left off.',
    recoveryActions: [
      {
        id: 'login',
        title: 'Sign in',
        description: 'Log back in to your account.',
        href: '/login',
        analyticsAction: 'login',
      },
    ],
  },
  unauthorized: {
    code: 'unauthorized',
    title: 'Access denied',
    description: "You don't have permission to view this page.",
    recoveryActions: [
      {
        id: 'go_home',
        title: 'Go to home',
        description: 'Return to InterviewEra.',
        href: '/',
        analyticsAction: 'go_home',
      },
      {
        id: 'login',
        title: 'Switch account',
        description: 'Sign in with a different account.',
        href: '/login',
        analyticsAction: 'switch_account',
      },
    ],
    supportEmail: 'help@interviewera.com',
  },
  signup_unavailable: {
    code: 'signup_unavailable',
    title: 'Signup temporarily unavailable',
    description: 'We are performing maintenance. Please try again shortly.',
    recoveryActions: [
      {
        id: 'go_home',
        title: 'Go to home',
        description: 'Return to InterviewEra.',
        href: '/',
        analyticsAction: 'go_home',
      },
    ],
    supportEmail: 'help@interviewera.com',
    httpStatus: 503,
  },
};

export function isAuthErrorCode(value: string | null | undefined): value is AuthErrorCode {
  if (!value) return false;
  return (AUTH_ERROR_CODES as readonly string[]).includes(value);
}

export function getAuthErrorDefinition(
  code: string | null | undefined,
): AuthErrorDefinition {
  if (isAuthErrorCode(code)) {
    return AUTH_ERROR_CATALOGUE[code];
  }
  return AUTH_ERROR_CATALOGUE.auth_callback_failed;
}

/**
 * Map legacy ?error= query values and Supabase messages to catalogue codes.
 */
export function normalizeAuthErrorCode(
  raw: string | null | undefined,
  errorDescription?: string | null,
): AuthErrorCode {
  const combined = `${raw ?? ''} ${errorDescription ?? ''}`.toLowerCase();

  if (raw === 'access_denied' || combined.includes('access_denied')) {
    return 'oauth_cancelled';
  }
  if (isAuthErrorCode(raw)) return raw;
  if (combined.includes('business email')) return 'business_email_required';
  if (combined.includes('email not confirmed')) return 'email_not_verified';
  if (combined.includes('invalid login') || combined.includes('invalid credentials')) {
    return 'invalid_credentials';
  }
  if (combined.includes('rate limit') || combined.includes('too many')) {
    return 'rate_limited';
  }
  if (combined.includes('expired') && combined.includes('invite')) return 'invite_expired';
  if (combined.includes('expired')) return 'verification_expired';
  if (combined.includes('network') || combined.includes('fetch')) return 'network_error';

  return 'auth_callback_failed';
}

/**
 * Build recovery hrefs with contextual query params (email, intent, next).
 */
export function resolveRecoveryActions(
  definition: AuthErrorDefinition,
  context?: { email?: string; intent?: AuthIntent; next?: string },
): RecoveryActionDef[] {
  return definition.recoveryActions.map((action) => {
    let href = action.href;
    if (context?.email && href.startsWith('/login')) {
      href = buildHref('/login', { email: context.email, next: context.next });
    }
    if (context?.intent && href.startsWith('/signup')) {
      href = buildHref('/signup', { intent: context.intent, email: context.email });
    }
    return { ...action, href };
  });
}

/**
 * Map Supabase sign-in errors to user-facing copy (login form).
 */
export function mapAuthErrorMessage(message: string): string {
  const code = normalizeAuthErrorCode(message, message);
  return AUTH_ERROR_CATALOGUE[code].description;
}
