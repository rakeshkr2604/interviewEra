import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockLt = vi.fn();
const mockEq = vi.fn();
const mockInSelect = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInUpdate = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
    })),
  })),
}));

import { GET } from '@/app/api/cron/plan-expiry/route';

describe('GET /api/cron/plan-expiry', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    mockSelect.mockReset();
    mockUpdate.mockReset();
    mockInSelect.mockReset();
    mockEq.mockReset();
    mockLt.mockReset();
    mockInUpdate.mockReset();
  });

  function wireSelectChain(data: { id: string; plan_tier: string }[] | null, error: null | { code: string; message: string } = null) {
    mockLt.mockResolvedValue({ data, error });
    mockEq.mockReturnValue({ lt: mockLt });
    mockInSelect.mockReturnValue({ eq: mockEq });
    mockSelect.mockReturnValue({ in: mockInSelect });
  }

  function wireUpdateChain(error: null | { code: string; message: string } = null) {
    mockInUpdate.mockResolvedValue({ error });
    mockUpdate.mockReturnValue({ in: mockInUpdate });
  }

  it('rejects without CRON_SECRET bearer', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const req = new NextRequest('http://localhost/api/cron/plan-expiry');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns ok with zero downgrades when none expired', async () => {
    process.env.CRON_SECRET = 'test-secret';
    wireSelectChain([]);

    const req = new NextRequest('http://localhost/api/cron/plan-expiry', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, downgraded: 0 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('downgrades expired paid users and zeroes credits', async () => {
    process.env.CRON_SECRET = 'test-secret';
    wireSelectChain([
      { id: 'user-1', plan_tier: 'starter' },
      { id: 'user-2', plan_tier: 'pro' },
    ]);
    wireUpdateChain();

    const req = new NextRequest('http://localhost/api/cron/plan-expiry', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, downgraded: 2 });
    expect(mockUpdate).toHaveBeenCalledWith({
      plan_tier: 'free',
      plan_status: 'expired',
      credits_remaining: 0,
    });
    expect(mockInUpdate).toHaveBeenCalledWith('id', ['user-1', 'user-2']);
  });
});
