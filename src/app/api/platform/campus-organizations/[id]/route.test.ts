import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const requirePlatformAdmin = vi.fn();
const rpc = vi.fn();

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: (...args: unknown[]) => requirePlatformAdmin(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ rpc }),
}));

import { POST } from '@/app/api/platform/campus-organizations/[id]/route';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR_ID = '22222222-2222-4222-8222-222222222222';

function request(body: unknown): Request {
  return new Request(`http://localhost/api/platform/campus-organizations/${ORG_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function context(id = ORG_ID) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/platform/campus-organizations/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePlatformAdmin.mockResolvedValue({
      admin: { id: ACTOR_ID, email: 'founder@example.com' },
      error: null,
    });
    rpc.mockResolvedValue({
      data: {
        organization_id: ORG_ID,
        verification_status: 'approved',
        new_plan_tier: 'campus_admin',
      },
      error: null,
    });
  });

  it('denies unauthenticated callers', async () => {
    requirePlatformAdmin.mockResolvedValue({
      admin: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const response = await POST(request({ action: 'approved' }), context());
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(['normal authenticated user', 'student', 'campus admin'])(
    'denies %s',
    async () => {
      requirePlatformAdmin.mockResolvedValue({
        admin: null,
        error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
      });
      const response = await POST(request({ action: 'approved' }), context());
      expect(response.status).toBe(403);
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it('allows a founder/platform admin to approve through the atomic RPC', async () => {
    const response = await POST(request({ action: 'approved' }), context());
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('review_campus_organization', {
      p_organization_id: ORG_ID,
      p_actor_user_id: ACTOR_ID,
      p_action: 'approved',
      p_reason: null,
    });
  });

  it('requires and forwards a bounded rejection reason', async () => {
    const response = await POST(
      request({ action: 'rejected', reason: 'Domain could not be verified.' }),
      context(),
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      'review_campus_organization',
      expect.objectContaining({
        p_action: 'rejected',
        p_reason: 'Domain could not be verified.',
      }),
    );
  });

  it('rejects an invalid organization id before calling the RPC', async () => {
    const response = await POST(request({ action: 'approved' }), context('not-a-uuid'));
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects a rejection without a reason', async () => {
    const response = await POST(request({ action: 'rejected', reason: '' }), context());
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['approved → approve again', 'campus_organization_not_pending'],
    ['rejected → approve', 'campus_organization_not_pending'],
    ['two-tab duplicate', 'campus_organization_not_pending'],
  ])('returns a safe conflict for %s', async (_label, message) => {
    rpc.mockResolvedValue({
      data: null,
      error: { message, code: '40001' },
    });
    const response = await POST(request({ action: 'approved' }), context());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Organization is no longer pending.' });
  });

  it('returns 503 when the review RPC migration is unavailable', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'Could not find the function public.review_campus_organization',
        code: 'PGRST202',
      },
    });
    const response = await POST(request({ action: 'approved' }), context());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Approval database migration is not available.',
    });
  });
});
