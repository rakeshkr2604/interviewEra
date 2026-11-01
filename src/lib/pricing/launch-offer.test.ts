import { describe, expect, it } from 'vitest';
import {
  LAUNCH_CAMPAIGN_CONFIG,
  buildLaunchOffer,
  launchActivationError,
  loadLaunchOffer,
  type LaunchCampaignRow,
} from '@/lib/pricing/launch-offer';
import { computeCampaignDiscountQuote } from '@/lib/campaign-codes';
import { PAID_PLANS } from '@/lib/pricing/plans';

const NOW = new Date('2026-12-05T12:00:00.000Z');

function row(overrides: Partial<LaunchCampaignRow> = {}): LaunchCampaignRow {
  return {
    id: 'camp-early',
    code: 'EARLY100',
    label: 'Early access launch offer',
    discount_type: 'percent',
    discount_value: 10,
    applies_to_plans: ['starter', 'pro'],
    max_redemptions: 100,
    starts_at: '2026-12-01T00:00:00.000Z',
    expires_at: '2026-12-31T00:00:00.000Z',
    is_active: true,
    ...overrides,
  };
}

describe('EARLY100 quote math (server-authoritative)', () => {
  it('Starter ₹399 → ₹359 and Pro ₹999 → ₹899 at 10%, above the ₹339 / ₹849 floors', () => {
    for (const [plan, expected] of [
      ['starter', 35900],
      ['pro', 89900],
    ] as const) {
      const quote = computeCampaignDiscountQuote({
        listAmountPaise: PAID_PLANS[plan].amountPaise,
        promoFloorPaise: PAID_PLANS[plan].promoFloorPaise,
        discountType: 'percent',
        discountValue: LAUNCH_CAMPAIGN_CONFIG.discountValue,
      });
      expect(quote).toEqual({
        ok: true,
        final_amount_paise: expected,
        discount_paise: PAID_PLANS[plan].amountPaise - expected,
      });
    }
  });

  it('minimum-price protection rejects a discount deeper than the floors allow', () => {
    expect(
      computeCampaignDiscountQuote({
        listAmountPaise: PAID_PLANS.starter.amountPaise,
        promoFloorPaise: PAID_PLANS.starter.promoFloorPaise,
        discountType: 'percent',
        discountValue: 16,
      }),
    ).toEqual({ ok: false, error_code: 'CODE_BELOW_MINIMUM' });
  });
});

describe('buildLaunchOffer', () => {
  it('shows verified prices and remaining successful purchases', () => {
    expect(buildLaunchOffer(row(), 37, NOW)).toEqual({
      code: 'EARLY100',
      label: 'Early access launch offer',
      discountPercent: 10,
      plans: {
        starter: { listPaise: 39900, finalPaise: 35900 },
        pro: { listPaise: 99900, finalPaise: 89900 },
      },
      maxRedemptions: 100,
      consumedRedemptions: 37,
      remainingRedemptions: 63,
      expiresAt: '2026-12-31T00:00:00.000Z',
    });
  });

  it('hides an inactive campaign', () => {
    expect(buildLaunchOffer(row({ is_active: false }), 0, NOW)).toBeNull();
  });

  it('hides an active campaign with no explicit launch date', () => {
    expect(buildLaunchOffer(row({ starts_at: null }), 0, NOW)).toBeNull();
  });

  it('hides a campaign before its launch date and after expiry', () => {
    expect(buildLaunchOffer(row({ starts_at: '2026-12-10T00:00:00.000Z' }), 0, NOW)).toBeNull();
    expect(buildLaunchOffer(row({ expires_at: '2026-12-05T12:00:00.000Z' }), 0, NOW)).toBeNull();
  });

  it('hides an exhausted campaign (100 verified purchases)', () => {
    expect(buildLaunchOffer(row(), 100, NOW)).toBeNull();
  });

  it('only lists plans the code applies to', () => {
    expect(buildLaunchOffer(row({ applies_to_plans: ['pro'] }), 0, NOW)?.plans).toEqual({
      pro: { listPaise: 99900, finalPaise: 89900 },
    });
  });

  it('hides an offer whose discount breaches every plan floor', () => {
    expect(buildLaunchOffer(row({ discount_value: 30 }), 0, NOW)).toBeNull();
  });
});

describe('loadLaunchOffer', () => {
  function svcDouble(campaign: LaunchCampaignRow | null, consumed: number, calls: string[]) {
    return {
      from(table: string) {
        calls.push(table);
        if (table === 'campaign_codes') {
          return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: campaign, error: null }) }) }) };
        }
        return {
          select: (_cols: string, opts: unknown) => {
            calls.push(JSON.stringify(opts));
            return {
              eq: (col1: string, v1: string) => ({
                eq: async (col2: string, v2: string) => {
                  calls.push(`${col1}=${v1}`, `${col2}=${v2}`);
                  return { count: consumed, error: null };
                },
              }),
            };
          },
        };
      },
    } as never;
  }

  it('counts only CONSUMED redemptions for the remaining figure', async () => {
    const calls: string[] = [];
    const offer = await loadLaunchOffer(svcDouble(row(), 12, calls), NOW);
    expect(offer?.remainingRedemptions).toBe(88);
    expect(calls).toContain('status=consumed');
    expect(calls).toContain('campaign_code_id=camp-early');
  });

  it('does not query redemptions for an inactive draft', async () => {
    const calls: string[] = [];
    expect(await loadLaunchOffer(svcDouble(row({ is_active: false }), 0, calls), NOW)).toBeNull();
    expect(calls).toEqual(['campaign_codes']);
  });

  it('never throws when the database is unavailable', async () => {
    const svc = { from: () => { throw new Error('db down'); } } as never;
    expect(await loadLaunchOffer(svc, NOW)).toBeNull();
  });
});

describe('launchActivationError', () => {
  it('ignores other codes and inactive drafts', () => {
    expect(launchActivationError({ code: 'OTHER', is_active: true })).toBeNull();
    expect(launchActivationError({ code: 'EARLY100', is_active: false, starts_at: null })).toBeNull();
  });

  it('requires a launch date and the approved 100 cap before activation', () => {
    expect(launchActivationError({ code: 'early100', is_active: true, starts_at: null, max_redemptions: 100 })).toMatch(
      /launch date/,
    );
    expect(
      launchActivationError({ code: 'EARLY100', is_active: true, starts_at: '2026-12-01T00:00:00.000Z', max_redemptions: null }),
    ).toMatch(/100 redemptions/);
    expect(
      launchActivationError({ code: 'EARLY100', is_active: true, starts_at: '2026-12-01T00:00:00.000Z', max_redemptions: 100 }),
    ).toBeNull();
  });
});
