import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computePlanExpiry,
  getPaidPlan,
  type PaidPlanId,
} from '@/lib/pricing/plans';
import { activationError, activationLog } from '@/lib/razorpay/payment-log';
import type { PlanTier } from '@/types/app.types';

export interface ActivatePlanParams {
  userId: string;
  plan: PaidPlanId;
  orderId: string;
  paymentId: string;
  amountPaise: number;
  source: string;
}

/** Fresh activation completed in this request. */
export type ActivatePlanFresh = {
  activated: true;
  alreadyActivated: false;
  planExpiresAt: string;
  plan: PaidPlanId;
};

/** Idempotent replay — this paymentId was already applied to the user. */
export type ActivatePlanReplay = {
  activated: false;
  alreadyActivated: true;
  planExpiresAt: string;
  plan: PaidPlanId;
};

/** Validation or persistence failure — safe to retry (webhook) or surface error (verify). */
export type ActivatePlanFailure = {
  activated: false;
  alreadyActivated: false;
  activationFailed: true;
  error: string;
};

export type ActivatePlanResult = ActivatePlanFresh | ActivatePlanReplay | ActivatePlanFailure;

export function activationSucceeded(
  result: ActivatePlanResult,
): result is ActivatePlanFresh | ActivatePlanReplay {
  return !('activationFailed' in result && result.activationFailed);
}

export function activationWasFresh(result: ActivatePlanResult): result is ActivatePlanFresh {
  return 'activated' in result && result.activated === true && result.alreadyActivated === false;
}

function traceIds(params: ActivatePlanParams): {
  order_id: string;
  payment_id: string;
  user_id: string;
} {
  return {
    order_id: params.orderId,
    payment_id: params.paymentId,
    user_id: params.userId,
  };
}

function replayResult(plan: PaidPlanId, planExpiresAt: string): ActivatePlanReplay {
  return {
    activated: false,
    alreadyActivated: true,
    planExpiresAt,
    plan,
  };
}

function freshResult(plan: PaidPlanId, planExpiresAt: string): ActivatePlanFresh {
  return {
    activated: true,
    alreadyActivated: false,
    planExpiresAt,
    plan,
  };
}

function failedResult(error: string): ActivatePlanFailure {
  return {
    activated: false,
    alreadyActivated: false,
    activationFailed: true,
    error,
  };
}

/** Brief backoff so a concurrent winner's commit is visible before we declare conflict. */
const CAS_MISS_RETRY_DELAYS_MS = [0, 25, 50, 100, 200] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * After a CAS miss, another caller may have activated this exact paymentId
 * (e.g. verify read pay_old while webhook set pay_new). Re-read until settled.
 */
async function resolveAfterCasMiss(
  supabase: SupabaseClient,
  userId: string,
  paymentId: string,
  plan: PaidPlanId,
  nowIso: string,
  ids: ReturnType<typeof traceIds>,
  source: string,
): Promise<ActivatePlanReplay | null> {
  for (let attempt = 0; attempt < CAS_MISS_RETRY_DELAYS_MS.length; attempt++) {
    const delay = CAS_MISS_RETRY_DELAYS_MS[attempt];
    if (delay > 0) {
      await sleep(delay);
    }

    const { data: retryUser, error: retryErr } = await supabase
      .from('users')
      .select('last_payment_id, plan_expires_at')
      .eq('id', userId)
      .maybeSingle();

    if (retryErr || !retryUser) {
      continue;
    }

    if (retryUser.last_payment_id === paymentId) {
      activationLog('already_activated', ids, {
        source,
        plan,
        concurrent: true,
        cas_attempt: attempt + 1,
      });
      return replayResult(plan, (retryUser.plan_expires_at as string | null) ?? nowIso);
    }
  }

  return null;
}

/**
 * Single source of truth for granting plan access after a successful Razorpay payment.
 *
 * Safe to call from **both** POST /verify and POST /webhook — order of arrival does not matter.
 *
 * Idempotency marker: `users.last_payment_id === paymentId` (never `payments.status`).
 * Concurrency: compare-and-swap on the observed `last_payment_id` (`.is(null)` or `.eq(observed)`).
 * Do NOT use `.neq('last_payment_id', paymentId)` — SQL NULL != value is unknown, so first purchases never match.
 */
export async function activatePlanAfterPayment(
  supabase: SupabaseClient,
  params: ActivatePlanParams,
): Promise<ActivatePlanResult> {
  const { userId, plan, orderId, paymentId, amountPaise, source } = params;
  const ids = traceIds(params);
  const planConfig = getPaidPlan(plan);
  const now = new Date();
  const nowIso = now.toISOString();

  activationLog('activate_start', ids, { plan, source });

  const { data: orderRow, error: orderErr } = await supabase
    .from('payments')
    .select('id, user_id, plan, amount, status')
    .eq('order_id', orderId)
    .maybeSingle();

  if (orderErr || !orderRow) {
    activationError('order_not_found', ids, { source, code: orderErr?.code });
    return failedResult('Order not found for this user.');
  }

  if (orderRow.user_id !== userId) {
    activationError('order_user_mismatch', ids, { source });
    return failedResult('Order does not belong to this user.');
  }

  if (orderRow.plan !== plan) {
    activationError('plan_mismatch', ids, { source, orderPlan: orderRow.plan });
    return failedResult('Plan mismatch for this order.');
  }

  if (Number(orderRow.amount) !== amountPaise) {
    activationError('amount_mismatch', ids, {
      source,
      expected: amountPaise,
      actual: orderRow.amount,
    });
    return failedResult('Amount mismatch for this order.');
  }

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('plan_tier, plan_started_at, plan_expires_at, credits_remaining, last_payment_id')
    .eq('id', userId)
    .maybeSingle();

  if (userErr || !user) {
    activationError('user_not_found', ids, { source, code: userErr?.code });
    return failedResult('User not found.');
  }

  const creditsBefore = (user.credits_remaining as number | null) ?? 0;
  const expiryBefore = (user.plan_expires_at as string | null) ?? null;

  // ── Idempotent lock: already activated for this payment? ──────────────────
  if (user.last_payment_id === paymentId) {
    activationLog('already_activated', ids, { source, plan });
    return replayResult(plan, expiryBefore ?? nowIso);
  }

  const currentTier = user.plan_tier as PlanTier;
  if (currentTier === 'campus' || currentTier === 'campus_admin') {
    activationError('campus_plan_blocked', ids, { source });
    return failedResult('Campus plans cannot be purchased via self-serve checkout.');
  }

  const currentExpires = expiryBefore ? new Date(expiryBefore) : null;
  const newExpiresAt = computePlanExpiry(currentExpires, planConfig.durationDays, now);
  const planStartedAt =
    user.plan_started_at && currentExpires && currentExpires > now
      ? (user.plan_started_at as string)
      : nowIso;

  const newCreditsRemaining = creditsBefore + planConfig.credits;
  const observedLastPaymentId = (user.last_payment_id as string | null) ?? null;

  // ── Compare-and-swap lock — only one concurrent caller wins ─────────────
  // Match the exact value we read so NULL first purchases work (.is null, not .neq).
  const userUpdatePayload = {
    plan_tier: plan,
    credits_remaining: newCreditsRemaining,
    plan_started_at: planStartedAt,
    plan_expires_at: newExpiresAt.toISOString(),
    plan_status: 'active',
    last_payment_id: paymentId,
    last_order_id: orderId,
  };

  const userUpdateBase = supabase.from('users').update(userUpdatePayload).eq('id', userId);

  const { data: updatedUsers, error: userUpdateErr } = await (
    observedLastPaymentId === null
      ? userUpdateBase.is('last_payment_id', null)
      : userUpdateBase.eq('last_payment_id', observedLastPaymentId)
  ).select('id');

  if (userUpdateErr) {
    activationError('user_update_failed', ids, { source, code: userUpdateErr.code });
    return failedResult(userUpdateErr.message);
  }

  if (!updatedUsers?.length) {
    const replay = await resolveAfterCasMiss(
      supabase,
      userId,
      paymentId,
      plan,
      nowIso,
      ids,
      source,
    );
    if (replay) {
      return replay;
    }

    activationError('user_update_conflict', ids, {
      source,
      observed_last_payment_id: observedLastPaymentId,
    });
    return failedResult('Activation conflict — please retry.');
  }

  activationLog('user_updated', ids, {
    source,
    plan,
    credits_before: creditsBefore,
    credits_after: newCreditsRemaining,
    expiry_before: expiryBefore,
    expiry_after: newExpiresAt.toISOString(),
  });

  activationLog('credits_granted', ids, {
    source,
    creditsAdded: planConfig.credits,
    credits_after: newCreditsRemaining,
  });

  const { error: payUpdateErr } = await supabase
    .from('payments')
    .update({
      payment_id: paymentId,
      status: 'paid',
      updated_at: nowIso,
    })
    .eq('order_id', orderId);

  if (payUpdateErr) {
    activationError('payment_row_update_failed', ids, { source, code: payUpdateErr.code });
    return failedResult(payUpdateErr.message);
  }

  activationLog('payment_updated', ids, { source, paymentStatus: 'paid' });

  const { error: txErr } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'credit',
    amount: planConfig.credits,
    reason: `Plan payment: ${plan} (${paymentId})`,
    created_at: nowIso,
  });

  if (txErr) {
    activationError('ledger_insert_failed', ids, { source, code: txErr.code });
    return failedResult(txErr.message);
  }

  activationLog('ledger_written', ids, { source, creditsAdded: planConfig.credits });

  activationLog('activate_success', ids, {
    source,
    plan,
    planExpiresAt: newExpiresAt.toISOString(),
  });

  return freshResult(plan, newExpiresAt.toISOString());
}
