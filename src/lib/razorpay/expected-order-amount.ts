/**
 * Resolve the authoritative expected checkout amount for an order.
 *
 * Source of truth: `payments.amount` (written at create-order — list or discounted).
 * Optional cross-check: campaign_code_redemptions.final_amount_paise when linked.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaidPlanId } from '@/lib/pricing/plans';

export type ExpectedOrderAmount =
  | {
      ok: true;
      amountPaise: number;
      plan: PaidPlanId;
      userId: string;
      campaignRedemptionId: string | null;
    }
  | { ok: false; error: string; code: 'not_found' | 'plan_invalid' | 'redemption_mismatch' };

export async function resolveExpectedOrderAmount(
  svc: SupabaseClient,
  orderId: string,
  allowedPlans: (plan: string) => plan is PaidPlanId,
): Promise<ExpectedOrderAmount> {
  const { data: payment, error } = await svc
    .from('payments')
    .select('user_id, plan, amount, campaign_redemption_id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error || !payment) {
    return { ok: false, error: 'Order not found.', code: 'not_found' };
  }

  if (!allowedPlans(payment.plan as string)) {
    return { ok: false, error: 'Invalid plan on order.', code: 'plan_invalid' };
  }

  const amountPaise = Number(payment.amount);
  const redemptionId = (payment.campaign_redemption_id as string | null) ?? null;

  if (redemptionId) {
    const { data: redemption, error: redErr } = await svc
      .from('campaign_code_redemptions')
      .select('final_amount_paise, status')
      .eq('id', redemptionId)
      .maybeSingle();

    if (!redErr && redemption && Number(redemption.final_amount_paise) !== amountPaise) {
      return {
        ok: false,
        error: 'Discounted amount does not match reservation.',
        code: 'redemption_mismatch',
      };
    }
  }

  return {
    ok: true,
    amountPaise,
    plan: payment.plan as PaidPlanId,
    userId: payment.user_id as string,
    campaignRedemptionId: redemptionId,
  };
}
