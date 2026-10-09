/**
 * Server-authoritative plan pricing: list price ± one live global campaign.
 * Coupons stay in `@/lib/campaign-codes`. Do not stack both discounts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabasePlaceholderCredential } from '@/lib/analytics/product-events-store';
import {
  campaignAppliesToPlan,
  campaignWindowStatus,
  computeCampaignDiscountQuote,
  type CampaignDiscountType,
} from '@/lib/campaign-codes';
import { getPaidPlan, PAID_PLANS, type PaidPlanId } from '@/lib/pricing/plans';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'ended'
  | 'archived';

export type PricingCampaignRecord = {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  is_active: boolean;
  discount_type: CampaignDiscountType;
  discount_value: number;
  applies_to_plans: PaidPlanId[];
  starts_at: string;
  ends_at: string;
  display_label: string | null;
  display_badge: string | null;
  parent_campaign_id?: string | null;
  archived_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type EffectivePlanPrice = {
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  campaignId: string | null;
  campaignName: string | null;
  displayLabel: string | null;
  displayBadge: string | null;
  startsAt: string | null;
  endsAt: string | null;
  serverNow: string;
};

export type PublicPlanPrice = {
  basePrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  basePricePaise: number;
  finalPricePaise: number;
  discountAmountPaise: number;
};

export type PublicPricingSnapshot = {
  plans: Record<PaidPlanId, PublicPlanPrice>;
  campaign: {
    active: boolean;
    name: string | null;
    label: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  serverNow: string;
};

export type CheckoutAmountDecision = {
  source: 'list' | 'campaign' | 'coupon';
  finalAmountPaise: number;
  discountPaise: number;
  pricingCampaignId: string | null;
};

function paiseToRupees(paise: number): number {
  return Math.round(paise / 100);
}

function listPriceFor(plan: PaidPlanId, serverNow: string): EffectivePlanPrice {
  const config = getPaidPlan(plan);
  return {
    basePrice: config.amountPaise,
    finalPrice: config.amountPaise,
    discountAmount: 0,
    discountPercent: 0,
    campaignId: null,
    campaignName: null,
    displayLabel: null,
    displayBadge: null,
    startsAt: null,
    endsAt: null,
    serverNow,
  };
}

export function parseAppliesToPlans(value: unknown): PaidPlanId[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is PaidPlanId => item === 'starter' || item === 'pro');
}

export function isPricingCampaignLive(
  campaign: Pick<PricingCampaignRecord, 'is_active' | 'starts_at' | 'ends_at'> & {
    status?: CampaignStatus;
  },
  now: Date,
): boolean {
  if (!campaign.is_active) return false;
  if (campaign.status && campaign.status !== 'active' && campaign.status !== 'scheduled') {
    return false;
  }
  return (
    campaignWindowStatus(new Date(campaign.starts_at), new Date(campaign.ends_at), now) ===
    'active'
  );
}

export function windowsOverlap(
  aStartsAt: string,
  aEndsAt: string,
  bStartsAt: string,
  bEndsAt: string,
): boolean {
  const aStart = Date.parse(aStartsAt);
  const aEnd = Date.parse(aEndsAt);
  const bStart = Date.parse(bStartsAt);
  const bEnd = Date.parse(bEndsAt);
  if (![aStart, aEnd, bStart, bEnd].every(Number.isFinite)) return true;
  return aStart < bEnd && bStart < aEnd;
}

export function applyCampaignToPlan(
  plan: PaidPlanId,
  campaign: PricingCampaignRecord | null,
  now: Date,
): EffectivePlanPrice {
  const serverNow = now.toISOString();
  const list = listPriceFor(plan, serverNow);
  if (!campaign) return list;
  if (!isPricingCampaignLive(campaign, now)) return list;
  if (!campaignAppliesToPlan(campaign.applies_to_plans, plan)) return list;

  const config = getPaidPlan(plan);
  const quote = computeCampaignDiscountQuote({
    listAmountPaise: config.amountPaise,
    promoFloorPaise: config.promoFloorPaise,
    discountType: campaign.discount_type,
    discountValue: campaign.discount_value,
  });

  if (!quote.ok) {
    console.error('[pricing-campaign] invalid discount skipped', {
      campaign_id: campaign.id,
      plan,
      error_code: quote.error_code,
    });
    return list;
  }

  const discountPercent =
    campaign.discount_type === 'percent'
      ? campaign.discount_value
      : config.amountPaise === 0
        ? 0
        : Math.round((quote.discount_paise / config.amountPaise) * 100);

  return {
    basePrice: config.amountPaise,
    finalPrice: quote.final_amount_paise,
    discountAmount: quote.discount_paise,
    discountPercent,
    campaignId: campaign.id,
    campaignName: campaign.name,
    displayLabel: campaign.display_label,
    displayBadge: campaign.display_badge,
    startsAt: campaign.starts_at,
    endsAt: campaign.ends_at,
    serverNow,
  };
}

export function selectLiveCampaignForPlan(
  campaigns: PricingCampaignRecord[],
  plan: PaidPlanId,
  now: Date,
): PricingCampaignRecord | null {
  const matches = campaigns.filter(
    (campaign) =>
      isPricingCampaignLive(campaign, now) &&
      campaignAppliesToPlan(campaign.applies_to_plans, plan),
  );
  matches.sort((a, b) => (a.starts_at < b.starts_at ? 1 : a.starts_at > b.starts_at ? -1 : 0));
  return matches[0] ?? null;
}

function isMissingPricingCampaignsTable(message: string): boolean {
  return (
    /pricing_campaigns/i.test(message) &&
    /schema cache|does not exist|Could not find/i.test(message)
  );
}

function mapCampaignRow(row: Record<string, unknown>): PricingCampaignRecord {
  const isActive = Boolean(row.is_active);
  const rawStatus = typeof row.status === 'string' ? (row.status as CampaignStatus) : null;
  const status: CampaignStatus = rawStatus ?? (isActive ? 'active' : 'draft');
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug ?? ''),
    status,
    is_active: isActive,
    discount_type: row.discount_type === 'flat_paise' ? 'flat_paise' : 'percent',
    discount_value: Number(row.discount_value),
    applies_to_plans: parseAppliesToPlans(row.applies_to_plans),
    starts_at: String(row.starts_at),
    ends_at: String(row.ends_at),
    display_label: (row.display_label as string | null) ?? null,
    display_badge: (row.display_badge as string | null) ?? null,
    parent_campaign_id: (row.parent_campaign_id as string | null) ?? null,
    archived_at: (row.archived_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
  };
}

export async function loadLivePricingCampaigns(
  svc: SupabaseClient,
  now: Date,
): Promise<PricingCampaignRecord[]> {
  const nowIso = now.toISOString();
  const { data, error } = await svc
    .from('pricing_campaigns')
    .select(
      'id, name, slug, status, is_active, discount_type, discount_value, applies_to_plans, starts_at, ends_at, display_label, display_badge, parent_campaign_id, archived_at, metadata',
    )
    .eq('is_active', true)
    .lte('starts_at', nowIso)
    .gt('ends_at', nowIso)
    .order('starts_at', { ascending: false })
    .limit(8);

  if (error) {
    if (isMissingPricingCampaignsTable(error.message)) {
      console.warn('[pricing-campaign] table missing; using list prices');
      return [];
    }
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapCampaignRow(row as Record<string, unknown>));
}

export async function getEffectivePlanPrice(params: {
  svc: SupabaseClient;
  plan: PaidPlanId;
  now?: Date;
  campaigns?: PricingCampaignRecord[];
}): Promise<EffectivePlanPrice> {
  const now = params.now ?? new Date();
  const campaigns = params.campaigns ?? (await loadLivePricingCampaigns(params.svc, now));
  const campaign = selectLiveCampaignForPlan(campaigns, params.plan, now);
  return applyCampaignToPlan(params.plan, campaign, now);
}

function toPublicPlanPrice(price: EffectivePlanPrice): PublicPlanPrice {
  return {
    basePrice: paiseToRupees(price.basePrice),
    finalPrice: paiseToRupees(price.finalPrice),
    discountAmount: paiseToRupees(price.discountAmount),
    discountPercent: price.discountPercent,
    basePricePaise: price.basePrice,
    finalPricePaise: price.finalPrice,
    discountAmountPaise: price.discountAmount,
  };
}

export async function getPublicPricingSnapshot(
  svc: SupabaseClient,
  now: Date = new Date(),
): Promise<PublicPricingSnapshot> {
  let campaigns: PricingCampaignRecord[] = [];

  // E2E / CI uses supabase-demo placeholder JWTs. Campaigns are optional —
  // skip the remote round-trip and keep canonical list prices (no invented discounts).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (isSupabasePlaceholderCredential(supabaseUrl, serviceKey)) {
    console.info('[pricing-campaign] placeholder credentials; using list prices');
  } else {
    try {
      campaigns = await loadLivePricingCampaigns(svc, now);
    } catch (error) {
      console.error('[pricing-campaign] snapshot load failed', error);
      campaigns = [];
    }
  }

  const starter = applyCampaignToPlan(
    'starter',
    selectLiveCampaignForPlan(campaigns, 'starter', now),
    now,
  );
  const pro = applyCampaignToPlan('pro', selectLiveCampaignForPlan(campaigns, 'pro', now), now);
  const live = starter.campaignId
    ? starter
    : pro.campaignId
      ? pro
      : null;

  return {
    plans: {
      starter: toPublicPlanPrice(starter),
      pro: toPublicPlanPrice(pro),
    },
    campaign: live
      ? {
          active: true,
          name: live.campaignName,
          label: live.displayBadge ?? live.displayLabel,
          startsAt: live.startsAt,
          endsAt: live.endsAt,
        }
      : {
          active: false,
          name: null,
          label: null,
          startsAt: null,
          endsAt: null,
        },
    serverNow: now.toISOString(),
  };
}

export type PromoDisplayQuote = {
  list_amount_paise: number;
  discount_paise: number;
  final_amount_paise: number;
  label: string | null;
  discountPercent: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  serverNow: string | null;
  isActive: boolean;
  campaignCodeId: string | null;
};

export function effectivePriceToPromoQuote(
  price: EffectivePlanPrice,
): PromoDisplayQuote | undefined {
  if (!price.campaignId || price.finalPrice >= price.basePrice) return undefined;
  return {
    list_amount_paise: price.basePrice,
    discount_paise: price.discountAmount,
    final_amount_paise: price.finalPrice,
    label: price.displayLabel ?? price.campaignName,
    discountPercent: price.discountPercent > 0 ? price.discountPercent : null,
    startsAt: price.startsAt,
    expiresAt: price.endsAt,
    serverNow: price.serverNow,
    isActive: true,
    campaignCodeId: null,
  };
}

export function publicSnapshotToPromoQuotes(
  snapshot: PublicPricingSnapshot,
): Partial<Record<PaidPlanId, PromoDisplayQuote>> | undefined {
  if (!snapshot.campaign.active) return undefined;
  const quotes: Partial<Record<PaidPlanId, PromoDisplayQuote>> = {};
  for (const plan of Object.keys(PAID_PLANS) as PaidPlanId[]) {
    const row = snapshot.plans[plan];
    if (row.finalPricePaise >= row.basePricePaise) continue;
    quotes[plan] = {
      list_amount_paise: row.basePricePaise,
      discount_paise: row.discountAmountPaise,
      final_amount_paise: row.finalPricePaise,
      label: snapshot.campaign.label ?? snapshot.campaign.name,
      discountPercent: row.discountPercent > 0 ? row.discountPercent : null,
      startsAt: snapshot.campaign.startsAt,
      expiresAt: snapshot.campaign.endsAt,
      serverNow: snapshot.serverNow,
      isActive: true,
      campaignCodeId: null,
    };
  }
  return Object.keys(quotes).length ? quotes : undefined;
}

export function chooseCheckoutAmount(params: {
  listAmountPaise: number;
  campaign: EffectivePlanPrice;
  coupon: { final_amount_paise: number; discount_paise: number } | null;
}): CheckoutAmountDecision {
  const campaignApplies = Boolean(params.campaign.campaignId);

  if (params.coupon) {
    if (campaignApplies && params.campaign.finalPrice < params.coupon.final_amount_paise) {
      return {
        source: 'campaign',
        finalAmountPaise: params.campaign.finalPrice,
        discountPaise: params.campaign.discountAmount,
        pricingCampaignId: params.campaign.campaignId,
      };
    }
    return {
      source: 'coupon',
      finalAmountPaise: params.coupon.final_amount_paise,
      discountPaise: params.coupon.discount_paise,
      pricingCampaignId: null,
    };
  }

  if (campaignApplies) {
    return {
      source: 'campaign',
      finalAmountPaise: params.campaign.finalPrice,
      discountPaise: params.campaign.discountAmount,
      pricingCampaignId: params.campaign.campaignId,
    };
  }

  return {
    source: 'list',
    finalAmountPaise: params.listAmountPaise,
    discountPaise: 0,
    pricingCampaignId: null,
  };
}
