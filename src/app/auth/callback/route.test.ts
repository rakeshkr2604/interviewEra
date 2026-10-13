import { beforeEach, describe, expect, it, vi } from 'vitest';

const exchangeCodeForSession = vi.fn();
const setAllWrites: Array<{ name: string; value: string }> = [];
const persistUserAttributionOnce = vi.fn().mockResolvedValue(undefined);
const sendWelcomeEmailIfNeeded = vi.fn().mockResolvedValue(undefined);
const captureReferralFromCode = vi.fn().mockResolvedValue(undefined);
const persistSignupConsent = vi.fn().mockResolvedValue(undefined);
const resolvePostAuthDestination = vi.fn().mockResolvedValue('/dashboard');
const backgroundTasks: Promise<void>[] = [];
const scheduleServerlessBackgroundWork = vi.fn((task: () => Promise<void>) => {
  backgroundTasks.push(task());
});
const isAuthV2Enabled = vi.fn(() => true);

async function flushBackgroundWork(): Promise<void> {
  await Promise.all([...backgroundTasks]);
  backgroundTasks.length = 0;
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, opts: {
    cookies: { setAll: (cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void };
  }) => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        const result = await exchangeCodeForSession(code);
        opts.cookies.setAll([
          { name: 'sb-access-token', value: 'tok', options: { path: '/' } },
          { name: 'sb-refresh-token', value: 'ref', options: { path: '/' } },
        ]);
        setAllWrites.push(
          { name: 'sb-access-token', value: 'tok' },
          { name: 'sb-refresh-token', value: 'ref' },
        );
        return result;
      },
    },
  })),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    get: (name: string) => {
      if (name === 'oauth_next') return { value: encodeURIComponent('/settings') };
      if (name === 'referral_code') return { value: 'REF123' };
      return undefined;
    },
    set: vi.fn(),
  }),
}));

vi.mock('@/lib/analytics/persist-user-attribution', () => ({
  persistUserAttributionOnce: (...args: unknown[]) => persistUserAttributionOnce(...args),
}));
vi.mock('@/lib/analytics/schedule-serverless-background-work', () => ({
  scheduleServerlessBackgroundWork: (task: () => Promise<void>) =>
    scheduleServerlessBackgroundWork(task),
}));
vi.mock('@/lib/analytics/funnel', () => ({
  trackFunnelEvent: vi.fn(),
}));
vi.mock('@/lib/email/lifecycle/send-welcome', () => ({
  sendWelcomeEmailIfNeeded: (...args: unknown[]) => sendWelcomeEmailIfNeeded(...args),
}));
vi.mock('@/lib/referral/capture-referral', () => ({
  captureReferralFromCode: (...args: unknown[]) => captureReferralFromCode(...args),
}));
vi.mock('@/lib/legal/persist-signup-consent', () => ({
  persistSignupConsent: (...args: unknown[]) => persistSignupConsent(...args),
}));
vi.mock('@/lib/legal/signup-consent', () => ({
  SIGNUP_CONSENT_COOKIE: 'signup_consent',
  parseSignupConsentCookie: () => ({ terms: true, privacy: true, version: '1' }),
}));
vi.mock('@/lib/auth/flags', () => ({
  isAuthV2Enabled: () => isAuthV2Enabled(),
}));
vi.mock('@/lib/auth/resolve-destination', () => ({
  extractInviteTokenFromNext: () => undefined,
  resolvePostAuthDestination: (...args: unknown[]) => resolvePostAuthDestination(...args),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ __service: true }),
}));
vi.mock('@/lib/analytics/attribution', () => ({
  getAttributionFromRequest: () => ({ utm_source: 'test' }),
  parseAttributionFromSearchParams: () => ({}),
}));

import { GET } from '@/app/auth/callback/route';

function makeRequest(url: string): Request {
  return new Request(url);
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAllWrites.length = 0;
    backgroundTasks.length = 0;
    isAuthV2Enabled.mockReturnValue(true);
    resolvePostAuthDestination.mockResolvedValue('/dashboard');
    exchangeCodeForSession.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    scheduleServerlessBackgroundWork.mockImplementation((task: () => Promise<void>) => {
      backgroundTasks.push(task());
    });
  });

  it('exchanges code, writes session cookies on redirect, and backgrounds attribution', async () => {
    const res = await GET(makeRequest('https://interviewera.com/auth/callback?code=abc&next=/dashboard') as never);
    await flushBackgroundWork();

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
    expect(res.headers.get('location')).toContain('funnel=signup_completed');
    expect(scheduleServerlessBackgroundWork).toHaveBeenCalledTimes(1);
    expect(persistUserAttributionOnce).toHaveBeenCalled();
    expect(sendWelcomeEmailIfNeeded).toHaveBeenCalledWith('user-1');
    expect(captureReferralFromCode).toHaveBeenCalled();
    expect(persistSignupConsent).toHaveBeenCalled();

    const cookieNames = res.cookies.getAll().map((c) => c.name);
    expect(cookieNames).toEqual(expect.arrayContaining(['sb-access-token', 'sb-refresh-token']));
  });

  it('still redirects when attribution persistence fails', async () => {
    persistUserAttributionOnce.mockRejectedValueOnce(new Error('db down'));
    const res = await GET(makeRequest('https://interviewera.com/auth/callback?code=abc') as never);
    await flushBackgroundWork();
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/dashboard');
  });

  it('skips enrichment for password reset destination', async () => {
    const res = await GET(
      makeRequest('https://interviewera.com/auth/callback?code=abc&next=/reset-password') as never,
    );
    expect(res.headers.get('location')).toContain('/reset-password');
    expect(scheduleServerlessBackgroundWork).not.toHaveBeenCalled();
    expect(resolvePostAuthDestination).not.toHaveBeenCalled();
  });

  it('redirects to auth error when exchange fails and authV2 is on', async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad' } });
    const res = await GET(makeRequest('https://interviewera.com/auth/callback?code=bad') as never);
    expect(res.headers.get('location')).toContain('/auth/error?code=auth_callback_failed');
  });

  it('redirects to login error when exchange fails and authV2 is off', async () => {
    isAuthV2Enabled.mockReturnValue(false);
    exchangeCodeForSession.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad' } });
    const res = await GET(makeRequest('https://interviewera.com/auth/callback?code=bad') as never);
    expect(res.headers.get('location')).toContain('/login?error=auth_callback_failed');
  });
});
