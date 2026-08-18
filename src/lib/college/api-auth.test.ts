import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGetUser = vi.fn();
const profileSingle = vi.fn();
const orgSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: authGetUser },
  }),
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: table === 'users' ? profileSingle : orgSingle,
          eq: () => ({ single: orgSingle }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/admin/auth', () => ({
  isPlatformAdminUser: vi.fn(async () => false),
}));

import { requireCampusAuth } from '@/lib/college/api-auth';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';

describe('requireCampusAuth approval gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'admin@college.edu' } },
      error: null,
    });
    profileSingle.mockResolvedValue({ data: { plan_tier: 'campus_admin' } });
  });

  it('denies an unauthenticated caller', async () => {
    authGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await requireCampusAuth('invites:manage');
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('denies a pending organization before service-role business access', async () => {
    orgSingle.mockResolvedValue({
      data: {
        id: ORG_ID,
        name: 'Pending College',
        seat_count: 50,
        admin_user_id: USER_ID,
        verification_status: 'pending',
      },
    });
    const result = await requireCampusAuth('invites:manage');
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect(await (result as Response).json()).toEqual({
      error: 'Campus organization is pending verification.',
    });
  });

  it('denies a rejected organization', async () => {
    orgSingle.mockResolvedValue({
      data: {
        id: ORG_ID,
        name: 'Rejected College',
        seat_count: 50,
        admin_user_id: USER_ID,
        verification_status: 'rejected',
      },
    });
    const result = await requireCampusAuth('deadlines:manage');
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it('allows an approved organization with the required permission', async () => {
    orgSingle.mockResolvedValue({
      data: {
        id: ORG_ID,
        name: 'Approved College',
        seat_count: 50,
        admin_user_id: USER_ID,
        verification_status: 'approved',
      },
    });
    const result = await requireCampusAuth('students:read');
    expect(result).toEqual({
      userId: USER_ID,
      org: {
        id: ORG_ID,
        name: 'Approved College',
        seatCount: 50,
        adminUserId: USER_ID,
        verificationStatus: 'approved',
      },
      role: 'campus_admin',
    });
  });
});
