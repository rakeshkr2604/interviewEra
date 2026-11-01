import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const getUser = vi.fn();
const userRowMaybeSingle = vi.fn();
const createClient = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClient(),
}));

import { requireFreeToolUser, resolveFreeToolTier } from '@/lib/security/free-tool-access';

function supabaseDouble() {
  return {
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: userRowMaybeSingle }) }) }),
  };
}

const verifiedUser = {
  id: 'user-1',
  email: 'student@example.com',
  email_confirmed_at: '2026-10-01T00:00:00.000Z',
  app_metadata: { providers: ['email'] },
};

describe('requireFreeToolUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue(supabaseDouble());
    userRowMaybeSingle.mockResolvedValue({ data: { plan_tier: 'free' }, error: null });
  });

  it('rejects anonymous visitors with 401 AUTH_REQUIRED', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await requireFreeToolUser()).toMatchObject({ ok: false, code: 'AUTH_REQUIRED', status: 401 });
  });

  it('rejects a forged / invalid sb- cookie (Supabase cannot verify the JWT)', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthApiError', status: 403, message: 'invalid JWT: signature is invalid' },
    });
    const access = await requireFreeToolUser();
    expect(access).toMatchObject({ ok: false, code: 'AUTH_REQUIRED', status: 401 });
    expect(userRowMaybeSingle).not.toHaveBeenCalled();
  });

  it('rejects unverified email/password accounts with 403', async () => {
    getUser.mockResolvedValue({
      data: { user: { ...verifiedUser, email_confirmed_at: null } },
      error: null,
    });
    expect(await requireFreeToolUser()).toMatchObject({ ok: false, code: 'EMAIL_UNVERIFIED', status: 403 });
  });

  it('accepts Google accounts (provider-verified email)', async () => {
    getUser.mockResolvedValue({
      data: { user: { ...verifiedUser, email_confirmed_at: null, app_metadata: { providers: ['google'] } } },
      error: null,
    });
    expect(await requireFreeToolUser()).toEqual({ ok: true, userId: 'user-1', tier: 'free' });
  });

  it('returns 503 AUTH_UNAVAILABLE on an auth infrastructure outage (never fails open)', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' },
    });
    expect(await requireFreeToolUser()).toMatchObject({ ok: false, code: 'AUTH_UNAVAILABLE', status: 503 });
  });

  it('resolves paid tier for an active paid plan', async () => {
    getUser.mockResolvedValue({ data: { user: verifiedUser }, error: null });
    userRowMaybeSingle.mockResolvedValue({
      data: { plan_tier: 'pro', plan_status: 'active', plan_expires_at: '2099-01-01T00:00:00.000Z' },
      error: null,
    });
    expect(await requireFreeToolUser()).toEqual({ ok: true, userId: 'user-1', tier: 'paid' });
  });

  it('falls back to the stricter Free tier when the profile lookup fails', async () => {
    getUser.mockResolvedValue({ data: { user: verifiedUser }, error: null });
    userRowMaybeSingle.mockRejectedValue(new Error('db down'));
    expect(await requireFreeToolUser()).toEqual({ ok: true, userId: 'user-1', tier: 'free' });
  });
});

describe('resolveFreeToolTier', () => {
  it('maps tiers conservatively', () => {
    expect(resolveFreeToolTier(null)).toBe('free');
    expect(resolveFreeToolTier({ plan_tier: 'free' })).toBe('free');
    expect(
      resolveFreeToolTier({ plan_tier: 'starter', plan_status: 'active', plan_expires_at: '2000-01-01T00:00:00.000Z' }),
    ).toBe('free');
    expect(resolveFreeToolTier({ plan_tier: 'campus' })).toBe('paid');
    expect(resolveFreeToolTier({ plan_tier: 'campus_admin' })).toBe('paid');
  });
});
