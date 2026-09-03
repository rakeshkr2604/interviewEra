import { describe, expect, it } from 'vitest';
import {
  applyCampaignToPlan,
  chooseCheckoutAmount,
  isPricingCampaignLive,
  publicSnapshotToPromoQuotes,
  selectLiveCampaignForPlan,
  windowsOverlap,
  type PricingCampaignRecord,
} from './effective-price';

const NOW = new Date('2026-08-18T12:00:00.000Z');

function campaign(overrides: Partial<PricingCampaignRecord> = {}): PricingCampaignRecord {
  return {
    id: 'camp-1',
    name: 'Limited Time Offer',
    slug: 'limited-time-offer',
    is_active: true,
    discount_type: 'percent',
    discount_value: 20,
    applies_to_plans: [],
    starts_at: '2026-08-18T00:00:00.000Z',
    ends_at: '2026-08-20T00:00:00.000Z',
    display_label: '20% OFF',
    display_badge: 'LIMITED TIME OFFER',
    ...overrides,
  };
}

describe('global pricing campaign', () => {
  it('returns list price when no campaign is present', () => {
    const starter = applyCampaignToPlan('starter', null, NOW);
    const pro = applyCampaignToPlan('pro', null, NOW);
    expect(starter.finalPrice).toBe(29900);
    expect(pro.finalPrice).toBe(79900);
    expect(starter.campaignId).toBeNull();
  });

  it('applies an active 20% campaign to both plans', () => {
    const row = campaign();
    const starter = applyCampaignToPlan('starter', row, NOW);
    const pro = applyCampaignToPlan('pro', row, NOW);
    expect(starter.finalPrice).toBe(23900);
    expect(starter.discountAmount).toBe(6000);
    expect(starter.discountPercent).toBe(20);
    expect(pro.finalPrice).toBe(63900);
    expect(pro.discountAmount).toBe(16000);
    expect(starter.campaignName).toBe('Limited Time Offer');
  });

  it('ignores a campaign that has not started', () => {
    const row = campaign({ starts_at: '2026-08-19T00:00:00.000Z' });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(29900);
  });

  it('ignores an expired campaign even when is_active is still true', () => {
    const row = campaign({ ends_at: '2026-08-18T12:00:00.000Z' });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('pro', row, NOW).finalPrice).toBe(79900);
  });

  it('ignores a paused campaign even during its active window', () => {
    const row = campaign({ status: 'paused', is_active: false });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(29900);
  });

  it('ignores an archived campaign', () => {
    const row = campaign({ status: 'archived', is_active: false });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(29900);
  });

  it('ignores a draft campaign', () => {
    const row = campaign({ status: 'draft', is_active: false });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(29900);
  });

  it('applies only to Starter when targeted', () => {
    const row = campaign({ applies_to_plans: ['starter'] });
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(23900);
    expect(applyCampaignToPlan('pro', row, NOW).finalPrice).toBe(79900);
    expect(selectLiveCampaignForPlan([row], 'pro', NOW)).toBeNull();
  });

  it('applies only to Pro when targeted', () => {
    const row = campaign({ applies_to_plans: ['pro'] });
    expect(applyCampaignToPlan('starter', row, NOW).campaignId).toBeNull();
    expect(applyCampaignToPlan('pro', row, NOW).finalPrice).toBe(63900);
  });

  it('treats empty applies_to_plans as both plans', () => {
    const row = campaign({ applies_to_plans: [] });
    expect(selectLiveCampaignForPlan([row], 'starter', NOW)?.id).toBe('camp-1');
    expect(selectLiveCampaignForPlan([row], 'pro', NOW)?.id).toBe('camp-1');
  });

  it('applies a 0% campaign without changing the price', () => {
    const row = campaign({ discount_value: 0 });
    const starter = applyCampaignToPlan('starter', row, NOW);
    expect(starter.finalPrice).toBe(29900);
    expect(starter.discountAmount).toBe(0);
    expect(starter.campaignId).toBe('camp-1');
  });

  it('skips an invalid percent above 50% and keeps list price', () => {
    const row = campaign({ discount_value: 51 });
    const starter = applyCampaignToPlan('starter', row, NOW);
    expect(starter.finalPrice).toBe(29900);
    expect(starter.campaignId).toBeNull();
  });

  it('never returns a negative price for an oversized flat discount', () => {
    const row = campaign({
      discount_type: 'flat_paise',
      discount_value: 999999,
    });
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(29900);
  });

  it('does not expose a public quote when the live campaign has a 0% discount', () => {
    const snapshot = {
      plans: {
        starter: {
          basePrice: 299,
          finalPrice: 299,
          discountAmount: 0,
          discountPercent: 0,
          basePricePaise: 29900,
          finalPricePaise: 29900,
          discountAmountPaise: 0,
        },
        pro: {
          basePrice: 799,
          finalPrice: 799,
          discountAmount: 0,
          discountPercent: 0,
          basePricePaise: 79900,
          finalPricePaise: 79900,
          discountAmountPaise: 0,
        },
      },
      campaign: {
        active: true,
        name: 'Zero',
        label: '0% OFF',
        startsAt: '2026-08-18T00:00:00.000Z',
        endsAt: '2026-08-20T00:00:00.000Z',
      },
      serverNow: NOW.toISOString(),
    };
    expect(publicSnapshotToPromoQuotes(snapshot)).toBeUndefined();
  });
});

describe('coupon vs global campaign precedence', () => {
  it('uses the coupon when it is the lower final amount', () => {
    const campaignPrice = applyCampaignToPlan('starter', campaign({ discount_value: 10 }), NOW);
    const decision = chooseCheckoutAmount({
      listAmountPaise: 29900,
      campaign: campaignPrice,
      coupon: { final_amount_paise: 20900, discount_paise: 9000 },
    });
    expect(decision.source).toBe('coupon');
    expect(decision.finalAmountPaise).toBe(20900);
    expect(decision.pricingCampaignId).toBeNull();
  });

  it('uses the global campaign when it is strictly better than the coupon', () => {
    const campaignPrice = applyCampaignToPlan('starter', campaign({ discount_value: 20 }), NOW);
    const decision = chooseCheckoutAmount({
      listAmountPaise: 29900,
      campaign: campaignPrice,
      coupon: { final_amount_paise: 26900, discount_paise: 3000 },
    });
    expect(decision.source).toBe('campaign');
    expect(decision.finalAmountPaise).toBe(23900);
    expect(decision.pricingCampaignId).toBe('camp-1');
  });

  it('does not stack coupon and campaign percentages', () => {
    const campaignPrice = applyCampaignToPlan('starter', campaign({ discount_value: 20 }), NOW);
    const decision = chooseCheckoutAmount({
      listAmountPaise: 29900,
      campaign: campaignPrice,
      coupon: { final_amount_paise: 20900, discount_paise: 9000 },
    });
    expect(decision.finalAmountPaise).not.toBeLessThan(20900);
    expect(decision.source).toBe('coupon');
  });

  it('uses the campaign when no coupon is supplied', () => {
    const campaignPrice = applyCampaignToPlan('starter', campaign(), NOW);
    const decision = chooseCheckoutAmount({
      listAmountPaise: 29900,
      campaign: campaignPrice,
      coupon: null,
    });
    expect(decision.source).toBe('campaign');
    expect(decision.finalAmountPaise).toBe(23900);
  });
});

describe('campaign window overlap', () => {
  it('detects overlapping half-open windows', () => {
    expect(
      windowsOverlap(
        '2026-08-18T00:00:00.000Z',
        '2026-08-20T00:00:00.000Z',
        '2026-08-19T00:00:00.000Z',
        '2026-08-21T00:00:00.000Z',
      ),
    ).toBe(true);
    expect(
      windowsOverlap(
        '2026-08-18T00:00:00.000Z',
        '2026-08-20T00:00:00.000Z',
        '2026-08-20T00:00:00.000Z',
        '2026-08-22T00:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('compares instants, not ISO string layout', () => {
    expect(
      windowsOverlap(
        '2026-08-18T00:00:00.000Z',
        '2026-08-20T00:00:00.000Z',
        '2026-08-19T05:30:00+05:30',
        '2026-08-21T00:00:00+00:00',
      ),
    ).toBe(true);
    expect(
      windowsOverlap(
        '2026-08-18T00:00:00.000Z',
        '2026-08-20T00:00:00.000Z',
        '2026-08-20T00:00:00+00:00',
        '2026-08-22T00:00:00+00:00',
      ),
    ).toBe(false);
  });
});
