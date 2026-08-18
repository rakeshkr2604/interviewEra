import { describe, expect, it, vi } from 'vitest';

const getPublicPricingSnapshot = vi.fn();

vi.mock('@/lib/pricing/effective-price', () => ({
  getPublicPricingSnapshot: (...args: unknown[]) => getPublicPricingSnapshot(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({}),
}));

import { GET } from './route';

describe('GET /api/pricing/public', () => {
  it('returns plan prices and campaign metadata without admin fields', async () => {
    getPublicPricingSnapshot.mockResolvedValue({
      plans: {
        starter: {
          basePrice: 299,
          finalPrice: 239,
          discountAmount: 60,
          discountPercent: 20,
          basePricePaise: 29900,
          finalPricePaise: 23900,
          discountAmountPaise: 6000,
        },
        pro: {
          basePrice: 799,
          finalPrice: 639,
          discountAmount: 160,
          discountPercent: 20,
          basePricePaise: 79900,
          finalPricePaise: 63900,
          discountAmountPaise: 16000,
        },
      },
      campaign: {
        active: true,
        name: 'Limited Time Offer',
        label: '20% OFF',
        startsAt: '2026-08-18T00:00:00.000Z',
        endsAt: '2026-08-20T00:00:00.000Z',
      },
      serverNow: '2026-08-18T12:00:00.000Z',
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const json = (await response.json()) as Record<string, unknown>;
    expect(json).not.toHaveProperty('created_by');
    expect(json).not.toHaveProperty('slug');
    expect(JSON.stringify(json)).not.toContain('created_by');
    expect(json.campaign).toMatchObject({
      active: true,
      name: 'Limited Time Offer',
      label: '20% OFF',
    });
    expect(json.plans).toMatchObject({
      starter: { basePrice: 299, finalPrice: 239, discountPercent: 20 },
      pro: { basePrice: 799, finalPrice: 639, discountPercent: 20 },
    });
  });
});
