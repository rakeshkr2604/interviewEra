import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computePlanExpiry,
  getPaidPlan,
  type PaidPlanId,
} from '@/lib/pricing/plans';
import { paymentError, paymentLog } from '@/lib/razorpay/payment-log';
import type { PlanTier } from '@/types/app.types';

export interface ActivatePlanParams {
  userId: string;
  plan: PaidPlanId;
  orderId: string;
  paymentId: string;
  amountPaise: number;
  source: string;
}

export type ActivatePlanResult =
  | {
      ok: true;
      skipped: boolean;
      planExpiresAt: string;
    }
  | {
      ok: false;
      error: string;
    };

export async function activatePlanAfterPayment(
  supabase: SupabaseClient,
  params: ActivatePlanParams,
): Promise<ActivatePlanResult> {
  const { userId, plan, orderId, paymentId, amountPaise, source } = params;
  const planConfig = getPaidPlan(plan);
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: existingPayment, error: existingPayErr } = await supabase
    .from('payments')
    .select('id, status, user_id, plan, amount')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (existingPayErr) {
    paymentError('verify', 'payment_lookup_failed', { code: existingPayErr.code, source });
    return { ok: false, error: existingPayErr.message };
  }

  if (existingPayment?.status === 'paid') {
    paymentLog('verify', 'already_paid_idempotent', { paymentIdPrefix: paymentId.slice(0, 8), source });
    const { data: userRow } = await supabase
      .from('users')
      .select('plan_expires_at')
      .eq('id', userId)
      .maybeSingle();
    return {
      ok: true,
      skipped: true,
      planExpiresAt: (userRow?.plan_expires_at as string | null) ?? nowIso,
    };
  }

  const { data: orderRow, error: orderErr } = await supabase
    .from('payments')
    .select('id, user_id, plan, amount, status')
    .eq('order_id', orderId)
    .maybeSingle();

  if (orderErr || !orderRow) {
    paymentError('verify', 'order_not_found', { orderIdPrefix: orderId.slice(0, 8), source });
    return { ok: false, error: 'Order not found for this user.' };
  }

  if (orderRow.user_id !== userId) {
    paymentError('verify', 'order_user_mismatch', { orderIdPrefix: orderId.slice(0, 8), source });
    return { ok: false, error: 'Order does not belong to this user.' };
  }

  if (orderRow.plan !== plan) {
    return { ok: false, error: 'Plan mismatch for this order.' };
  }

  if (Number(orderRow.amount) !== amountPaise) {
    return { ok: false, error: 'Amount mismatch for this order.' };
  }

  if (orderRow.status === 'paid') {
    const { data: userRow } = await supabase
      .from('users')
      .select('plan_expires_at')
      .eq('id', userId)
      .maybeSingle();
    return {
      ok: true,
      skipped: true,
      planExpiresAt: (userRow?.plan_expires_at as string | null) ?? nowIso,
    };
  }

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('plan_tier, plan_started_at, plan_expires_at, credits_remaining')
    .eq('id', userId)
    .maybeSingle();

  if (userErr || !user) {
    return { ok: false, error: 'User not found.' };
  }

  const currentTier = user.plan_tier as PlanTier;
  if (currentTier === 'campus' || currentTier === 'campus_admin') {
    return { ok: false, error: 'Campus plans cannot be purchased via self-serve checkout.' };
  }

  const currentExpires = user.plan_expires_at
    ? new Date(user.plan_expires_at as string)
    : null;
  const newExpiresAt = computePlanExpiry(currentExpires, planConfig.durationDays, now);
  const planStartedAt =
    user.plan_started_at && currentExpires && currentExpires > now
      ? (user.plan_started_at as string)
      : nowIso;

  const { error: payUpdateErr } = await supabase
    .from('payments')
    .update({
      payment_id: paymentId,
      status: 'paid',
      updated_at: nowIso,
    })
    .eq('order_id', orderId)
    .eq('status', 'created');

  if (payUpdateErr) {
    paymentError('verify', 'payment_row_update_failed', { code: payUpdateErr.code, source });
    return { ok: false, error: payUpdateErr.message };
  }

  const existingCredits = (user.credits_remaining as number | null) ?? 0;
  const newCreditsRemaining = existingCredits + planConfig.credits;

  const { error: userUpdateErr } = await supabase
    .from('users')
    .update({
      plan_tier: plan,
      credits_remaining: newCreditsRemaining,
      plan_started_at: planStartedAt,
      plan_expires_at: newExpiresAt.toISOString(),
      plan_status: 'active',
      last_payment_id: paymentId,
      last_order_id: orderId,
    })
    .eq('id', userId);

  if (userUpdateErr) {
    paymentError('verify', 'user_update_failed', { code: userUpdateErr.code, source });
    return { ok: false, error: userUpdateErr.message };
  }

  const { error: txErr } = await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'credit',
    amount: planConfig.credits,
    reason: `Plan payment: ${plan} (${paymentId})`,
    created_at: nowIso,
  });

  if (txErr) {
    paymentError('verify', 'credit_tx_failed', { code: txErr.code, source });
    return { ok: false, error: txErr.message };
  }

  paymentLog('verify', 'plan_activated', {
    userId,
    plan,
    orderIdPrefix: orderId.slice(0, 8),
    paymentIdPrefix: paymentId.slice(0, 8),
    planExpiresAt: newExpiresAt.toISOString(),
    source,
  });

  return { ok: true, skipped: false, planExpiresAt: newExpiresAt.toISOString() };
}
