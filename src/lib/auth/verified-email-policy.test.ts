import { describe, expect, it } from 'vitest';
import {
  hasVerifiedEmail,
  requiresVerifiedEmailApi,
  resolveEmailVerificationAccess,
} from './verified-email-policy';

function user(overrides: {
  email?: string | null;
  email_confirmed_at?: string | null;
  providers?: string[];
} = {}) {
  return {
    email: overrides.email === undefined ? 'student@example.com' : overrides.email,
    email_confirmed_at: overrides.email_confirmed_at ?? null,
    app_metadata: { providers: overrides.providers ?? ['email'] },
  };
}

describe('verified email access policy', () => {
  it('trusts confirmed password accounts and server-owned Google identities', () => {
    expect(hasVerifiedEmail(user({ email_confirmed_at: '2026-08-16T10:00:00Z' }))).toBe(true);
    expect(hasVerifiedEmail(user({ providers: ['google'] }))).toBe(true);
  });

  it('does not treat an unconfirmed password account as verified', () => {
    expect(hasVerifiedEmail(user())).toBe(false);
    expect(hasVerifiedEmail(user({ email: null, providers: ['google'] }))).toBe(false);
  });

  it('requires verification for sensitive product APIs including account onboarding', () => {
    expect(requiresVerifiedEmailApi('/api/interview/start')).toBe(true);
    expect(requiresVerifiedEmailApi('/api/report/report-1')).toBe(true);
    expect(requiresVerifiedEmailApi('/api/resume/upload')).toBe(true);
    expect(requiresVerifiedEmailApi('/api/payments/create-order')).toBe(true);
    expect(requiresVerifiedEmailApi('/api/onboarding/state')).toBe(true);
    expect(requiresVerifiedEmailApi('/api/account/onboarding')).toBe(true);
    expect(requiresVerifiedEmailApi('/api/account/profile')).toBe(false);
    expect(requiresVerifiedEmailApi('/api/auth/resend-verification')).toBe(false);
    expect(requiresVerifiedEmailApi('/api/analytics/funnel-event')).toBe(false);
  });

  it('redirects unverified users from protected pages but allows verification and marketing pages', () => {
    expect(
      resolveEmailVerificationAccess({
        pathname: '/dashboard',
        isApi: false,
        isPublic: false,
        isAuthRoute: false,
        user: user(),
      }),
    ).toBe('redirect_pending');

    expect(
      resolveEmailVerificationAccess({
        pathname: '/auth/verify-pending',
        isApi: false,
        isPublic: true,
        isAuthRoute: true,
        user: user(),
      }),
    ).toBe('allow');

    expect(
      resolveEmailVerificationAccess({
        pathname: '/pricing',
        isApi: false,
        isPublic: true,
        isAuthRoute: false,
        user: user(),
      }),
    ).toBe('allow');
  });

  it('forbids sensitive APIs for unverified users and allows them for verified users', () => {
    const input = {
      pathname: '/api/interview/start',
      isApi: true,
      isPublic: false,
      isAuthRoute: false,
    };

    expect(resolveEmailVerificationAccess({ ...input, user: user() })).toBe('api_forbidden');
    expect(
      resolveEmailVerificationAccess({
        ...input,
        user: user({ email_confirmed_at: '2026-08-16T10:00:00Z' }),
      }),
    ).toBe('allow');
  });
});
