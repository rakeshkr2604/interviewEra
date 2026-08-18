import { beforeEach, describe, expect, it, vi } from 'vitest';

const campaignInsert = vi.fn();
const productEventInsert = vi.fn();
const overlapSelect = vi.fn();

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: async () => ({
    admin: { id: '11111111-1111-4111-8111-111111111111' },
    error: null,
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'pricing_campaigns') {
        return {
          insert: campaignInsert,
          select: overlapSelect,
        };
      }
      if (table === 'product_events') return { insert: productEventInsert };
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { POST } from './route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/admin/pricing-campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const baseCampaign = {
  name: 'Limited Time Offer',
  discount_type: 'percent',
  discount_value: 20,
  applies_to_plans: ['starter', 'pro'],
  starts_at: '2026-08-18T00:00:00.000Z',
  ends_at: '2026-08-20T00:00:00.000Z',
  display_badge: 'LIMITED TIME OFFER',
  is_active: false,
};

describe('POST /api/admin/pricing-campaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    overlapSelect.mockReturnValue({
      eq: () => Promise.resolve({ data: [], error: null }),
    });
    campaignInsert.mockImplementation((row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => ({
          data: { id: 'camp-1', ...row },
          error: null,
        }),
      }),
    }));
    productEventInsert.mockResolvedValue({ error: null });
  });

  it('rejects percent discounts above 50', async () => {
    const response = await POST(request({ ...baseCampaign, discount_value: 51 }));
    expect(response.status).toBe(400);
    expect(campaignInsert).not.toHaveBeenCalled();
  });

  it('rejects windows whose end is not after start', async () => {
    const response = await POST(
      request({ ...baseCampaign, ends_at: baseCampaign.starts_at }),
    );
    expect(response.status).toBe(400);
    expect(campaignInsert).not.toHaveBeenCalled();
  });

  it('creates a draft 20% campaign', async () => {
    const response = await POST(request(baseCampaign));
    expect(response.status).toBe(201);
    expect(campaignInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Limited Time Offer',
        discount_value: 20,
        is_active: false,
        slug: 'limited-time-offer',
      }),
    );
  });
});
