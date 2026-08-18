import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computePlanExpiry,
  getPaidPlan,
  type PaidPlanId,
} from '@/lib/pricing/plans';
import { activationError, activationLog } from '@/lib/razorpay/payment-log';
import type { PlanTier } from '@/types/app.types';
import { consumeCampaignRedemption } from '@/lib/campaign-codes';

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
const CONSUME_RETRY_DELAYS_MS = [0, 50, 150] as const;

type PaymentOrderRow = {
  id: string;
  user_id: string;
  plan: PaidPlanId;
  amount: number;
  status: string;
  payment_id: string | null;
  campaign_redemption_id: string | null;
  entitlement_credits: number | null;
  entitlement_plan_started_at: string | null;
  entitlement_plan_expires_at: string | null;
};

type ActivationSnapshot = {
  credits: number;
  planStartedAt: string;
  planExpiresAt: string;
};

type LocalCompletionRow = {
  activation_complete: boolean;
  payment_healed: boolean;
  ledger_healed: boolean;
  entitlement_credits: number;
  plan_started_at: string;
  plan_expires_at: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mark campaign redemption consumed. Retries briefly — a stuck `reserved` row after
 * paid activation is an abuse vector (stale cron can release and allow re-use).
 * Failures are error-level / alert-worthy; plan grant is not rolled back.
 */
async function ensureCampaignRedemptionConsumed(
  supabase: SupabaseClient,
  redemptionId: string | null | undefined,
  orderId: string,
  paymentId: string,
  ids: ReturnType<typeof traceIds>,
  source: string,
): Promise<boolean> {
  if (!redemptionId) return true;

  let lastError: string | undefined;
  for (let attempt = 0; attempt < CONSUME_RETRY_DELAYS_MS.length; attempt++) {
    const delay = CONSUME_RETRY_DELAYS_MS[attempt];
    if (delay > 0) await sleep(delay);

    const result = await consumeCampaignRedemption(supabase, {
      redemptionId,
      orderId,
      paymentId,
    });
    if (result.ok) {
      activationLog('campaign_redemption_consumed', ids, {
        source,
        redemptionId,
        attempt: attempt + 1,
      });
      return true;
    }
    lastError = result.error;
  }

  // ALERT: paid activation with unconsumed reservation — ops must investigate.
  activationError('campaign_redemption_consume_failed_ALERT', ids, {
    source,
    redemptionId,
    order_id: orderId,
    payment_id: paymentId,
    error: lastError ?? 'unknown',
    attempts: CONSUME_RETRY_DELAYS_MS.length,
  });
  return false;
}

function readActivationSnapshot(orderRow: PaymentOrderRow): ActivationSnapshot | null {
  const hasAny =
    orderRow.entitlement_credits != null ||
    orderRow.entitlement_plan_started_at != null ||
    orderRow.entitlement_plan_expires_at != null;
  const hasAll =
    orderRow.entitlement_credits != null &&
    orderRow.entitlement_plan_started_at != null &&
    orderRow.entitlement_plan_expires_at != null;

  if (hasAny && !hasAll) {
    return null;
  }
  if (!hasAll) {
    return null;
  }
  return {
    credits: Number(orderRow.entitlement_credits),
    planStartedAt: orderRow.entitlement_plan_started_at as string,
    planExpiresAt: orderRow.entitlement_plan_expires_at as string,
  };
}

/**
 * Persist the exact entitlement before ownership CAS. A replay never derives a
 * historical credit amount or expiry from current pricing/config.
 */
async function ensureActivationSnapshot(
  supabase: SupabaseClient,
  orderRow: PaymentOrderRow,
  proposed: ActivationSnapshot,
  ids: ReturnType<typeof traceIds>,
  source: string,
): Promise<ActivationSnapshot | null> {
  const existing = readActivationSnapshot(orderRow);
  if (existing) return existing;

  const hasPartialSnapshot =
    orderRow.entitlement_credits != null ||
    orderRow.entitlement_plan_started_at != null ||
    orderRow.entitlement_plan_expires_at != null;
  if (hasPartialSnapshot) {
    activationError('entitlement_snapshot_partial', ids, { source });
    return null;
  }

  const { data: written, error: writeError } = await supabase
    .from('payments')
    .update({
      entitlement_credits: proposed.credits,
      entitlement_plan_started_at: proposed.planStartedAt,
      entitlement_plan_expires_at: proposed.planExpiresAt,
    })
    .eq('id', orderRow.id)
    .is('entitlement_credits', null)
    .select(
      'entitlement_credits, entitlement_plan_started_at, entitlement_plan_expires_at',
    )
    .maybeSingle();

  if (writeError) {
    activationError('entitlement_snapshot_write_failed', ids, {
      source,
      code: writeError.code,
    });
    return null;
  }

  if (written) {
    return {
      credits: Number(written.entitlement_credits),
      planStartedAt: written.entitlement_plan_started_at as string,
      planExpiresAt: written.entitlement_plan_expires_at as string,
    };
  }

  // A concurrent request may have snapshotted first. Re-read and use only the
  // winner's durable values.
  const { data: concurrent, error: readError } = await supabase
    .from('payments')
    .select('entitlement_credits, entitlement_plan_started_at, entitlement_plan_expires_at')
    .eq('id', orderRow.id)
    .maybeSingle();

  if (readError || !concurrent) {
    activationError('entitlement_snapshot_reread_failed', ids, {
      source,
      code: readError?.code,
    });
    return null;
  }

  return readActivationSnapshot({
    ...orderRow,
    ...concurrent,
  } as PaymentOrderRow);
}

async function completeOwnedActivation(
  supabase: SupabaseClient,
  params: ActivatePlanParams,
  redemptionId: string | null,
): Promise<ActivatePlanReplay | ActivatePlanFailure> {
  const ids = traceIds(params);
  const { data, error } = await supabase.rpc('complete_payment_activation_local', {
    p_user_id: params.userId,
    p_order_id: params.orderId,
    p_payment_id: params.paymentId,
  });

  const row = (Array.isArray(data) ? data[0] : data) as LocalCompletionRow | null;
  if (error || !row?.activation_complete) {
    activationError('local_completion_failed', ids, {
      source: params.source,
      code: error?.code,
    });
    return failedResult('Payment activation recovery failed. Please retry.');
  }

  activationLog('local_completion_verified', ids, {
    source: params.source,
    payment_healed: row.payment_healed,
    ledger_healed: row.ledger_healed,
  });

  const campaignComplete = await ensureCampaignRedemptionConsumed(
    supabase,
    redemptionId,
    params.orderId,
    params.paymentId,
    ids,
    params.source,
  );
  if (!campaignComplete) {
    return failedResult('Payment activation recovery failed. Please retry.');
  }

  return replayResult(params.plan, row.plan_expires_at);
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
  ids: ReturnType<typeof traceIds>,
  source: string,
  redemptionId: string | null,
  orderId: string,
  amountPaise: number,
): Promise<ActivatePlanReplay | ActivatePlanFailure | null> {
  for (let attempt = 0; attempt < CAS_MISS_RETRY_DELAYS_MS.length; attempt++) {
    const delay = CAS_MISS_RETRY_DELAYS_MS[attempt];
    if (delay > 0) {
      await sleep(delay);
    }

    const { data: retryUser, error: retryErr } = await supabase
      .from('users')
      .select('last_payment_id')
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
      return completeOwnedActivation(
        supabase,
        { userId, plan, orderId, paymentId, amountPaise, source },
        redemptionId,
      );
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
    .select(
      'id, user_id, plan, amount, status, payment_id, campaign_redemption_id, entitlement_credits, entitlement_plan_started_at, entitlement_plan_expires_at',
    )
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

  if (orderRow.payment_id != null && orderRow.payment_id !== paymentId) {
    activationError('local_payment_binding_mismatch', ids, {
      source,
      existing_payment_id: orderRow.payment_id,
    });
    return failedResult('Payment identity does not match this order.');
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

  const typedOrderRow = orderRow as PaymentOrderRow;
  const creditsBefore = (user.credits_remaining as number | null) ?? 0;
  const expiryBefore = (user.plan_expires_at as string | null) ?? null;

  // ── Idempotent lock: already activated for this payment? ──────────────────
  if (user.last_payment_id === paymentId) {
    activationLog('already_activated', ids, { source, plan });
    return completeOwnedActivation(
      supabase,
      params,
      typedOrderRow.campaign_redemption_id,
    );
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

  const proposedSnapshot: ActivationSnapshot = {
    credits: planConfig.credits,
    planStartedAt,
    planExpiresAt: newExpiresAt.toISOString(),
  };
  const snapshot = await ensureActivationSnapshot(
    supabase,
    typedOrderRow,
    proposedSnapshot,
    ids,
    source,
  );
  if (!snapshot) {
    return failedResult('Payment activation could not be prepared safely. Please retry.');
  }

  const newCreditsRemaining = creditsBefore + snapshot.credits;
  const observedLastPaymentId = (user.last_payment_id as string | null) ?? null;

  // ── Compare-and-swap lock — only one concurrent caller wins ─────────────
  // Match the exact value we read so NULL first purchases work (.is null, not .neq).
  const userUpdatePayload = {
    plan_tier: plan,
    credits_remaining: newCreditsRemaining,
    plan_started_at: snapshot.planStartedAt,
    plan_expires_at: snapshot.planExpiresAt,
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
      ids,
      source,
      (orderRow.campaign_redemption_id as string | null) ?? null,
      orderId,
      amountPaise,
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
    expiry_after: snapshot.planExpiresAt,
  });

  activationLog('credits_granted', ids, {
    source,
    creditsAdded: snapshot.credits,
    credits_after: newCreditsRemaining,
  });

  const completed = await completeOwnedActivation(
    supabase,
    params,
    typedOrderRow.campaign_redemption_id,
  );
  if ('activationFailed' in completed && completed.activationFailed) {
    return completed;
  }

  activationLog('activate_success', ids, {
    source,
    plan,
    planExpiresAt: snapshot.planExpiresAt,
  });

  return freshResult(plan, snapshot.planExpiresAt);
}
