import { describe, expect, it, vi } from 'vitest';
import {
  CAMPAIGN_DISCOUNT_USER_MESSAGES,
  computeCampaignDiscountQuote,
  MIN_CHECKOUT_PAISE,
  normalizeCampaignCode,
  releaseCampaignReservationForOrder,
  releaseStaleCampaignReservations,
  reserveCampaignCode,
} from '@/lib/campaign-codes';

describe('normalizeCampaignCode', () => {
  it('uppercases and trims', () => {
    expect(normalizeCampaignCode('  launch50 ')).toBe('LAUNCH50');
  });
});

describe('computeCampaignDiscountQuote — min charge rejection (A2)', () => {
  it('rejects when final amount would be below 100 paise (not clamp)', () => {
    const result = computeCampaignDiscountQuote({
      listAmountPaise: 14900,
      discountType: 'flat_paise',
      discountValue: 14850,
    });
    expect(result).toEqual({ ok: false, error_code: 'CODE_BELOW_MINIMUM' });
  });

  it('rejects 100% / full-list flat discount', () => {
    const result = computeCampaignDiscountQuote({
      listAmountPaise: 14900,
      discountType: 'flat_paise',
      discountValue: 14900,
    });
    expect(result).toEqual({ ok: false, error_code: 'CODE_BELOW_MINIMUM' });
  });

  it('accepts discount that leaves at least MIN_CHECKOUT_PAISE', () => {
    const result = computeCampaignDiscountQuote({
      listAmountPaise: 14900,
      discountType: 'percent',
      discountValue: 50,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.final_amount_paise).toBeGreaterThanOrEqual(MIN_CHECKOUT_PAISE);
      expect(result.discount_paise).toBe(7450);
      expect(result.final_amount_paise).toBe(7450);
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

describe('releaseCampaignReservationForOrder — payment fail / dismiss path', () => {
  it('releases reservation linked on the payment row via atomic RPC', async () => {
    const redemptionId = 'red-111';
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
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
    expect(result).toEqual({ released: true, redemptionId });
    expect(rpc).toHaveBeenCalledWith('release_campaign_reservation', {
      p_redemption_id: redemptionId,
    });
  });

  it('after release, a new reserve for the same user+code can proceed (retry path)', async () => {
    const firstRedemption = 'red-old';
    const secondRedemption = 'red-new';

    const releaseRpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const releaseSvc = {
      rpc: releaseRpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { campaign_redemption_id: firstRedemption },
              error: null,
            }),
          })),
        })),
      })),
    };
    const released = await releaseCampaignReservationForOrder(releaseSvc as never, 'order_old');
    expect(released.released).toBe(true);

    const reserveRpc = vi.fn().mockResolvedValue({
      data: [
        {
          ok: true,
          error_code: null,
          redemption_id: secondRedemption,
          campaign_code_id: 'code-1',
          discount_paise: 1490,
          final_amount_paise: 13410,
          label: 'Promo',
          kind: 'promo',
        },
      ],
      error: null,
    });
    const reserved = await reserveCampaignCode({ rpc: reserveRpc } as never, {
      userId: 'user-1',
      code: 'RK2604',
      plan: 'starter',
      listAmountPaise: 14900,
    });

    expect(reserved.ok).toBe(true);
    expect(reserved.redemption_id).toBe(secondRedemption);
    expect(reserved.redemption_id).not.toBe(firstRedemption);
    expect(reserveRpc).toHaveBeenCalledWith('reserve_campaign_code', expect.any(Object));
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
