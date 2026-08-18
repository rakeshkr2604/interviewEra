import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGetUser = vi.fn();
const existingMaybeSingle = vi.fn();
const insertedSingle = vi.fn();
const insert = vi.fn();
const userUpdate = vi.fn();
const trackCampusEvent = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: authGetUser },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'campus_organizations') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: existingMaybeSingle }),
          }),
          insert,
        };
      }
      if (table === 'users') {
        return { update: userUpdate };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

vi.mock('@/lib/college/org-verification', () => ({
  resolveCampusOrgVerificationStatus: () => 'pending',
}));

vi.mock('@/lib/analytics/campus-events', () => ({
  trackCampusEvent: (...args: unknown[]) => trackCampusEvent(...args),
}));

import { POST } from './route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ATTACKER_ID = '22222222-2222-4222-8222-222222222222';
const ORG_ID = '33333333-3333-4333-8333-333333333333';

function request(body: unknown): Parameters<typeof POST>[0] {
  return new Request('http://localhost/api/college/create-org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
}

describe('POST /api/college/create-org', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUser.mockResolvedValue({
      data: {
        user: {
          id: USER_ID,
          email: 'admin@college.edu',
          email_confirmed_at: '2026-08-16T00:00:00.000Z',
        },
      },
      error: null,
    });
    existingMaybeSingle.mockResolvedValue({ data: null, error: null });
    insertedSingle.mockResolvedValue({ data: { id: ORG_ID }, error: null });
    insert.mockImplementation(() => ({
      select: () => ({ single: insertedSingle }),
    }));
    userUpdate.mockImplementation(() => ({
      eq: vi.fn(async () => ({ error: null })),
    }));
  });

  it('returns 401 without an authenticated session', async () => {
    authGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(request({ collegeName: 'Example College', studentCount: 100 }));

    expect(response.status).toBe(401);
    expect(insert).not.toHaveBeenCalled();
  });

  it('blocks an authenticated but unverified account', async () => {
    authGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'admin@college.edu', email_confirmed_at: null } },
      error: null,
    });

    const response = await POST(request({ collegeName: 'Example College', studentCount: 100 }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Email verification is required.' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('uses session identity and ignores browser-supplied user identity', async () => {
    const response = await POST(
      request({
        userId: ATTACKER_ID,
        admin_user_id: ATTACKER_ID,
        verification_status: 'approved',
        plan_tier: 'campus_admin',
        collegeName: 'Example College',
        studentCount: 100,
      }),
    );

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({
      name: 'Example College',
      admin_user_id: USER_ID,
      seat_count: 100,
      plan_start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      verification_status: 'pending',
    });
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('preserves the existing 409 duplicate behavior and status', async () => {
    existingMaybeSingle.mockResolvedValue({
      data: { id: ORG_ID, verification_status: 'pending' },
      error: null,
    });

    const response = await POST(request({ collegeName: 'Example College', studentCount: 100 }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Organization already exists for this account.',
      status: 'pending',
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it('validates organization fields server-side', async () => {
    const response = await POST(request({ collegeName: 'X', studentCount: 0 }));

    expect(response.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });
});
