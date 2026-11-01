import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyCampaignToPlan,
  chooseCheckoutAmount,
  getPublicPricingSnapshot,
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
    discount_value: 10,
    applies_to_plans: [],
    starts_at: '2026-08-18T00:00:00.000Z',
    ends_at: '2026-08-20T00:00:00.000Z',
    display_label: '10% OFF',
    display_badge: 'LIMITED TIME OFFER',
    ...overrides,
  };
}

describe('global pricing campaign', () => {
  it('returns list price when no campaign is present', () => {
    const starter = applyCampaignToPlan('starter', null, NOW);
    const pro = applyCampaignToPlan('pro', null, NOW);
    expect(starter.finalPrice).toBe(39900);
    expect(pro.finalPrice).toBe(99900);
    expect(starter.campaignId).toBeNull();
  });

  it('applies an active 10% campaign to both plans (₹399 → ₹359, ₹999 → ₹899)', () => {
    const row = campaign();
    const starter = applyCampaignToPlan('starter', row, NOW);
    const pro = applyCampaignToPlan('pro', row, NOW);
    expect(starter.finalPrice).toBe(35900);
    expect(starter.discountAmount).toBe(4000);
    expect(starter.discountPercent).toBe(10);
    expect(pro.finalPrice).toBe(89900);
    expect(pro.discountAmount).toBe(10000);
    expect(starter.campaignName).toBe('Limited Time Offer');
  });

  it('rejects a 20% campaign that would undercut the ₹339 / ₹849 promotional floors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const row = campaign({ discount_value: 20 });
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(39900);
    expect(applyCampaignToPlan('pro', row, NOW).finalPrice).toBe(99900);
    expect(applyCampaignToPlan('starter', row, NOW).campaignId).toBeNull();
    errorSpy.mockRestore();
  });

  it('ignores a campaign that has not started', () => {
    const row = campaign({ starts_at: '2026-08-19T00:00:00.000Z' });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(39900);
  });

  it('ignores an expired campaign even when is_active is still true', () => {
    const row = campaign({ ends_at: '2026-08-18T12:00:00.000Z' });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('pro', row, NOW).finalPrice).toBe(99900);
  });

  it('ignores a paused campaign even during its active window', () => {
    const row = campaign({ status: 'paused', is_active: false });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(39900);
  });

  it('ignores an archived campaign', () => {
    const row = campaign({ status: 'archived', is_active: false });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(39900);
  });

  it('ignores a draft campaign', () => {
    const row = campaign({ status: 'draft', is_active: false });
    expect(isPricingCampaignLive(row, NOW)).toBe(false);
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(39900);
  });

  it('applies only to Starter when targeted', () => {
    const row = campaign({ applies_to_plans: ['starter'] });
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(35900);
    expect(applyCampaignToPlan('pro', row, NOW).finalPrice).toBe(99900);
    expect(selectLiveCampaignForPlan([row], 'pro', NOW)).toBeNull();
  });

  it('applies only to Pro when targeted', () => {
    const row = campaign({ applies_to_plans: ['pro'] });
    expect(applyCampaignToPlan('starter', row, NOW).campaignId).toBeNull();
    expect(applyCampaignToPlan('pro', row, NOW).finalPrice).toBe(89900);
  });

  it('treats empty applies_to_plans as both plans', () => {
    const row = campaign({ applies_to_plans: [] });
    expect(selectLiveCampaignForPlan([row], 'starter', NOW)?.id).toBe('camp-1');
    expect(selectLiveCampaignForPlan([row], 'pro', NOW)?.id).toBe('camp-1');
  });

  it('applies a 0% campaign without changing the price', () => {
    const row = campaign({ discount_value: 0 });
    const starter = applyCampaignToPlan('starter', row, NOW);
    expect(starter.finalPrice).toBe(39900);
    expect(starter.discountAmount).toBe(0);
    expect(starter.campaignId).toBe('camp-1');
  });

  it('skips an invalid percent above 50% and keeps list price', () => {
    const row = campaign({ discount_value: 51 });
    const starter = applyCampaignToPlan('starter', row, NOW);
    expect(starter.finalPrice).toBe(39900);
    expect(starter.campaignId).toBeNull();
  });

  it('never returns a negative price for an oversized flat discount', () => {
    const row = campaign({
      discount_type: 'flat_paise',
      discount_value: 999999,
    });
    expect(applyCampaignToPlan('starter', row, NOW).finalPrice).toBe(39900);
  });

  it('does not expose a public quote when the live campaign has a 0% discount', () => {
    const snapshot = {
      plans: {
        starter: {
          basePrice: 399,
          finalPrice: 399,
          discountAmount: 0,
          discountPercent: 0,
          basePricePaise: 39900,
          finalPricePaise: 39900,
          discountAmountPaise: 0,
        },
        pro: {
          basePrice: 999,
          finalPrice: 999,
          discountAmount: 0,
          discountPercent: 0,
          basePricePaise: 99900,
          finalPricePaise: 99900,
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
      listAmountPaise: 39900,
      campaign: campaignPrice,
      coupon: { final_amount_paise: 34900, discount_paise: 5000 },
    });
    expect(decision.source).toBe('coupon');
    expect(decision.finalAmountPaise).toBe(34900);
    expect(decision.pricingCampaignId).toBeNull();
  });

  it('uses the global campaign when it is strictly better than the coupon', () => {
    const campaignPrice = applyCampaignToPlan('starter', campaign({ discount_value: 10 }), NOW);
    const decision = chooseCheckoutAmount({
      listAmountPaise: 39900,
      campaign: campaignPrice,
      coupon: { final_amount_paise: 37900, discount_paise: 2000 },
    });
    expect(decision.source).toBe('campaign');
    expect(decision.finalAmountPaise).toBe(35900);
    expect(decision.pricingCampaignId).toBe('camp-1');
  });

  it('does not stack coupon and campaign percentages', () => {
    const campaignPrice = applyCampaignToPlan('starter', campaign({ discount_value: 10 }), NOW);
    const decision = chooseCheckoutAmount({
      listAmountPaise: 39900,
      campaign: campaignPrice,
      coupon: { final_amount_paise: 34900, discount_paise: 5000 },
    });
    expect(decision.finalAmountPaise).not.toBeLessThan(34900);
    expect(decision.source).toBe('coupon');
  });

  it('uses the campaign when no coupon is supplied', () => {
    const campaignPrice = applyCampaignToPlan('starter', campaign(), NOW);
    const decision = chooseCheckoutAmount({
      listAmountPaise: 39900,
      campaign: campaignPrice,
      coupon: null,
    });
    expect(decision.source).toBe('campaign');
    expect(decision.finalAmountPaise).toBe(35900);
  });
});

describe('getPublicPricingSnapshot (placeholder E2E credentials)', () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
    vi.restoreAllMocks();
  });

  it('uses list prices and does not query campaigns when credentials are placeholders', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

    const from = vi.fn(() => {
      throw new Error('pricing_campaigns must not be queried with placeholder credentials');
    });
    const svc = { from } as never;
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const snapshot = await getPublicPricingSnapshot(svc, NOW);

    expect(from).not.toHaveBeenCalled();
    expect(snapshot.plans.starter.finalPrice).toBe(399);
    expect(snapshot.plans.pro.finalPrice).toBe(999);
    expect(snapshot.campaign.active).toBe(false);
    expect(infoSpy).toHaveBeenCalledWith(
      '[pricing-campaign] placeholder credentials; using list prices',
    );
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
