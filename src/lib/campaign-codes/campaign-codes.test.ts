import { describe, expect, it, vi } from 'vitest';
import {
  attachCampaignOrder,
  CAMPAIGN_DISCOUNT_USER_MESSAGES,
  campaignAppliesToPlan,
  campaignWindowStatus,
  computeCampaignDiscountQuote,
  MIN_CHECKOUT_PAISE,
  normalizeCampaignCode,
  consumeCampaignRedemption,
  quoteCampaignDiscount,
  releaseCampaignReservationForOrder,
  releaseStaleCampaignReservations,
  reserveCampaignCode,
} from '@/lib/campaign-codes';

describe('normalizeCampaignCode', () => {
  it('uppercases and trims', () => {
    expect(normalizeCampaignCode('  launch50 ')).toBe('LAUNCH50');
  });
});

describe('campaign timing uses a half-open [start, expiry) window', () => {
  const start = new Date('2026-08-16T10:00:00.000Z');
  const expiry = new Date('2026-08-16T11:00:00.000Z');

  it('rejects before start and accepts exactly at start', () => {
    expect(campaignWindowStatus(start, expiry, new Date(start.getTime() - 1))).toBe(
      'not_started',
    );
    expect(campaignWindowStatus(start, expiry, start)).toBe('active');
  });

  it('accepts before expiry and rejects exactly at/after expiry', () => {
    expect(campaignWindowStatus(start, expiry, new Date(expiry.getTime() - 1))).toBe(
      'active',
    );
    expect(campaignWindowStatus(start, expiry, expiry)).toBe('expired');
    expect(campaignWindowStatus(start, expiry, new Date(expiry.getTime() + 1))).toBe(
      'expired',
    );
  });
});

describe('campaign plan eligibility', () => {
  it('accepts plan-specific campaigns only on their plan', () => {
    expect(campaignAppliesToPlan(['starter'], 'starter')).toBe(true);
    expect(campaignAppliesToPlan(['starter'], 'pro')).toBe(false);
    expect(campaignAppliesToPlan(['pro'], 'pro')).toBe(true);
  });

  it('treats an empty plan list as both plans', () => {
    expect(campaignAppliesToPlan([], 'starter')).toBe(true);
    expect(campaignAppliesToPlan([], 'pro')).toBe(true);
  });
});

describe('quoteCampaignDiscount RPC contract', () => {
  it('maps the exact SQL quote metadata columns', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        ok: true,
        error_code: null,
        campaign_code_id: 'campaign-1',
        discount_paise: 9000,
        final_amount_paise: 20900,
        label: 'Launch',
        kind: 'promo',
        discount_type: 'percent',
        discount_value: 30,
        starts_at: '2026-08-16T10:00:00.000Z',
        expires_at: '2026-08-16T11:00:00.000Z',
        is_active: true,
        server_now: '2026-08-16T10:30:00.000Z',
      }],
      error: null,
    });

    const result = await quoteCampaignDiscount({ rpc } as never, {
      code: 'LAUNCH30',
      plan: 'starter',
      listAmountPaise: 29900,
      promoFloorPaise: 14900,
    });

    expect(result).toMatchObject({
      ok: true,
      discount_type: 'percent',
      discount_value: 30,
      starts_at: '2026-08-16T10:00:00.000Z',
      expires_at: '2026-08-16T11:00:00.000Z',
      is_active: true,
      server_now: '2026-08-16T10:30:00.000Z',
    });
    expect(rpc).toHaveBeenCalledWith('quote_campaign_discount', {
      p_code: 'LAUNCH30',
      p_plan: 'starter',
      p_list_amount_paise: 29900,
      p_promo_floor_paise: 14900,
    });
  });
});

describe('computeCampaignDiscountQuote — authoritative campaign math', () => {
  const quote = (listAmountPaise: number, promoFloorPaise: number, discountValue: number) =>
    computeCampaignDiscountQuote({
      listAmountPaise,
      promoFloorPaise,
      discountType: 'percent',
      discountValue,
    });

  it.each([
    ['Starter 30%', 29900, 14900, 30, 20900],
    ['Starter 50%', 29900, 14900, 50, 14900],
    ['Pro 30%', 79900, 39900, 30, 55900],
    ['Pro 50%', 79900, 39900, 50, 39900],
  ])('%s produces the required whole-rupee price', (_name, list, floor, percent, final) => {
    expect(quote(list, floor, percent)).toMatchObject({
      ok: true,
      final_amount_paise: final,
      discount_paise: list - final,
    });
  });

  it.each([0, 1, 30, 50])('accepts %i percent', (percent) => {
    expect(quote(29900, 14900, percent).ok).toBe(true);
  });

  it.each([-1, 51, 100])('rejects invalid percent %i', (percent) => {
    expect(quote(29900, 14900, percent)).toEqual({
      ok: false,
      error_code: 'CODE_DISCOUNT_INVALID',
    });
  });

  it('rejects flat discounts above 50%', () => {
    expect(
      computeCampaignDiscountQuote({
        listAmountPaise: 29900,
        promoFloorPaise: 14900,
        discountType: 'flat_paise',
        discountValue: 15000,
      }),
    ).toEqual({ ok: false, error_code: 'CODE_DISCOUNT_INVALID' });
  });

  it('rejects a final amount below the plan floor', () => {
    expect(
      computeCampaignDiscountQuote({
        listAmountPaise: 29900,
        promoFloorPaise: 20000,
        discountType: 'percent',
        discountValue: 50,
      }),
    ).toEqual({ ok: false, error_code: 'CODE_BELOW_MINIMUM' });
  });

  it('keeps valid final amounts above the absolute Razorpay minimum', () => {
    const result = quote(29900, 14900, 50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.final_amount_paise).toBeGreaterThanOrEqual(MIN_CHECKOUT_PAISE);
    }
  });

  it('exposes CODE_BELOW_MINIMUM user message', () => {
    expect(CAMPAIGN_DISCOUNT_USER_MESSAGES.CODE_BELOW_MINIMUM.length).toBeGreaterThan(0);
  });
});

describe('releaseStaleCampaignReservations — cron path (A1)', () => {
  it('calls release_stale_campaign_reservations and returns released_count', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ released_count: 2 }],
      error: null,
    });
    const svc = { rpc } as never;

    const n = await releaseStaleCampaignReservations(svc, 30);
    expect(n).toBe(2);
    expect(rpc).toHaveBeenCalledWith('release_stale_campaign_reservations', {
      p_older_than_minutes: 30,
    });
  });

  it('throws when RPC fails', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    });
    await expect(releaseStaleCampaignReservations({ rpc } as never, 30)).rejects.toThrow(
      /boom/,
    );
  });
});

describe('campaign reservation ownership helpers', () => {
  it('does not report a bound order as released when the RPC rejects it', async () => {
    const redemptionId = 'red-111';
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { campaign_redemption_id: redemptionId },
      error: null,
    });
    const svc = {
      rpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle,
          })),
        })),
      })),
    };

    const result = await releaseCampaignReservationForOrder(svc as never, 'order_abc');
    expect(result).toEqual({ released: false, redemptionId });
    expect(rpc).toHaveBeenCalledWith('release_campaign_reservation', {
      p_redemption_id: redemptionId,
    });
  });

  it('maps an attached reservation replay without creating a second attempt', async () => {
    const reserveRpc = vi.fn().mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          redemption_id: 'red-existing',
          campaign_code_id: 'code-1',
          discount_paise: 9000,
          final_amount_paise: 20900,
          label: 'Promo',
          kind: 'promo',
          reservation_created: false,
          order_id: 'order-existing',
        },
      ],
      error: null,
    });
    const reserved = await reserveCampaignCode({ rpc: reserveRpc } as never, {
      userId: 'user-1',
      code: 'RK2604',
      plan: 'starter',
      listAmountPaise: 29900,
      promoFloorPaise: 14900,
    });

    expect(reserved.ok).toBe(true);
    expect(reserved).toMatchObject({
      redemption_id: 'red-existing',
      reservation_created: false,
      order_id: 'order-existing',
    });
    expect(reserveRpc).toHaveBeenCalledWith('reserve_campaign_code', expect.any(Object));
  });

  it('passes exact ownership to atomic order attachment', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const attached = await attachCampaignOrder({ rpc } as never, {
      redemptionId: 'red-a',
      userId: 'user-a',
      orderId: 'order-a',
      currency: 'INR',
    });

    expect(attached).toBe(true);
    expect(rpc).toHaveBeenCalledWith('attach_campaign_order', {
      p_redemption_id: 'red-a',
      p_user_id: 'user-a',
      p_order_id: 'order-a',
      p_currency: 'INR',
      p_gateway: 'razorpay',
    });
  });

  it('passes the exact redemption, order and payment to consume', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const consumed = await consumeCampaignRedemption({ rpc } as never, {
      redemptionId: 'red-a',
      orderId: 'order-a',
      paymentId: 'pay-a',
    });

    expect(consumed.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith('consume_campaign_redemption', {
      p_redemption_id: 'red-a',
      p_order_id: 'order-a',
      p_payment_id: 'pay-a',
    });
  });

  it('does not call release RPC when order has no redemption', async () => {
    const rpc = vi.fn();
    let call = 0;
    const svc = {
      rpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => {
            call += 1;
            if (call === 1) {
              // payments lookup
              return {
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { campaign_redemption_id: null },
                  error: null,
                }),
              };
            }
            // redemptions fallback — needs .eq().eq().maybeSingle()
            return {
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
            };
          }),
        })),
      })),
    };

    const result = await releaseCampaignReservationForOrder(svc as never, 'order_bare');
    expect(result).toEqual({ released: false, redemptionId: null });
    expect(rpc).not.toHaveBeenCalled();
  });
});
