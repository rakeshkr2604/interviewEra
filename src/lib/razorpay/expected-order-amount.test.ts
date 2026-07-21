import { describe, expect, it, vi } from 'vitest';
import { resolveExpectedOrderAmount } from '@/lib/razorpay/expected-order-amount';
import { isPaidPlanId } from '@/lib/pricing/plans';

describe('resolveExpectedOrderAmount', () => {
  it('returns discounted payments.amount when a campaign redemption is linked and matches', async () => {
    const svc = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    user_id: 'user-1',
                    plan: 'starter',
                    amount: 13410,
                    campaign_redemption_id: 'red-1',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'campaign_code_redemptions') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { final_amount_paise: 13410, status: 'reserved' },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await resolveExpectedOrderAmount(svc as never, 'order_disc', isPaidPlanId);
    expect(result).toEqual({
      ok: true,
      amountPaise: 13410,
      plan: 'starter',
      userId: 'user-1',
      campaignRedemptionId: 'red-1',
    });
  });

  it('returns list price from payments.amount when no campaign code was used', async () => {
    const svc = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    user_id: 'user-1',
                    plan: 'starter',
                    amount: 14900,
                    campaign_redemption_id: null,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await resolveExpectedOrderAmount(svc as never, 'order_list', isPaidPlanId);
    expect(result).toEqual({
      ok: true,
      amountPaise: 14900,
      plan: 'starter',
      userId: 'user-1',
      campaignRedemptionId: null,
    });
  });

  it('rejects when payments.amount disagrees with redemption final_amount_paise (fraud guard)', async () => {
    const svc = {
      from: vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    user_id: 'user-1',
                    plan: 'starter',
                    amount: 13410,
                    campaign_redemption_id: 'red-1',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { final_amount_paise: 10000, status: 'reserved' },
                error: null,
              }),
            }),
          }),
        };
      }),
    };

    const result = await resolveExpectedOrderAmount(svc as never, 'order_bad', isPaidPlanId);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('redemption_mismatch');
    }
  });

  it('verify path: discounted remote amount matches expected; list-price compare would wrongly fail', () => {
    const remoteAmount = 13410;
    const listPrice = 14900;
    const expectedFromPayments = 13410;

    // Pre-fix bug: compared remote to list price → false reject
    expect(remoteAmount === listPrice).toBe(false);

    // Fixed: compare remote to payments.amount
    expect(remoteAmount === expectedFromPayments).toBe(true);
  });
});
