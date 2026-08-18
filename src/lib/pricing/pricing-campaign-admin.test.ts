import { describe, expect, it } from 'vitest';
import { slugifyCampaignName, validatePricingCampaignInput } from './pricing-campaign-admin';

describe('pricing campaign admin validation', () => {
  it('accepts a 20% both-plan campaign', () => {
    expect(
      validatePricingCampaignInput({
        discount_type: 'percent',
        discount_value: 20,
        applies_to_plans: [],
        starts_at: '2026-08-18T00:00:00.000Z',
        ends_at: '2026-08-20T00:00:00.000Z',
      }),
    ).toBeNull();
  });

  it('rejects 51% and inverted windows', () => {
    expect(
      validatePricingCampaignInput({
        discount_type: 'percent',
        discount_value: 51,
        applies_to_plans: ['starter'],
        starts_at: '2026-08-18T00:00:00.000Z',
        ends_at: '2026-08-20T00:00:00.000Z',
      }),
    ).toMatch(/0% and 50%/);

    expect(
      validatePricingCampaignInput({
        discount_type: 'percent',
        discount_value: 20,
        applies_to_plans: ['pro'],
        starts_at: '2026-08-20T00:00:00.000Z',
        ends_at: '2026-08-18T00:00:00.000Z',
      }),
    ).toMatch(/after its start/);
  });

  it('slugifies campaign names', () => {
    expect(slugifyCampaignName('Limited Time Offer')).toBe('limited-time-offer');
  });
});
