import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePlatformAdmin = vi.fn();
const tableCalls = new Map<string, number>();

const ORGS = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Alpha College',
    admin_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    seat_count: 50,
    created_at: '2026-08-01T00:00:00.000Z',
    contact_email: 'office@alpha.edu',
    coordinator_name: 'Asha',
    verification_status: 'approved',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Beta Institute',
    admin_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    seat_count: 100,
    created_at: '2026-08-02T00:00:00.000Z',
    contact_email: null,
    coordinator_name: null,
    verification_status: 'approved',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Gamma University',
    admin_user_id: null,
    seat_count: 25,
    created_at: '2026-08-03T00:00:00.000Z',
    contact_email: null,
    coordinator_name: null,
    verification_status: 'approved',
  },
];

function responseFor(table: string, call: number) {
  if (table === 'campus_organizations') {
    const counts = [3, 0, 3, 0];
    if (call < counts.length) return { data: null, count: counts[call], error: null };
    return { data: ORGS, count: 3, error: null };
  }
  if (table === 'users') {
    return {
      data: [
        {
          id: ORGS[0].admin_user_id,
          name: 'Admin Alpha',
          email: 'admin@alpha.edu',
          plan_tier: 'campus_admin',
          created_at: '2026-07-01T00:00:00.000Z',
        },
        {
          id: ORGS[1].admin_user_id,
          name: 'Admin Beta',
          email: 'admin@beta.edu',
          plan_tier: 'campus_admin',
          created_at: '2026-07-02T00:00:00.000Z',
        },
      ],
      error: null,
    };
  }
  if (table === 'college_enrollments') {
    return { data: null, count: call + 1, error: null };
  }
  if (table === 'campus_organization_review_events') {
    return {
      data: null,
      error: {
        code: 'PGRST205',
        message: "Could not find the table 'public.campus_organization_review_events'",
      },
    };
  }
  return { data: null, error: null };
}

function queryBuilder(table: string, call: number) {
  const response = responseFor(table, call);
  const query = {
    select: () => query,
    order: () => query,
    eq: () => query,
    or: () => query,
    in: () => query,
    range: () => Promise.resolve(response),
    then: (
      resolve: (value: typeof response) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(response).then(resolve, reject),
  };
  return query;
}

const service = {
  from(table: string) {
    const call = tableCalls.get(table) ?? 0;
    tableCalls.set(table, call + 1);
    return queryBuilder(table, call);
  },
};

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: (...args: unknown[]) => requirePlatformAdmin(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => service,
}));

import { GET } from '@/app/api/platform/campus-organizations/route';

describe('GET /api/platform/campus-organizations', () => {
  beforeEach(() => {
    tableCalls.clear();
    requirePlatformAdmin.mockResolvedValue({
      admin: { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', email: 'founder@example.com' },
      error: null,
    });
  });

  it('returns authoritative organizations when only optional review history schema is missing', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/platform/campus-organizations?status=approved&page=1&pageSize=10',
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.organizations).toHaveLength(3);
    expect(body.counts).toEqual({ all: 3, pending: 0, approved: 3, rejected: 0 });
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 10, total: 3 });
    expect(body.capabilities.reviewActions).toBe(false);
    expect(body.warning).toContain('review migration is not installed');
    expect(body.organizations[0]).toMatchObject({
      name: 'Alpha College',
      domain: 'alpha.edu',
      memberCount: 1,
    });
  });
});
