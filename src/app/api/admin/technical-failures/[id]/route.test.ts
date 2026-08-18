import { beforeEach, describe, expect, it, vi } from 'vitest';

const CASE_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

const state = vi.hoisted(() => ({
  authorized: true,
}));
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: vi.fn(async () =>
    state.authorized
      ? {
          admin: { id: ADMIN_ID, email: 'admin@interviewera.com' },
          error: null,
        }
      : {
          admin: null,
          error: Response.json({ error: 'Forbidden' }, { status: 403 }),
        },
  ),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ rpc: mocks.rpc }),
}));

import { PATCH } from '@/app/api/admin/technical-failures/[id]/route';

function request(body: unknown): Request {
  return new Request(`http://localhost/api/admin/technical-failures/${CASE_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: CASE_ID }) };

describe('technical failure admin action route', () => {
  beforeEach(() => {
    state.authorized = true;
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: [{ action_applied: true }], error: null });
  });

  it('rejects non-admin callers before any credit RPC', async () => {
    state.authorized = false;

    const response = await PATCH(request({ action: 'approve', reason: 'Platform failure' }), params);

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('derives reviewer identity and fixed action from the authenticated admin', async () => {
    const response = await PATCH(request({ action: 'approve', reason: 'Provider outage confirmed' }), params);

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('review_technical_failure_case', {
      p_case_id: CASE_ID,
      p_reviewer_id: ADMIN_ID,
      p_reviewer_email: 'admin@interviewera.com',
      p_action: 'approve',
      p_reason: 'Provider outage confirmed',
    });
  });

  it('uses a separate idempotent RPC for service recovery', async () => {
    await PATCH(request({ action: 'service_recovery', reason: 'Resolution exceeded 72 hours' }), params);

    expect(mocks.rpc).toHaveBeenCalledWith('grant_service_recovery_credit', {
      p_case_id: CASE_ID,
      p_reviewer_id: ADMIN_ID,
      p_reviewer_email: 'admin@interviewera.com',
      p_reason: 'Resolution exceeded 72 hours',
    });
  });

  it('returns a safe conflict when no restorable debit exists', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: 'No restorable interview credit was found for this interview' },
    });

    const response = await PATCH(request({ action: 'approve', reason: 'Confirmed failure' }), params);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'No restorable interview credit was found for this interview.',
    });
  });
});
