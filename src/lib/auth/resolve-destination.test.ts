import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  extractInviteTokenFromNext,
  resolveDestinationFromTier,
} from '@/lib/auth/resolve-destination-core';
import { resolvePostAuthDestination } from '@/lib/auth/resolve-destination';

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle, maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('resolveDestinationFromTier', () => {
  it('routes campus_admin without DB call', () => {
    expect(resolveDestinationFromTier('campus_admin', {})).toBe('/college/dashboard');
    expect(resolveDestinationFromTier('free', {})).toBe('/dashboard');
  });
});

describe('resolvePostAuthDestination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null });
  });

  it('honours safe next param', async () => {
    const dest = await resolvePostAuthDestination('user-1', { next: '/interview/new' });
    expect(dest).toBe('/interview/new');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects unsafe next and falls through to profile', async () => {
    mockSingle.mockResolvedValue({ data: { plan_tier: 'free' } });
    const dest = await resolvePostAuthDestination('user-1', { next: '//evil.com' });
    expect(dest).toBe('/dashboard');
    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  it('routes campus_admin to college dashboard', async () => {
    mockSingle.mockResolvedValue({ data: { plan_tier: 'campus_admin' } });
    mockMaybeSingle.mockResolvedValue({ data: null });
    const dest = await resolvePostAuthDestination('admin-1', {});
    expect(dest).toBe('/college/dashboard');
    // Plan + hiring lookups run concurrently; campus_admin still wins.
    expect(mockFrom).toHaveBeenCalledWith('users');
  });

  it('defaults free users to dashboard', async () => {
    mockSingle.mockResolvedValue({ data: { plan_tier: 'free' } });
    const dest = await resolvePostAuthDestination('user-1', {});
    expect(dest).toBe('/dashboard');
  });

  it('routes hiring workspace admins to HR dashboard', async () => {
    mockSingle.mockResolvedValue({ data: { plan_tier: 'free' } });
    mockMaybeSingle.mockResolvedValue({ data: { id: 'org-1' } });
    const dest = await resolvePostAuthDestination('hr-1', {});
    expect(dest).toBe('/hiring/dashboard');
  });

  it('uses invite token when provided', async () => {
    const dest = await resolvePostAuthDestination('user-1', { inviteToken: 'abc123' });
    expect(dest).toBe('/college/join/abc123');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('extractInviteTokenFromNext', () => {
  it('extracts token from join path', () => {
    expect(extractInviteTokenFromNext('/college/join/abc123')).toBe('abc123');
    expect(extractInviteTokenFromNext('/dashboard')).toBeUndefined();
    expect(extractInviteTokenFromNext('//evil')).toBeUndefined();
  });
});
