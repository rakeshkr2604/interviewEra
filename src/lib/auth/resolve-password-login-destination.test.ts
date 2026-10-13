import { describe, expect, it } from 'vitest';
import {
  resolvePasswordLoginDestination,
  shouldLookupHiringOrganization,
} from '@/lib/auth/resolve-password-login-destination';

describe('shouldLookupHiringOrganization', () => {
  it('looks up when next is absent or dashboard', () => {
    expect(shouldLookupHiringOrganization(undefined)).toBe(true);
    expect(shouldLookupHiringOrganization(null)).toBe(true);
    expect(shouldLookupHiringOrganization('/dashboard')).toBe(true);
  });

  it('skips lookup for explicit non-dashboard next', () => {
    expect(shouldLookupHiringOrganization('/settings')).toBe(false);
    expect(shouldLookupHiringOrganization('/hiring/dashboard')).toBe(false);
    expect(shouldLookupHiringOrganization('/college/join/tok')).toBe(false);
  });
});

describe('resolvePasswordLoginDestination', () => {
  it('honours safe explicit next without hiring override', () => {
    expect(
      resolvePasswordLoginDestination('/settings', {
        planTier: 'free',
        hiringOrgId: 'org-1',
      }),
    ).toBe('/settings');
  });

  it('routes campus_admin when no next', () => {
    expect(
      resolvePasswordLoginDestination(undefined, { planTier: 'campus_admin' }),
    ).toBe('/college/dashboard');
  });

  it('routes hiring admin when next is dashboard', () => {
    expect(
      resolvePasswordLoginDestination('/dashboard', {
        planTier: 'free',
        hiringOrgId: 'org-1',
      }),
    ).toBe('/hiring/dashboard');
  });

  it('keeps dashboard for free users without hiring org', () => {
    expect(
      resolvePasswordLoginDestination(undefined, {
        planTier: 'free',
        hiringOrgId: null,
      }),
    ).toBe('/dashboard');
  });

  it('uses invite path from next', () => {
    expect(
      resolvePasswordLoginDestination('/college/join/abc123', {
        planTier: 'free',
        hiringOrgId: 'org-1',
      }),
    ).toBe('/college/join/abc123');
  });
});
