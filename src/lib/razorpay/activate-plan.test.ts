import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  activatePlanAfterPayment,
  activationWasFresh,
  type ActivatePlanParams,
} from '@/lib/razorpay/activate-plan';
import { computePlanExpiry, getPaidPlan } from '@/lib/pricing/plans';

vi.mock('@/lib/razorpay/payment-log', () => ({
  activationLog: vi.fn(),
  activationError: vi.fn(),
}));

const USER_ID = '11111111-1111-1111-1111-111111111111';
const ORDER_STARTER = 'order_starter_001';
const ORDER_PRO = 'order_pro_002';
const PAY_STARTER = 'pay_starter_001';
const PAY_PRO = 'pay_pro_002';
const PAY_RENEW = 'pay_renew_003';

type PaymentRow = {
  id: string;
  user_id: string;
  order_id: string;
  payment_id: string | null;
  plan: 'starter' | 'pro';
  amount: number;
  status: 'created' | 'paid' | 'failed';
};

type UserRow = {
  id: string;
  plan_tier: string;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  credits_remaining: number;
  last_payment_id: string | null;
  last_order_id: string | null;
  plan_status: string;
};

type CreditTx = { user_id: string; amount: number; reason: string };

function createPaymentStore(initial: { user: UserRow; payments: PaymentRow[] }) {
  const state = {
    user: { ...initial.user },
    payments: initial.payments.map((p) => ({ ...p })),
    ledger: [] as CreditTx[],
    paymentUpdates: 0,
    userUpdates: 0,
  };

  const supabase = {
    from(table: string) {
      if (table === 'payments') {
        return {
          select: (_cols: string) => ({
            eq: (column: string, value: string) => ({
              maybeSingle: async () => {
                if (column === 'order_id') {
                  const row = state.payments.find((p) => p.order_id === value);
                  return { data: row ? { ...row } : null, error: null };
                }
                return { data: null, error: null };
              },
            }),
          }),
          update: (payload: Partial<PaymentRow>) => ({
            eq: async (column: string, value: string) => {
              const idx = state.payments.findIndex((p) => p[column as keyof PaymentRow] === value);
              if (idx >= 0) {
                state.payments[idx] = { ...state.payments[idx], ...payload };
                state.paymentUpdates++;
              }
              return { error: null };
            },
          }),
        };
      }

      if (table === 'users') {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => {
                if (state.user.id !== id) return { data: null, error: null };
                return { data: { ...state.user }, error: null };
              },
            }),
          }),
          update: (payload: Partial<UserRow>) => ({
            eq: (col: string, id: string) => ({
              neq: (neqCol: string, neqVal: string) => ({
                select: async () => {
                  if (col !== 'id' || state.user.id !== id) {
                    return { data: [], error: null };
                  }
                  if (state.user[neqCol as keyof UserRow] === neqVal) {
                    return { data: [], error: null };
                  }
                  state.user = { ...state.user, ...payload };
                  state.userUpdates++;
                  return { data: [{ id }], error: null };
                },
              }),
            }),
          }),
        };
      }

      if (table === 'credit_transactions') {
        return {
          insert: async (row: CreditTx) => {
            state.ledger.push(row);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { supabase: supabase as unknown as SupabaseClient, state };
}

function baseUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: USER_ID,
    plan_tier: 'free',
    plan_started_at: null,
    plan_expires_at: null,
    credits_remaining: 3,
    last_payment_id: null,
    last_order_id: null,
    plan_status: 'none',
    ...overrides,
  };
}

function starterPayment(
  orderId = ORDER_STARTER,
  status: PaymentRow['status'] = 'created',
  paymentId: string | null = null,
): PaymentRow {
  return {
    id: 'row-starter',
    user_id: USER_ID,
    order_id: orderId,
    payment_id: paymentId,
    plan: 'starter',
    amount: 14900,
    status,
  };
}

const starterParams = (source: string, paymentId = PAY_STARTER): ActivatePlanParams => ({
  userId: USER_ID,
  plan: 'starter',
  orderId: ORDER_STARTER,
  paymentId,
  amountPaise: 14900,
  source,
});

function assertSingleActivation(state: ReturnType<typeof createPaymentStore>['state']) {
  expect(state.userUpdates).toBeLessThanOrEqual(1);
  expect(state.paymentUpdates).toBeLessThanOrEqual(1);
  expect(state.ledger).toHaveLength(1);
}

describe('activatePlanAfterPayment — dual-path idempotent activation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verify first — activates immediately (verify-only path)', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser(),
      payments: [starterPayment()],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect(activationWasFresh(result)).toBe(true);
    if (!activationWasFresh(result)) return;
    expect(state.user.plan_tier).toBe('starter');
    expect(state.user.credits_remaining).toBe(11);
    assertSingleActivation(state);
  });

  it('webhook first — payment row already paid, user not yet activated', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser(),
      payments: [starterPayment(ORDER_STARTER, 'paid', PAY_STARTER)],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('webhook'));

    expect(activationWasFresh(result)).toBe(true);
    expect(state.user.credits_remaining).toBe(11);
    assertSingleActivation(state);
  });

  it('verify then webhook — credits exactly once', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser({ credits_remaining: 4 }),
      payments: [starterPayment()],
    });

    const first = await activatePlanAfterPayment(supabase, starterParams('verify'));
    const second = await activatePlanAfterPayment(supabase, starterParams('webhook'));

    expect(activationWasFresh(first)).toBe(true);
    expect(first.alreadyActivated).toBe(false);
    expect(second.alreadyActivated).toBe(true);
    expect(state.user.credits_remaining).toBe(12);
    assertSingleActivation(state);
  });

  it('webhook then verify — credits exactly once', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser(),
      payments: [starterPayment()],
    });

    const first = await activatePlanAfterPayment(supabase, starterParams('webhook'));
    const second = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect(activationWasFresh(first)).toBe(true);
    expect(second.alreadyActivated).toBe(true);
    expect(state.user.credits_remaining).toBe(11);
    assertSingleActivation(state);
  });

  it('webhook only — standalone activation', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser(),
      payments: [starterPayment()],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('webhook'));

    expect(activationWasFresh(result)).toBe(true);
    expect(state.payments[0].status).toBe('paid');
    assertSingleActivation(state);
  });

  it('simultaneous verify + webhook — one activation only', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser(),
      payments: [starterPayment()],
    });

    const [a, b] = await Promise.all([
      activatePlanAfterPayment(supabase, starterParams('verify')),
      activatePlanAfterPayment(supabase, starterParams('webhook')),
    ]);

    const freshCount = [a, b].filter((r) => activationWasFresh(r)).length;
    const replayCount = [a, b].filter((r) => 'alreadyActivated' in r && r.alreadyActivated).length;

    expect(freshCount).toBe(1);
    expect(replayCount).toBe(1);
    expect(state.user.credits_remaining).toBe(11);
    assertSingleActivation(state);
  });

  it('duplicate webhook retries — idempotent', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser(),
      payments: [starterPayment()],
    });

    const params = starterParams('webhook');
    await activatePlanAfterPayment(supabase, params);
    await activatePlanAfterPayment(supabase, params);
    await activatePlanAfterPayment(supabase, params);

    expect(state.user.credits_remaining).toBe(11);
    assertSingleActivation(state);
  });

  it('duplicate verify retries — idempotent', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser({ credits_remaining: 2 }),
      payments: [starterPayment()],
    });

    const params = starterParams('verify');
    await activatePlanAfterPayment(supabase, params);
    await activatePlanAfterPayment(supabase, params);

    expect(state.user.credits_remaining).toBe(10);
    assertSingleActivation(state);
  });

  it('renewal extends expiry once with leftover credits', async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 10);

    const { supabase, state } = createPaymentStore({
      user: baseUser({
        plan_tier: 'starter',
        plan_status: 'active',
        credits_remaining: 2,
        plan_started_at: new Date().toISOString(),
        plan_expires_at: future.toISOString(),
        last_payment_id: 'pay_old',
      }),
      payments: [starterPayment(ORDER_STARTER, 'created')],
    });

    await activatePlanAfterPayment(supabase, {
      ...starterParams('webhook'),
      paymentId: PAY_RENEW,
    });

    expect(state.user.credits_remaining).toBe(10);
    const expectedExpiry = computePlanExpiry(future, getPaidPlan('starter').durationDays);
    expect(new Date(state.user.plan_expires_at!).toISOString()).toBe(expectedExpiry.toISOString());
    assertSingleActivation(state);
  });

  it('upgrade Starter → Pro grants pro credits once', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        plan_tier: 'starter',
        plan_status: 'active',
        credits_remaining: 1,
        last_payment_id: PAY_STARTER,
      }),
      payments: [
        {
          id: 'row-pro',
          user_id: USER_ID,
          order_id: ORDER_PRO,
          payment_id: null,
          plan: 'pro',
          amount: 39900,
          status: 'created',
        },
      ],
    });

    await activatePlanAfterPayment(supabase, {
      userId: USER_ID,
      plan: 'pro',
      orderId: ORDER_PRO,
      paymentId: PAY_PRO,
      amountPaise: 39900,
      source: 'verify',
    });

    expect(state.user.plan_tier).toBe('pro');
    expect(state.user.credits_remaining).toBe(26);
    expect(state.user.last_payment_id).toBe(PAY_PRO);
    expect(state.ledger[0].amount).toBe(25);
    assertSingleActivation(state);
  });

  it('preserves existing leftover credits on first purchase', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser({ credits_remaining: 7 }),
      payments: [starterPayment()],
    });

    await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect(state.user.credits_remaining).toBe(15);
    assertSingleActivation(state);
  });
});
