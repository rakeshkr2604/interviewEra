import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'admin@college.edu' };
const ORG_ID = '22222222-2222-4222-8222-222222222222';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  enforceBulkInviteRequestRateLimit: vi.fn(),
  enforceBulkInviteRecipientBudget: vi.fn(),
  acquireBulkInviteOrgLock: vi.fn(),
  releaseBulkInviteRecipientBudget: vi.fn(),
  sendCampusInviteEmails: vi.fn(),
  isPlatformAdminUser: vi.fn(),
  profileSingle: vi.fn(),
  orgSingle: vi.fn(),
  studentsCount: vi.fn(),
  pendingCount: vi.fn(),
  existingInvites: vi.fn(),
  existingUsers: vi.fn(),
  insertInvites: vi.fn(),
  trackCampusEvent: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => mocks.getUser() },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: async () => mocks.studentsCount(),
              };
            }
            return {
              eq: () => ({
                single: () => mocks.profileSingle(),
              }),
              in: async () => mocks.existingUsers(),
            };
          },
        };
      }
      if (table === 'campus_organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: () => mocks.orgSingle(),
            }),
          }),
        };
      }
      if (table === 'campus_invites') {
        return {
          select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: () => ({
                  eq: async () => mocks.pendingCount(),
                }),
              };
            }
            return {
              eq: async () => mocks.existingInvites(),
            };
          },
          insert: (rows: unknown[]) => ({
            select: async () => mocks.insertInvites(rows),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
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
    enforceBulkInviteRecipientBudget: (...args: unknown[]) =>
      mocks.enforceBulkInviteRecipientBudget(...args),
    acquireBulkInviteOrgLock: (...args: unknown[]) => mocks.acquireBulkInviteOrgLock(...args),
    releaseBulkInviteRecipientBudget: (...args: unknown[]) =>
      mocks.releaseBulkInviteRecipientBudget(...args),
  };
});

vi.mock('@/lib/college/bulk-invite-send', () => ({
  sendCampusInviteEmails: (...args: unknown[]) => mocks.sendCampusInviteEmails(...args),
}));

vi.mock('@/lib/admin/auth', () => ({
  isPlatformAdminUser: (...args: unknown[]) => mocks.isPlatformAdminUser(...args),
}));

vi.mock('@/lib/analytics/campus-events', () => ({
  trackCampusEvent: (...args: unknown[]) => mocks.trackCampusEvent(...args),
}));

vi.mock('@/lib/server/get-base-url', () => ({
  getBaseUrl: () => 'https://interviewera.com',
}));

import { POST } from '@/app/api/college/bulk-invite/route';

function inviteRequest(body: unknown): Request {
  return new Request('http://localhost/api/college/bulk-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/college/bulk-invite guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: USER }, error: null });
    mocks.enforceBulkInviteRequestRateLimit.mockResolvedValue(null);
    mocks.enforceBulkInviteRecipientBudget.mockResolvedValue(null);
    mocks.acquireBulkInviteOrgLock.mockResolvedValue({
      ok: true,
      lock: { release: vi.fn(async () => undefined) },
    });
    mocks.isPlatformAdminUser.mockResolvedValue(false);
    mocks.profileSingle.mockResolvedValue({ data: { plan_tier: 'campus_admin' }, error: null });
    mocks.orgSingle.mockResolvedValue({
      data: {
        id: ORG_ID,
        name: 'Demo <College>',
        seat_count: 100,
        verification_status: 'approved',
      },
      error: null,
    });
    mocks.studentsCount.mockResolvedValue({ count: 0, error: null });
    mocks.pendingCount.mockResolvedValue({ count: 0, error: null });
    mocks.existingInvites.mockResolvedValue({ data: [], error: null });
    mocks.existingUsers.mockResolvedValue({ data: [], error: null });
    mocks.insertInvites.mockImplementation(async (rows: { email: string }[]) => ({
      data: rows.map((r, i) => ({ email: r.email, token: `tok${i}` })),
      error: null,
    }));
    mocks.sendCampusInviteEmails.mockResolvedValue({
      accepted: 1,
      emailErrors: 0,
      unknownOutcomes: 0,
    });
  });

  it('rejects unauthenticated callers before Resend', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(inviteRequest({ emails: ['a@x.com'] }) as never);
    expect(res.status).toBe(401);
    expect(mocks.sendCampusInviteEmails).not.toHaveBeenCalled();
  });

  it('rejects unauthorized roles before Resend', async () => {
    mocks.profileSingle.mockResolvedValue({ data: { plan_tier: 'free' }, error: null });
    const res = await POST(inviteRequest({ emails: ['a@x.com'] }) as never);
    expect(res.status).toBe(403);
    expect(mocks.sendCampusInviteEmails).not.toHaveBeenCalled();
  });

  it('fails closed on request rate-limit backend outage', async () => {
    mocks.enforceBulkInviteRequestRateLimit.mockResolvedValue(
      NextResponse.json(
        { error: 'Service temporarily unavailable', code: 'rate_limit_backend_unavailable' },
        { status: 503 },
      ),
    );
    const res = await POST(inviteRequest({ emails: ['a@x.com'] }) as never);
    expect(res.status).toBe(503);
    expect(mocks.sendCampusInviteEmails).not.toHaveBeenCalled();
    expect(mocks.insertInvites).not.toHaveBeenCalled();
  });

  it('rejects oversized recipient lists before send', async () => {
    const emails = Array.from({ length: 501 }, (_, i) => `u${i}@example.com`);
    const res = await POST(inviteRequest({ emails }) as never);
    expect(res.status).toBe(400);
    expect(mocks.sendCampusInviteEmails).not.toHaveBeenCalled();
  });

  it('dedupes recipients and escapes org name in HTML', async () => {
    const res = await POST(
      inviteRequest({
        emails: ['A@X.com', 'a@x.com', 'b@x.com'],
        source: 'manual',
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(mocks.sendCampusInviteEmails).toHaveBeenCalledTimes(1);
    const args = mocks.sendCampusInviteEmails.mock.calls[0][0];
    expect(args.invites).toHaveLength(2);
    const html = args.htmlFor({ email: 'a@x.com', token: 'tok0' });
    expect(html).not.toContain('<College>');
    expect(html).toContain('Demo &lt;College&gt;');
  });

  it('does not send when recipient budget is exhausted', async () => {
    mocks.enforceBulkInviteRecipientBudget.mockResolvedValue(
      NextResponse.json(
        { error: 'Invitation send limit reached', code: 'bulk_invite_recipient_limit' },
        { status: 429 },
      ),
    );
    const res = await POST(inviteRequest({ emails: ['a@x.com'] }) as never);
    expect(res.status).toBe(429);
    expect(mocks.sendCampusInviteEmails).not.toHaveBeenCalled();
  });

  it('releases lock even when send runs', async () => {
    const release = vi.fn(async () => undefined);
    mocks.acquireBulkInviteOrgLock.mockResolvedValue({ ok: true, lock: { release } });
    await POST(inviteRequest({ emails: ['a@x.com'] }) as never);
    expect(release).toHaveBeenCalled();
  });
});
