import { computeCampaignDiscountQuote } from '@/lib/campaign-codes';
import { getPaidPlan, type PaidPlanId } from '@/lib/pricing/plans';
import {
  parseAppliesToPlans,
  windowsOverlap,
  type PricingCampaignRecord,
} from '@/lib/pricing/effective-price';
import type { createServiceClient } from '@/lib/supabase/server';

export function slugifyCampaignName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'offer';
}

export function validatePricingCampaignInput(input: {
  discount_type: 'percent' | 'flat_paise';
  discount_value: number;
  applies_to_plans: PaidPlanId[];
  starts_at: string;
  ends_at: string;
}): string | null {
  if (input.starts_at >= input.ends_at) {
    return 'Campaign end must be after its start.';
  }
  const plans: PaidPlanId[] =
    input.applies_to_plans.length > 0 ? input.applies_to_plans : ['starter', 'pro'];
  for (const plan of plans) {
    const config = getPaidPlan(plan);
    const quote = computeCampaignDiscountQuote({
      listAmountPaise: config.amountPaise,
      promoFloorPaise: config.promoFloorPaise,
      discountType: input.discount_type,
      discountValue: input.discount_value,
    });
    if (!quote.ok) {
      return quote.error_code === 'CODE_DISCOUNT_INVALID'
        ? 'Discount must be between 0% and 50% and use integer-safe values.'
        : `${config.label} final price cannot be below ₹${config.promoFloorPaise / 100}.`;
    }
  }
  return null;
}

export async function findOverlappingActiveCampaign(
  svc: ReturnType<typeof createServiceClient>,
  candidate: { starts_at: string; ends_at: string },
  excludeId?: string,
): Promise<PricingCampaignRecord | null> {
  const query = svc
    .from('pricing_campaigns')
    .select(
      'id, name, slug, is_active, discount_type, discount_value, applies_to_plans, starts_at, ends_at, display_label, display_badge',
    )
    .eq('is_active', true);
  const { data, error } = excludeId ? await query.neq('id', excludeId) : await query;
  if (error) {
    throw new Error(error.message);
  }
  const overlap = (data ?? []).find((row) =>
    windowsOverlap(
      candidate.starts_at,
      candidate.ends_at,
      String(row.starts_at),
      String(row.ends_at),
    ),
  );
  if (!overlap) return null;
  return {
    id: String(overlap.id),
    name: String(overlap.name),
    slug: String(overlap.slug),
    is_active: Boolean(overlap.is_active),
    discount_type: overlap.discount_type === 'flat_paise' ? 'flat_paise' : 'percent',
    discount_value: Number(overlap.discount_value),
    applies_to_plans: parseAppliesToPlans(overlap.applies_to_plans),
    starts_at: String(overlap.starts_at),
    ends_at: String(overlap.ends_at),
    display_label: (overlap.display_label as string | null) ?? null,
    display_badge: (overlap.display_badge as string | null) ?? null,
  };
}
