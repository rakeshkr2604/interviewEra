import { beforeEach, describe, expect, it, vi } from 'vitest';

const authGetUser = vi.fn();
const responses = new Map<string, Array<Record<string, unknown>>>();
const mutations: Array<{ table: string; operation: string; payload: unknown }> = [];

function next(table: string) {
  return responses.get(table)?.shift() ?? { data: null, error: null };
}

function builder(table: string) {
  let operation = 'select';
  let payload: unknown;
  const query = {
    select() {
      operation = 'select';
      return query;
    },
    update(value: unknown) {
      operation = 'update';
      payload = value;
      mutations.push({ table, operation, payload });
      return query;
    },
    upsert(value: unknown) {
      operation = 'upsert';
      payload = value;
      mutations.push({ table, operation, payload });
      return query;
    },
    eq() {
      return query;
    },
    single() {
      return Promise.resolve(next(table));
    },
    then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(next(table)).then(resolve, reject);
    },
  };
  return query;
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: authGetUser } }),
  createServiceClient: () => ({ from: (table: string) => builder(table) }),
}));

import { POST } from '@/app/api/college/join/route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ORG_ID = '22222222-2222-4222-8222-222222222222';

function request(): Request {
  return new Request('http://localhost/api/college/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'invite-token',
      inviteEmail: 'student@example.com',
      orgId: ORG_ID,
    }),
  });
}

function baseInvite() {
  return {
    data: {
      id: '33333333-3333-4333-8333-333333333333',
      org_id: ORG_ID,
      email: 'student@example.com',
      status: 'pending',
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    },
    error: null,
  };
}

describe('POST /api/college/join campus approval gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    responses.clear();
    mutations.length = 0;
    authGetUser.mockResolvedValue({
      data: { user: { id: USER_ID, email: 'student@example.com' } },
      error: null,
    });
  });

  it('denies a pending organization before any privileged mutation', async () => {
    responses.set('campus_invites', [baseInvite()]);
    responses.set('campus_organizations', [{
      data: { id: ORG_ID, seat_count: 50, verification_status: 'pending' },
      error: null,
    }]);

    const response = await POST(request() as never);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: 'Campus organization is pending verification.',
    });
    expect(mutations).toEqual([]);
  });

  it('allows an approved organization through the existing join lifecycle', async () => {
    responses.set('campus_invites', [
      baseInvite(),
      { count: 1, error: null },
      { error: null },
    ]);
    responses.set('campus_organizations', [{
      data: { id: ORG_ID, seat_count: 50, verification_status: 'approved' },
      error: null,
    }]);
    responses.set('users', [
      { count: 0, error: null },
      { error: null },
    ]);
    responses.set('college_enrollments', [{ error: null }]);

    const response = await POST(request() as never);
    expect(response.status).toBe(200);
    expect(mutations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ table: 'campus_invites', operation: 'update' }),
        expect.objectContaining({
          table: 'users',
          operation: 'update',
          payload: { campus_org_id: ORG_ID, plan_tier: 'campus' },
        }),
        expect.objectContaining({ table: 'college_enrollments', operation: 'upsert' }),
      ]),
    );
  });
});
