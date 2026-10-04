import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const USER = { id: '11111111-1111-4111-8111-111111111111' };

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  enforceBulkInviteRequestRateLimit: vi.fn(),
  sendCampusInviteEmails: vi.fn(),
  profileSingle: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
  }),
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mocks.profileSingle(),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/college/bulk-invite-guards', async () => {
  const actual = await vi.importActual<typeof import('@/lib/college/bulk-invite-guards')>(
    '@/lib/college/bulk-invite-guards',
  );
  return {
    ...actual,
    enforceBulkInviteRequestRateLimit: (...args: unknown[]) =>
      mocks.enforceBulkInviteRequestRateLimit(...args),
  };
});

vi.mock('@/lib/college/bulk-invite-send', () => ({
  sendCampusInviteEmails: (...args: unknown[]) => mocks.sendCampusInviteEmails(...args),
}));

import { POST } from '@/app/api/admin/bulk-invite/route';

describe('POST /api/admin/bulk-invite guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mocks.enforceBulkInviteRequestRateLimit.mockResolvedValue(null);
    mocks.profileSingle.mockResolvedValue({ data: { plan_tier: 'free' }, error: null });
  });

  it('rejects non-campus_admin before Resend', async () => {
    const res = await POST(
      new Request('http://localhost/api/admin/bulk-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: ['a@x.com'] }),
      }),
    );
    expect(res.status).toBe(403);
    expect(mocks.sendCampusInviteEmails).not.toHaveBeenCalled();
  });

  it('fails closed when request RL backend is down', async () => {
    mocks.profileSingle.mockResolvedValue({ data: { plan_tier: 'campus_admin' }, error: null });
    mocks.enforceBulkInviteRequestRateLimit.mockResolvedValue(
      NextResponse.json({ code: 'rate_limit_backend_unavailable' }, { status: 503 }),
    );
    const res = await POST(
      new Request('http://localhost/api/admin/bulk-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: ['a@x.com'] }),
      }),
    );
    expect(res.status).toBe(503);
    expect(mocks.sendCampusInviteEmails).not.toHaveBeenCalled();
  });
});
