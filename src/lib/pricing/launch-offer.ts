/**
 * Limited launch offer (EARLY100) — public display only.
 *
 * The campaign is an ordinary `campaign_codes` row created by an admin via
 * /platform/rewards. Checkout reuses the existing reserve → attach → verify →
 * consume lifecycle; this module never reserves or consumes anything.
 *
 * Display rules (all must hold, otherwise nothing is shown):
 *   • row is_active, starts_at explicitly set and reached, not expired
 *   • max_redemptions set and verified CONSUMED redemptions < max
 *   • the discount clears every plan's promotional floor
 * Remaining count = max_redemptions − consumed (reservations are not purchases).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  campaignAppliesToPlan,
  campaignWindowStatus,
  computeCampaignDiscountQuote,
  type CampaignDiscountType,
} from '@/lib/campaign-codes';
import { PAID_PLANS, type PaidPlanId } from '@/lib/pricing/plans';
import { parseAppliesToPlans } from '@/lib/pricing/effective-price';

/** Approved configuration — the admin creates the DB row with exactly these values. */
export const LAUNCH_CAMPAIGN_CONFIG = {
  code: 'EARLY100',
  kind: 'promo',
  label: 'Early access launch offer',
  discountType: 'percent' as CampaignDiscountType,
  discountValue: 10,
  appliesToPlans: ['starter', 'pro'] as PaidPlanId[],
  maxRedemptions: 100,
} as const;

export function isLaunchCampaignCode(code: string | null | undefined): boolean {
  return (code ?? '').trim().toUpperCase() === LAUNCH_CAMPAIGN_CONFIG.code;
}

/**
 * Admin guard: the launch code may only be live with an explicit launch date and the
 * approved cap. Returns an error message, or null when the candidate row is acceptable.
 */
export function launchActivationError(candidate: {
  code?: string | null;
  is_active?: boolean | null;
  starts_at?: string | null;
  max_redemptions?: number | null;
}): string | null {
  if (!isLaunchCampaignCode(candidate.code) || !candidate.is_active) return null;
  if (!candidate.starts_at) {
    return `${LAUNCH_CAMPAIGN_CONFIG.code} needs an explicit launch date (starts_at) before it can be activated.`;
  }
  if (candidate.max_redemptions !== LAUNCH_CAMPAIGN_CONFIG.maxRedemptions) {
    return `${LAUNCH_CAMPAIGN_CONFIG.code} must be capped at ${LAUNCH_CAMPAIGN_CONFIG.maxRedemptions} redemptions.`;
  }
  return null;
}

export type LaunchOfferPlanPrice = { listPaise: number; finalPaise: number };

export type LaunchOffer = {
  code: string;
  label: string;
  discountPercent: number | null;
  plans: Partial<Record<PaidPlanId, LaunchOfferPlanPrice>>;
  maxRedemptions: number;
  consumedRedemptions: number;
  remainingRedemptions: number;
  expiresAt: string | null;
};

export type LaunchCampaignRow = {
  id: string;
  code: string;
  label: string | null;
  discount_type: string;
  discount_value: number;
  applies_to_plans: unknown;
  max_redemptions: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

export function buildLaunchOffer(
  row: LaunchCampaignRow | null,
  consumedRedemptions: number,
  now: Date,
): LaunchOffer | null {
  if (!row || !row.is_active) return null;
  // An explicit launch date is mandatory — a dateless active row is never advertised.
  if (!row.starts_at) return null;
  const window = campaignWindowStatus(
    new Date(row.starts_at),
    row.expires_at ? new Date(row.expires_at) : null,
    now,
  );
  if (window !== 'active') return null;
  if (!row.max_redemptions || row.max_redemptions <= 0) return null;

  const consumed = Math.max(0, Math.floor(consumedRedemptions));
  const remaining = row.max_redemptions - consumed;
  if (remaining <= 0) return null;

  const discountType: CampaignDiscountType = row.discount_type === 'flat_paise' ? 'flat_paise' : 'percent';
  const discountValue = Number(row.discount_value);
  const appliesTo = parseAppliesToPlans(row.applies_to_plans);

  const plans: Partial<Record<PaidPlanId, LaunchOfferPlanPrice>> = {};
  for (const plan of Object.keys(PAID_PLANS) as PaidPlanId[]) {
    if (!campaignAppliesToPlan(appliesTo, plan)) continue;
    const config = PAID_PLANS[plan];
    const quote = computeCampaignDiscountQuote({
      listAmountPaise: config.amountPaise,
      promoFloorPaise: config.promoFloorPaise,
      discountType,
      discountValue,
    });
    if (!quote.ok) continue;
    plans[plan] = { listPaise: config.amountPaise, finalPaise: quote.final_amount_paise };
  }
  if (Object.keys(plans).length === 0) return null;

  return {
    code: row.code,
    label: row.label ?? LAUNCH_CAMPAIGN_CONFIG.label,
    discountPercent: discountType === 'percent' ? discountValue : null,
    plans,
    maxRedemptions: row.max_redemptions,
    consumedRedemptions: consumed,
    remainingRedemptions: remaining,
    expiresAt: row.expires_at,
  };
}

/** Never throws — pricing must render list prices when the offer cannot be loaded. */
export async function loadLaunchOffer(
  svc: SupabaseClient,
  now: Date = new Date(),
): Promise<LaunchOffer | null> {
  try {
    const { data: row, error } = await svc
      .from('campaign_codes')
      .select(
        'id, code, label, discount_type, discount_value, applies_to_plans, max_redemptions, starts_at, expires_at, is_active',
      )
      .eq('code', LAUNCH_CAMPAIGN_CONFIG.code)
      .maybeSingle();
    if (error || !row) return null;

    const typed = row as LaunchCampaignRow;
    if (!typed.is_active || !typed.starts_at) return null;

    const { count, error: countErr } = await svc
      .from('campaign_code_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_code_id', typed.id)
      .eq('status', 'consumed');
    if (countErr || count == null) return null;

    return buildLaunchOffer(typed, count, now);
  } catch (error) {
    console.warn('[launch-offer] unavailable; showing list prices', error);
    return null;
  }
}
