import { beforeEach, describe, expect, it, vi } from 'vitest';

const campaignUpdate = vi.fn();
const campaignInsert = vi.fn();
const auditInsert = vi.fn();
const productEventInsert = vi.fn();

let currentMockCampaign = {
  id: 'camp-123',
  name: 'Weekend Offer',
  slug: 'weekend-offer-xyz',
  status: 'active',
  is_active: true,
  discount_type: 'percent',
  discount_value: 20,
  applies_to_plans: ['starter', 'pro'],
  starts_at: '2026-09-01T00:00:00.000Z',
  ends_at: '2026-09-10T00:00:00.000Z',
};

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: async () => ({
    admin: { id: 'admin-uuid-1' },
    error: null,
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'pricing_campaigns') {
        return {
          select: () => ({
            eq: (_field: string, _val: unknown) => ({
              maybeSingle: async () => ({ data: { ...currentMockCampaign }, error: null }),
              gt: () => ({
                neq: () => Promise.resolve({ data: [], error: null }),
                then: (resolve: (val: unknown) => unknown) =>
                  Promise.resolve({ data: [], error: null }).then(resolve),
              }),
            }),
          }),
          update: campaignUpdate,
          insert: campaignInsert,
        };
      }
      if (table === 'campaign_audit_logs') return { insert: auditInsert };
      if (table === 'product_events') return { insert: productEventInsert };
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { POST } from './route';

function request(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/admin/pricing-campaigns/${id}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/pricing-campaigns/[id]/operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockCampaign = {
      id: 'camp-123',
      name: 'Weekend Offer',
      slug: 'weekend-offer-xyz',
      status: 'active',
      is_active: true,
      discount_type: 'percent',
      discount_value: 20,
      applies_to_plans: ['starter', 'pro'],
      starts_at: '2026-09-01T00:00:00.000Z',
      ends_at: '2026-09-10T00:00:00.000Z',
    };

    campaignUpdate.mockReturnValue({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: { ...currentMockCampaign }, error: null }),
        }),
      }),
    });

    campaignInsert.mockImplementation((row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => ({ data: { id: 'new-camp-456', ...row }, error: null }),
      }),
    }));

    auditInsert.mockResolvedValue({ error: null });
    productEventInsert.mockResolvedValue({ error: null });
  });

  it('pauses an active campaign', async () => {
    const res = await POST(request('camp-123', { action: 'pause' }), {
      params: Promise.resolve({ id: 'camp-123' }),
    });
    expect(res.status).toBe(200);
    expect(campaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'paused',
        is_active: false,
      }),
    );
  });

  it('handles pause idempotently if already paused', async () => {
    currentMockCampaign.status = 'paused';
    currentMockCampaign.is_active = false;

    const res = await POST(request('camp-123', { action: 'pause' }), {
      params: Promise.resolve({ id: 'camp-123' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { already_paused?: boolean };
    expect(body.already_paused).toBe(true);
    expect(campaignUpdate).not.toHaveBeenCalled();
  });

  it('handles activate idempotently if already active', async () => {
    currentMockCampaign.status = 'active';
    currentMockCampaign.is_active = true;

    const res = await POST(request('camp-123', { action: 'activate' }), {
      params: Promise.resolve({ id: 'camp-123' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { already_active?: boolean };
    expect(body.already_active).toBe(true);
    expect(campaignUpdate).not.toHaveBeenCalled();
  });

  it('ends a campaign immediately', async () => {
    const res = await POST(request('camp-123', { action: 'end' }), {
      params: Promise.resolve({ id: 'camp-123' }),
    });
    expect(res.status).toBe(200);
    expect(campaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ended',
        is_active: false,
      }),
    );
  });

  it('extends a campaign window with future ends_at', async () => {
    // Must stay strictly after Date.now() — hardcoded near-term dates time-bomb in CI.
    const newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const res = await POST(
      request('camp-123', { action: 'extend', new_ends_at: newEnd }),
      { params: Promise.resolve({ id: 'camp-123' }) },
    );
    expect(res.status).toBe(200);
    expect(campaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        ends_at: newEnd,
      }),
    );
  });

  it('continues a campaign as a new instance linked via parent_campaign_id', async () => {
    const res = await POST(
      request('camp-123', {
        action: 'continue',
        starts_at: '2026-10-01T00:00:00.000Z',
        ends_at: '2026-10-05T00:00:00.000Z',
      }),
      { params: Promise.resolve({ id: 'camp-123' }) },
    );
    expect(res.status).toBe(201);
    expect(campaignInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        parent_campaign_id: 'camp-123',
        name: 'Weekend Offer',
        is_active: true,
      }),
    );
  });

  it('duplicates a campaign into a draft clone', async () => {
    const res = await POST(
      request('camp-123', { action: 'duplicate' }),
      { params: Promise.resolve({ id: 'camp-123' }) },
    );
    expect(res.status).toBe(201);
    expect(campaignInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'draft',
        is_active: false,
      }),
    );
  });

  it('restores an archived campaign strictly to draft', async () => {
    currentMockCampaign.status = 'archived';
    currentMockCampaign.is_active = false;

    const res = await POST(
      request('camp-123', { action: 'restore' }),
      { params: Promise.resolve({ id: 'camp-123' }) },
    );
    expect(res.status).toBe(200);
    expect(campaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'draft',
        is_active: false,
        archived_at: null,
      }),
    );
  });
});
