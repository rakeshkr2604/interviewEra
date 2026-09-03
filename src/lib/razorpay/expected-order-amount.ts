/**
 * Resolve the authoritative expected checkout amount for an order.
 *
 * Source of truth: `payments.amount` (written at create-order — list or discounted).
 * Required cross-check: a linked campaign redemption must match the exact
 * payment owner, order, plan and amount.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaidPlanId } from '@/lib/pricing/plans';
import { type Attribution, normalizeAttribution, hasAttribution } from '@/lib/analytics/attribution';

export type ExpectedOrderAmount =
  | {
      ok: true;
      amountPaise: number;
      currency: string;
      plan: PaidPlanId;
      userId: string;
      campaignRedemptionId: string | null;
      /** Immutable attribution snapshot from the payment row; NULL when not captured. */
      attributionSnapshot: Attribution | null;
    }
  | { ok: false; error: string; code: 'not_found' | 'plan_invalid' | 'redemption_mismatch' };

export async function resolveExpectedOrderAmount(
  svc: SupabaseClient,
  orderId: string,
  allowedPlans: (plan: string) => plan is PaidPlanId,
): Promise<ExpectedOrderAmount> {
  const { data: payment, error } = await svc
    .from('payments')
    .select('user_id, plan, amount, currency, campaign_redemption_id, attribution_snapshot')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error || !payment) {
    return { ok: false, error: 'Order not found.', code: 'not_found' };
  }

  if (!allowedPlans(payment.plan as string)) {
    return { ok: false, error: 'Invalid plan on order.', code: 'plan_invalid' };
  }

  const amountPaise = Number(payment.amount);
  const currency = String(payment.currency ?? '');
  const redemptionId = (payment.campaign_redemption_id as string | null) ?? null;

  if (redemptionId) {
    const { data: redemption, error: redErr } = await svc
      .from('campaign_code_redemptions')
      .select('user_id, order_id, plan, final_amount_paise, status')
      .eq('id', redemptionId)
      .maybeSingle();

    if (
      redErr ||
      !redemption ||
      redemption.user_id !== payment.user_id ||
      redemption.order_id !== orderId ||
      redemption.plan !== payment.plan ||
      Number(redemption.final_amount_paise) !== amountPaise ||
      !['reserved', 'consumed'].includes(redemption.status as string)
    ) {
      return {
        ok: false,
        error: 'Discounted order does not match its reservation.',
        code: 'redemption_mismatch',
      };
    }
  }

  const normalized = normalizeAttribution(
    (payment as Record<string, unknown>).attribution_snapshot,
  );
  const attributionSnapshot: Attribution | null = hasAttribution(normalized) ? normalized : null;

  return {
    ok: true,
    amountPaise,
    currency,
    plan: payment.plan as PaidPlanId,
    userId: payment.user_id as string,
    campaignRedemptionId: redemptionId,
    attributionSnapshot,
  };
}
