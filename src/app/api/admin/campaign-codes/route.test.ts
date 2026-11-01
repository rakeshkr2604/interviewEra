import { beforeEach, describe, expect, it, vi } from 'vitest';

const campaignInsert = vi.fn();
const productEventInsert = vi.fn();

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: async () => ({
    admin: { id: '11111111-1111-4111-8111-111111111111' },
    error: null,
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'campaign_codes') return { insert: campaignInsert };
      if (table === 'product_events') return { insert: productEventInsert };
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { POST } from './route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/admin/campaign-codes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const baseCampaign = {
  code: 'LAUNCH10',
  kind: 'promo',
  label: 'Launch',
  discount_type: 'percent',
  discount_value: 10,
  applies_to_plans: ['starter'],
  max_redemptions: 100,
  starts_at: '2026-08-16T10:00:00.000Z',
  expires_at: '2026-08-17T10:00:00.000Z',
  is_active: true,
};

describe('POST /api/admin/campaign-codes pricing validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignInsert.mockImplementation((row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => ({
          data: { id: 'campaign-1', ...row },
          error: null,
        }),
      }),
    }));
    productEventInsert.mockResolvedValue({ error: null });
  });

  it('rejects percent discounts above 50 server-side', async () => {
    const response = await POST(
      request({ ...baseCampaign, discount_value: 51 }),
    );

    expect(response.status).toBe(400);
    expect(campaignInsert).not.toHaveBeenCalled();
  });

  it('rejects campaign windows whose end is not after start', async () => {
    const response = await POST(
      request({
        ...baseCampaign,
        expires_at: baseCampaign.starts_at,
      }),
    );

    expect(response.status).toBe(400);
    expect(campaignInsert).not.toHaveBeenCalled();
  });

  describe('EARLY100 launch campaign guard', () => {
    const early = {
      code: 'early100',
      kind: 'promo',
      label: 'Early access launch offer',
      discount_type: 'percent',
      discount_value: 10,
      applies_to_plans: ['starter', 'pro'],
      max_redemptions: 100,
    };

    it('allows creating EARLY100 as an inactive draft without a launch date', async () => {
      const response = await POST(request({ ...early, is_active: false, starts_at: null }));
      expect(response.status).toBe(201);
      expect(campaignInsert).toHaveBeenCalledWith(
        expect.objectContaining({ discount_value: 10, max_redemptions: 100, is_active: false }),
      );
    });

    it('refuses to activate EARLY100 without an explicit launch date', async () => {
      const response = await POST(request({ ...early, is_active: true, starts_at: null }));
      expect(response.status).toBe(400);
      expect(campaignInsert).not.toHaveBeenCalled();
    });

    it('refuses an active EARLY100 with a cap other than 100', async () => {
      const response = await POST(
        request({ ...early, is_active: true, starts_at: '2026-12-01T00:00:00.000Z', max_redemptions: 500 }),
      );
      expect(response.status).toBe(400);
    });

    it('accepts an active EARLY100 with a launch date and the approved cap', async () => {
      const response = await POST(
        request({ ...early, is_active: true, starts_at: '2026-12-01T00:00:00.000Z' }),
      );
      expect(response.status).toBe(201);
    });
  });

  it.each([30, 50])('rejects a %i percent campaign below the Starter ₹339 floor', async (percent) => {
    const response = await POST(request({ ...baseCampaign, discount_value: percent }));
    expect(response.status).toBe(400);
    expect(campaignInsert).not.toHaveBeenCalled();
  });

  it.each([0, 10, 15])('accepts a valid %i percent campaign', async (percent) => {
    const response = await POST(
      request({ ...baseCampaign, discount_value: percent }),
    );

    expect(response.status).toBe(201);
    expect(campaignInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        discount_value: percent,
        applies_to_plans: ['starter'],
      }),
    );
  });
});
