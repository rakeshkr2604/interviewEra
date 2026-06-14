import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { activatePlanAfterPayment } from '@/lib/razorpay/activate-plan';

vi.mock('@/lib/razorpay/payment-log', () => ({
  paymentError: vi.fn(),
  paymentLog: vi.fn(),
}));

const USER_ID = '11111111-1111-1111-1111-111111111111';
const ORDER_ID = 'order_test123456';
const PAYMENT_ID = 'pay_test12345678';

function createActivationSupabaseMock(options: {
  existingCredits: number;
  paymentAlreadyPaid?: boolean;
}) {
  const usersUpdate = vi.fn().mockImplementation(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  const creditTxInsert = vi.fn().mockResolvedValue({ error: null });

  const supabase = {
    from: (table: string) => {
      if (table === 'payments') {
        return {
          select: () => ({
            eq: (column: string) => ({
              maybeSingle: async () => {
                if (column === 'payment_id') {
                  if (options.paymentAlreadyPaid) {
                    return {
                      data: {
                        id: 'pay-row',
                        status: 'paid',
                        user_id: USER_ID,
                        plan: 'starter',
                        amount: 14900,
                      },
                      error: null,
                    };
                  }
                  return { data: null, error: null };
                }
                if (column === 'order_id') {
                  return {
                    data: {
                      id: 'order-row',
                      user_id: USER_ID,
                      plan: 'starter',
                      amount: 14900,
                      status: 'created',
                    },
                    error: null,
                  };
                }
                throw new Error(`Unexpected payments.eq column: ${column}`);
              },
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }

      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  plan_tier: 'free',
                  plan_started_at: null,
                  plan_expires_at: null,
                  credits_remaining: options.existingCredits,
                },
                error: null,
              }),
            }),
          }),
          update: usersUpdate,
        };
      }

      if (table === 'credit_transactions') {
        return {
          insert: creditTxInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { supabase: supabase as unknown as SupabaseClient, usersUpdate, creditTxInsert };
}

describe('activatePlanAfterPayment', () => {
  it('adds plan credits to existing balance (4 + 8 = 12)', async () => {
    const { supabase, usersUpdate, creditTxInsert } = createActivationSupabaseMock({
      existingCredits: 4,
    });

    const result = await activatePlanAfterPayment(supabase, {
      userId: USER_ID,
      plan: 'starter',
      orderId: ORDER_ID,
      paymentId: PAYMENT_ID,
      amountPaise: 14900,
      source: 'verify',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped).toBe(false);

    expect(usersUpdate).toHaveBeenCalledOnce();
    const updatePayload = usersUpdate.mock.calls[0]?.[0] as { credits_remaining: number };
    expect(updatePayload.credits_remaining).toBe(12);

    expect(creditTxInsert).toHaveBeenCalledOnce();
    const txPayload = creditTxInsert.mock.calls[0]?.[0] as { amount: number };
    expect(txPayload.amount).toBe(8);
  });

  it('skips user credit update when payment is already paid (idempotent)', async () => {
    const { supabase, usersUpdate, creditTxInsert } = createActivationSupabaseMock({
      existingCredits: 4,
      paymentAlreadyPaid: true,
    });

    const result = await activatePlanAfterPayment(supabase, {
      userId: USER_ID,
      plan: 'starter',
      orderId: ORDER_ID,
      paymentId: PAYMENT_ID,
      amountPaise: 14900,
      source: 'verify',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped).toBe(true);
    expect(usersUpdate).not.toHaveBeenCalled();
    expect(creditTxInsert).not.toHaveBeenCalled();
  });
});
