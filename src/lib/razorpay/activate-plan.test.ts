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
  campaign_redemption_id?: string | null;
  entitlement_credits?: number | null;
  entitlement_plan_started_at?: string | null;
  entitlement_plan_expires_at?: string | null;
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

type CreditTx = {
  user_id: string;
  type: 'credit';
  amount: number;
  reason: string;
  payment_id: string | null;
};

type RedemptionRow = {
  id: string;
  status: 'reserved' | 'consumed' | 'released';
  order_id: string | null;
  payment_id: string | null;
};

function createPaymentStore(initial: {
  user: UserRow;
  payments: PaymentRow[];
  redemptions?: RedemptionRow[];
  ledger?: CreditTx[];
}) {
  const state = {
    user: { ...initial.user },
    payments: initial.payments.map((p) => ({ ...p })),
    ledger: (initial.ledger ?? []).map((row) => ({ ...row })),
    redemptions: (initial.redemptions ?? []).map((r) => ({ ...r })),
    paymentUpdates: 0,
    userUpdates: 0,
    consumeCalls: 0,
    completionCalls: 0,
  };

  const supabase = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'consume_campaign_redemption') {
        state.consumeCalls++;
        const id = args.p_redemption_id as string;
        const row = state.redemptions.find((r) => r.id === id);
        if (!row || (row.status !== 'reserved' && row.status !== 'consumed')) {
          return { data: false, error: null };
        }
        row.status = 'consumed';
        row.order_id = (args.p_order_id as string) ?? row.order_id;
        row.payment_id = (args.p_payment_id as string) ?? row.payment_id;
        return { data: true, error: null };
      }
      if (fn === 'complete_payment_activation_local') {
        state.completionCalls++;
        const userId = args.p_user_id as string;
        const orderId = args.p_order_id as string;
        const paymentId = args.p_payment_id as string;
        const payment = state.payments.find((row) => row.order_id === orderId);
        if (
          !payment ||
          payment.user_id !== userId ||
          state.user.id !== userId ||
          state.user.last_payment_id !== paymentId ||
          state.user.last_order_id !== orderId ||
          (payment.payment_id != null && payment.payment_id !== paymentId)
        ) {
          return { data: null, error: { code: 'P0001', message: 'ownership mismatch' } };
        }

        const expectedReason = `Plan payment: ${payment.plan} (${paymentId})`;
        const linked = state.ledger.filter(
          (row) => row.payment_id === paymentId && row.type === 'credit',
        );
        if (linked.length > 1) {
          return { data: null, error: { code: 'P0001', message: 'ambiguous ledger' } };
        }

        const hasSnapshot =
          payment.entitlement_credits != null &&
          payment.entitlement_plan_started_at != null &&
          payment.entitlement_plan_expires_at != null;
        const hadPaymentGap = payment.payment_id !== paymentId || payment.status !== 'paid';
        let ledgerHealed = false;

        if (linked.length === 1) {
          const row = linked[0];
          if (
            row.user_id !== userId ||
            row.reason !== expectedReason ||
            (hasSnapshot && row.amount !== payment.entitlement_credits)
          ) {
            return { data: null, error: { code: 'P0001', message: 'inconsistent ledger' } };
          }
        } else {
          if (!hasSnapshot) {
            return { data: null, error: { code: 'P0001', message: 'historical ambiguity' } };
          }
          const unlinked = state.ledger.filter(
            (row) =>
              row.payment_id == null &&
              row.user_id === userId &&
              row.type === 'credit' &&
              row.reason === expectedReason,
          );
          if (unlinked.length > 1 || (unlinked[0] && unlinked[0].amount !== payment.entitlement_credits)) {
            return { data: null, error: { code: 'P0001', message: 'ambiguous ledger' } };
          }
          if (unlinked.length === 1) {
            unlinked[0].payment_id = paymentId;
          } else {
            state.ledger.push({
              user_id: userId,
              type: 'credit',
              amount: payment.entitlement_credits!,
              reason: expectedReason,
              payment_id: paymentId,
            });
          }
          ledgerHealed = true;
        }

        payment.payment_id = paymentId;
        payment.status = 'paid';
        if (hadPaymentGap) state.paymentUpdates++;

        return {
          data: [
            {
              activation_complete: true,
              payment_healed: hadPaymentGap,
              ledger_healed: ledgerHealed,
              entitlement_credits:
                payment.entitlement_credits ?? linked[0]?.amount ?? 0,
              plan_started_at:
                payment.entitlement_plan_started_at ?? state.user.plan_started_at,
              plan_expires_at:
                payment.entitlement_plan_expires_at ?? state.user.plan_expires_at,
            },
          ],
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected rpc ${fn}` } };
    },
    from(table: string) {
      if (table === 'payments') {
        return {
          select: (_cols: string) => ({
            eq: (column: string, value: string) => ({
              maybeSingle: async () => {
                const row = state.payments.find(
                  (payment) => payment[column as keyof PaymentRow] === value,
                );
                return { data: row ? { ...row } : null, error: null };
              },
            }),
          }),
          update: (payload: Partial<PaymentRow>) => ({
            eq: (column: string, value: string) => {
              const idx = state.payments.findIndex((p) => p[column as keyof PaymentRow] === value);
              return {
                is: (_snapshotColumn: string, snapshotValue: null) => ({
                  select: (_columns: string) => ({
                    maybeSingle: async () => {
                      if (
                        idx < 0 ||
                        snapshotValue !== null ||
                        state.payments[idx].entitlement_credits != null
                      ) {
                        return { data: null, error: null };
                      }
                      state.payments[idx] = { ...state.payments[idx], ...payload };
                      return { data: { ...state.payments[idx] }, error: null };
                    },
                  }),
                }),
              };
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
          update: (payload: Partial<UserRow>) => {
            const finishUpdate = async (
              lockCol: string,
              lockMode: 'eq' | 'is',
              lockVal: string | null,
            ) => {
              if (lockCol !== 'last_payment_id') {
                return { data: [], error: null };
              }
              const current = state.user.last_payment_id;
              const lockMatches =
                lockMode === 'is'
                  ? current === null
                  : current === lockVal;
              if (!lockMatches) {
                return { data: [], error: null };
              }
              state.user = { ...state.user, ...payload };
              state.userUpdates++;
              return { data: [{ id: state.user.id }], error: null };
            };

            return {
              eq: (col: string, _id: string) => {
                if (col === 'id') {
                  return {
                    is: (lockCol: string, lockVal: null) => ({
                      select: () => finishUpdate(lockCol, 'is', lockVal),
                    }),
                    eq: (lockCol: string, lockVal: string) => ({
                      select: () => finishUpdate(lockCol, 'eq', lockVal),
                    }),
                  };
                }
                return {
                  is: () => ({ select: async () => ({ data: [], error: null }) }),
                  eq: () => ({ select: async () => ({ data: [], error: null }) }),
                };
              },
            };
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
    amount: 29900,
    status,
    entitlement_credits: null,
    entitlement_plan_started_at: null,
    entitlement_plan_expires_at: null,
  };
}

const starterParams = (source: string, paymentId = PAY_STARTER): ActivatePlanParams => ({
  userId: USER_ID,
  plan: 'starter',
  orderId: ORDER_STARTER,
  paymentId,
  amountPaise: 29900,
  source,
});

const PAY_OLD = 'pay_old';

function createStaleReadStore() {
  const startedAt = new Date('2026-08-01T00:00:00.000Z').toISOString();
  const expiresAt = new Date('2026-08-31T00:00:00.000Z').toISOString();
  const state = {
    user: baseUser({
      last_payment_id: PAY_OLD,
      last_order_id: ORDER_STARTER,
      plan_tier: 'starter',
      credits_remaining: 2,
      plan_status: 'active',
      plan_started_at: startedAt,
      plan_expires_at: expiresAt,
    }),
    payments: [
      {
        ...starterPayment(ORDER_STARTER, 'paid', PAY_STARTER),
        entitlement_credits: 8,
        entitlement_plan_started_at: startedAt,
        entitlement_plan_expires_at: expiresAt,
      },
    ],
    ledger: [
      {
        user_id: USER_ID,
        type: 'credit' as const,
        amount: 8,
        reason: `Plan payment: starter (${PAY_STARTER})`,
        payment_id: PAY_STARTER,
      },
    ],
    userUpdates: 0,
    paymentUpdates: 0,
    userSelectCount: 0,
  };

  // Webhook already activated pay_new before verify reaches CAS.
  state.user.last_payment_id = PAY_STARTER;
  state.user.credits_remaining = 10;

  const supabase = {
    rpc: async (fn: string) => {
      if (fn === 'complete_payment_activation_local') {
        return {
          data: [
            {
              activation_complete: true,
              payment_healed: false,
              ledger_healed: false,
              entitlement_credits: 8,
              plan_started_at: startedAt,
              plan_expires_at: expiresAt,
            },
          ],
          error: null,
        };
      }
      return { data: true, error: null };
    },
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
          update: () => ({
            eq: () => ({
              is: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'users') {
        return {
          select: () => ({
            eq: (_col: string, id: string) => ({
              maybeSingle: async () => {
                if (state.user.id !== id) return { data: null, error: null };
                state.userSelectCount++;
                if (state.userSelectCount === 1) {
                  return {
                    data: {
                      ...state.user,
                      last_payment_id: PAY_OLD,
                      credits_remaining: 2,
                    },
                    error: null,
                  };
                }
                return { data: { ...state.user }, error: null };
              },
            }),
          }),
          update: () => ({
            eq: (_col: string, _id: string) => ({
              is: () => ({
                select: async () => ({ data: [], error: null }),
              }),
              eq: (lockCol: string, lockVal: string) => ({
                select: async () => {
                  if (lockCol === 'last_payment_id' && lockVal === PAY_OLD) {
                    return { data: [], error: null };
                  }
                  return { data: [], error: null };
                },
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return { supabase: supabase as unknown as SupabaseClient, state };
}

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
    expect(state.user.last_payment_id).toBe(PAY_STARTER);
    assertSingleActivation(state);
  });

  it('null last_payment_id — first purchase must not hit activation conflict', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser({ last_payment_id: null, plan_tier: 'free' }),
      payments: [starterPayment()],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect(activationWasFresh(result)).toBe(true);
    expect('activationFailed' in result && result.activationFailed).toBe(false);
    expect(state.user.last_payment_id).toBe(PAY_STARTER);
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

  it('verify CAS miss after webhook — alreadyActivated not conflict', async () => {
    const { supabase, state } = createStaleReadStore();

    const result = await activatePlanAfterPayment(supabase, starterParams('verify', PAY_STARTER));

    expect(result.alreadyActivated).toBe(true);
    expect('activationFailed' in result && result.activationFailed).toBe(false);
    expect(state.user.credits_remaining).toBe(10);
    expect(state.userUpdates).toBe(0);
    expect(state.ledger).toHaveLength(1);
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

  it('upgrade Starter → Pro at current ₹799 list grants pro credits once', async () => {
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
          amount: 79900,
          status: 'created',
        },
      ],
    });

    await activatePlanAfterPayment(supabase, {
      userId: USER_ID,
      plan: 'pro',
      orderId: ORDER_PRO,
      paymentId: PAY_PRO,
      amountPaise: 79900,
      source: 'verify',
    });

    expect(state.user.plan_tier).toBe('pro');
    expect(state.user.credits_remaining).toBe(26);
    expect(state.user.last_payment_id).toBe(PAY_PRO);
    expect(state.ledger[0].amount).toBe(25);
    assertSingleActivation(state);
  });

  it('activates a frozen historical ₹798 Pro payment without reinterpreting current list price', async () => {
    const orderId = 'order_pro_historical_798';
    const paymentId = 'pay_pro_historical_798';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        plan_tier: 'starter',
        plan_status: 'active',
        credits_remaining: 1,
        last_payment_id: PAY_STARTER,
      }),
      payments: [
        {
          id: 'row-pro-historical',
          user_id: USER_ID,
          order_id: orderId,
          payment_id: null,
          plan: 'pro',
          amount: 79800,
          status: 'created',
        },
      ],
    });

    await activatePlanAfterPayment(supabase, {
      userId: USER_ID,
      plan: 'pro',
      orderId,
      paymentId,
      amountPaise: 79800,
      source: 'verify',
    });

    expect(state.user.plan_tier).toBe('pro');
    expect(state.user.credits_remaining).toBe(26);
    expect(state.user.last_payment_id).toBe(paymentId);
    expect(state.payments[0].amount).toBe(79800);
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

  it('discounted payment activation consumes campaign redemption (not left reserved)', async () => {
    const redemptionId = 'red-disc-001';
    const orderId = 'order_discounted_001';
    const paymentId = 'pay_discounted_001';

    const { supabase, state } = createPaymentStore({
      user: baseUser(),
      payments: [
        {
          id: 'row-disc',
          user_id: USER_ID,
          order_id: orderId,
          payment_id: null,
          plan: 'starter',
          amount: 20900,
          status: 'created',
          campaign_redemption_id: redemptionId,
        },
      ],
      redemptions: [
        {
          id: redemptionId,
          status: 'reserved',
          order_id: orderId,
          payment_id: null,
        },
      ],
    });

    const result = await activatePlanAfterPayment(supabase, {
      userId: USER_ID,
      plan: 'starter',
      orderId,
      paymentId,
      amountPaise: 20900,
      source: 'webhook',
    });

    expect(activationWasFresh(result)).toBe(true);
    expect(state.user.last_payment_id).toBe(paymentId);
    expect(state.consumeCalls).toBeGreaterThanOrEqual(1);
    expect(state.redemptions[0].status).toBe('consumed');
    expect(state.redemptions[0].payment_id).toBe(paymentId);
  });

  it('already_activated replay heals a stuck reserved redemption', async () => {
    const redemptionId = 'red-stuck-001';
    const startedAt = '2026-08-01T00:00:00.000Z';
    const expiresAt = '2026-08-31T00:00:00.000Z';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'starter',
        plan_status: 'active',
        credits_remaining: 11,
        plan_started_at: startedAt,
        plan_expires_at: expiresAt,
      }),
      payments: [
        {
          ...starterPayment(ORDER_STARTER, 'paid', PAY_STARTER),
          campaign_redemption_id: redemptionId,
          entitlement_credits: 8,
          entitlement_plan_started_at: startedAt,
          entitlement_plan_expires_at: expiresAt,
        },
      ],
      ledger: [
        {
          user_id: USER_ID,
          type: 'credit',
          amount: 8,
          reason: `Plan payment: starter (${PAY_STARTER})`,
          payment_id: PAY_STARTER,
        },
      ],
      redemptions: [
        {
          id: redemptionId,
          status: 'reserved',
          order_id: ORDER_STARTER,
          payment_id: null,
        },
      ],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect(result.alreadyActivated).toBe(true);
    expect(state.redemptions[0].status).toBe('consumed');
    expect(state.redemptions[0].payment_id).toBe(PAY_STARTER);
    expect(state.consumeCalls).toBeGreaterThanOrEqual(1);
  });

  it('complete replay performs no payment or ledger writes', async () => {
    const startedAt = '2026-08-01T00:00:00.000Z';
    const expiresAt = '2026-08-31T00:00:00.000Z';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'starter',
        plan_status: 'active',
        plan_started_at: startedAt,
        plan_expires_at: expiresAt,
        credits_remaining: 4,
      }),
      payments: [
        {
          ...starterPayment(ORDER_STARTER, 'paid', PAY_STARTER),
          entitlement_credits: 8,
          entitlement_plan_started_at: startedAt,
          entitlement_plan_expires_at: expiresAt,
        },
      ],
      ledger: [
        {
          user_id: USER_ID,
          type: 'credit',
          amount: 8,
          reason: `Plan payment: starter (${PAY_STARTER})`,
          payment_id: PAY_STARTER,
        },
      ],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect(result.alreadyActivated).toBe(true);
    expect(state.paymentUpdates).toBe(0);
    expect(state.ledger).toHaveLength(1);
    expect(state.user.credits_remaining).toBe(4);
  });

  it('ownership with incomplete payment binding heals only the payment artifact', async () => {
    const startedAt = '2026-08-01T00:00:00.000Z';
    const expiresAt = '2026-08-31T00:00:00.000Z';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'starter',
        plan_status: 'active',
        plan_started_at: startedAt,
        plan_expires_at: expiresAt,
      }),
      payments: [
        {
          ...starterPayment(),
          entitlement_credits: 8,
          entitlement_plan_started_at: startedAt,
          entitlement_plan_expires_at: expiresAt,
        },
      ],
      ledger: [
        {
          user_id: USER_ID,
          type: 'credit',
          amount: 8,
          reason: `Plan payment: starter (${PAY_STARTER})`,
          payment_id: PAY_STARTER,
        },
      ],
    });

    const first = await activatePlanAfterPayment(supabase, starterParams('webhook'));
    const second = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect(first.alreadyActivated).toBe(true);
    expect(second.alreadyActivated).toBe(true);
    expect(state.payments[0].payment_id).toBe(PAY_STARTER);
    expect(state.payments[0].status).toBe('paid');
    expect(state.paymentUpdates).toBe(1);
    expect(state.ledger).toHaveLength(1);
  });

  it('ownership with missing ledger heals exactly one ledger artifact', async () => {
    const startedAt = '2026-08-01T00:00:00.000Z';
    const expiresAt = '2026-08-31T00:00:00.000Z';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'starter',
        plan_status: 'active',
        plan_started_at: startedAt,
        plan_expires_at: expiresAt,
      }),
      payments: [
        {
          ...starterPayment(ORDER_STARTER, 'paid', PAY_STARTER),
          entitlement_credits: 8,
          entitlement_plan_started_at: startedAt,
          entitlement_plan_expires_at: expiresAt,
        },
      ],
    });

    await activatePlanAfterPayment(supabase, starterParams('webhook'));
    await activatePlanAfterPayment(supabase, starterParams('webhook'));

    expect(state.ledger).toEqual([
      expect.objectContaining({
        payment_id: PAY_STARTER,
        amount: 8,
        reason: `Plan payment: starter (${PAY_STARTER})`,
      }),
    ]);
    expect(state.user.credits_remaining).toBe(3);
  });

  it('ownership with payment binding and ledger missing heals both once under concurrent replay', async () => {
    const startedAt = '2026-08-01T00:00:00.000Z';
    const expiresAt = '2026-08-31T00:00:00.000Z';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'starter',
        plan_status: 'active',
        plan_started_at: startedAt,
        plan_expires_at: expiresAt,
      }),
      payments: [
        {
          ...starterPayment(),
          entitlement_credits: 8,
          entitlement_plan_started_at: startedAt,
          entitlement_plan_expires_at: expiresAt,
        },
      ],
    });

    const [a, b] = await Promise.all([
      activatePlanAfterPayment(supabase, starterParams('verify')),
      activatePlanAfterPayment(supabase, starterParams('webhook')),
    ]);

    expect(a.alreadyActivated).toBe(true);
    expect(b.alreadyActivated).toBe(true);
    expect(state.paymentUpdates).toBe(1);
    expect(state.ledger).toHaveLength(1);
    expect(state.user.credits_remaining).toBe(3);
  });

  it('ambiguous historical credit state fails closed without granting', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'starter',
        plan_status: 'active',
      }),
      payments: [starterPayment(ORDER_STARTER, 'paid', PAY_STARTER)],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect('activationFailed' in result && result.activationFailed).toBe(true);
    expect(state.ledger).toHaveLength(0);
    expect(state.user.credits_remaining).toBe(3);
  });

  it('wrong user or order identity fails closed', async () => {
    const startedAt = '2026-08-01T00:00:00.000Z';
    const expiresAt = '2026-08-31T00:00:00.000Z';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: 'different_order',
        plan_tier: 'starter',
        plan_status: 'active',
        plan_started_at: startedAt,
        plan_expires_at: expiresAt,
      }),
      payments: [
        {
          ...starterPayment(),
          entitlement_credits: 8,
          entitlement_plan_started_at: startedAt,
          entitlement_plan_expires_at: expiresAt,
        },
      ],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect('activationFailed' in result && result.activationFailed).toBe(true);
    expect(state.ledger).toHaveLength(0);
  });

  it('different payment identity on the owned order fails closed', async () => {
    const startedAt = '2026-08-01T00:00:00.000Z';
    const expiresAt = '2026-08-31T00:00:00.000Z';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'starter',
        plan_status: 'active',
        plan_started_at: startedAt,
        plan_expires_at: expiresAt,
      }),
      payments: [
        {
          ...starterPayment(ORDER_STARTER, 'paid', 'pay_different'),
          entitlement_credits: 8,
          entitlement_plan_started_at: startedAt,
          entitlement_plan_expires_at: expiresAt,
        },
      ],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect('activationFailed' in result && result.activationFailed).toBe(true);
    expect(state.ledger).toHaveLength(0);
  });

  it('rejects a conflicting local payment ID before changing ownership CAS', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser({ last_payment_id: 'pay-old' }),
      payments: [starterPayment(ORDER_STARTER, 'created', 'pay-other')],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('verify'));

    expect('activationFailed' in result && result.activationFailed).toBe(true);
    expect(state.user.last_payment_id).toBe('pay-old');
    expect(state.userUpdates).toBe(0);
    expect(state.ledger).toHaveLength(0);
  });

  it('physically missing base payment row fails closed because history is unrecoverable', async () => {
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'starter',
        plan_status: 'active',
      }),
      payments: [],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('webhook'));

    expect('activationFailed' in result && result.activationFailed).toBe(true);
    expect(state.ledger).toHaveLength(0);
    expect(state.user.credits_remaining).toBe(3);
  });

  it('expired entitlement recovery records artifacts without extending expiry', async () => {
    const startedAt = '2026-05-01T00:00:00.000Z';
    const expiresAt = '2026-05-31T00:00:00.000Z';
    const { supabase, state } = createPaymentStore({
      user: baseUser({
        last_payment_id: PAY_STARTER,
        last_order_id: ORDER_STARTER,
        plan_tier: 'free',
        plan_status: 'expired',
        plan_started_at: startedAt,
        plan_expires_at: expiresAt,
      }),
      payments: [
        {
          ...starterPayment(ORDER_STARTER, 'paid', PAY_STARTER),
          entitlement_credits: 8,
          entitlement_plan_started_at: startedAt,
          entitlement_plan_expires_at: expiresAt,
        },
      ],
    });

    const result = await activatePlanAfterPayment(supabase, starterParams('webhook'));

    expect(result.alreadyActivated).toBe(true);
    expect(state.user.plan_tier).toBe('free');
    expect(state.user.plan_status).toBe('expired');
    expect(state.user.plan_expires_at).toBe(expiresAt);
    expect(state.ledger).toHaveLength(1);
  });

  it('already consumed campaign remains consumed and no-campaign replay does not call consume', async () => {
    const startedAt = '2026-08-01T00:00:00.000Z';
    const expiresAt = '2026-08-31T00:00:00.000Z';
    const redemptionId = 'red-consumed-001';
    const completeLedger: CreditTx[] = [
      {
        user_id: USER_ID,
        type: 'credit',
        amount: 8,
        reason: `Plan payment: starter (${PAY_STARTER})`,
        payment_id: PAY_STARTER,
      },
    ];
    const ownedUser = baseUser({
      last_payment_id: PAY_STARTER,
      last_order_id: ORDER_STARTER,
      plan_tier: 'starter',
      plan_status: 'active',
      plan_started_at: startedAt,
      plan_expires_at: expiresAt,
    });
    const payment = {
      ...starterPayment(ORDER_STARTER, 'paid', PAY_STARTER),
      entitlement_credits: 8,
      entitlement_plan_started_at: startedAt,
      entitlement_plan_expires_at: expiresAt,
    };
    const consumed = createPaymentStore({
      user: ownedUser,
      payments: [{ ...payment, campaign_redemption_id: redemptionId }],
      ledger: completeLedger,
      redemptions: [
        {
          id: redemptionId,
          status: 'consumed',
          order_id: ORDER_STARTER,
          payment_id: PAY_STARTER,
        },
      ],
    });
    const noCampaign = createPaymentStore({
      user: ownedUser,
      payments: [payment],
      ledger: completeLedger,
    });

    await activatePlanAfterPayment(consumed.supabase, starterParams('verify'));
    await activatePlanAfterPayment(noCampaign.supabase, starterParams('verify'));

    expect(consumed.state.redemptions[0]).toEqual(
      expect.objectContaining({ status: 'consumed', payment_id: PAY_STARTER }),
    );
    expect(noCampaign.state.consumeCalls).toBe(0);
  });

  it('emits ALERT error when consume keeps failing after retries', async () => {
    const { activationError } = await import('@/lib/razorpay/payment-log');
    const redemptionId = 'red-fail-001';
    const { supabase, state } = createPaymentStore({
      user: baseUser(),
      payments: [
        {
          ...starterPayment(),
          amount: 20900,
          campaign_redemption_id: redemptionId,
        },
      ],
      // No matching redemption → consume RPC returns false every attempt
      redemptions: [],
    });

    await activatePlanAfterPayment(supabase, {
      ...starterParams('webhook'),
      amountPaise: 20900,
    });

    expect(state.user.last_payment_id).toBe(PAY_STARTER);
    expect(activationError).toHaveBeenCalledWith(
      'campaign_redemption_consume_failed_ALERT',
      expect.anything(),
      expect.objectContaining({ redemptionId }),
    );
  });
});
