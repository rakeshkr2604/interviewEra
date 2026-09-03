import { computeCampaignDiscountQuote } from '@/lib/campaign-codes';
import { getPaidPlan, type PaidPlanId } from '@/lib/pricing/plans';
import {
  parseAppliesToPlans,
  windowsOverlap,
  type CampaignStatus,
  type PricingCampaignRecord,
} from '@/lib/pricing/effective-price';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CampaignConflictInfo = {
  conflictCampaignId: string;
  conflictCampaignName: string;
  conflictStartsAt: string;
  conflictEndsAt: string;
  conflictingPlans: PaidPlanId[];
};

export type CampaignAuditAction =
  | 'created'
  | 'updated'
  | 'activated'
  | 'paused'
  | 'resumed'
  | 'ended'
  | 'extended'
  | 'restarted'
  | 'duplicated'
  | 'archived'
  | 'deleted';

export function slugifyCampaignName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'offer';
}

/**
 * Generate a unique slug for a campaign. Display name is non-unique and reusable,
 * but slug includes a compact random discriminator to ensure URL safety.
 */
export function generateCampaignSlug(name: string): string {
  const base = slugifyCampaignName(name);
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${base}-${suffix}`.slice(0, 80);
}

export function deriveEffectiveStatus(
  campaign: {
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    status?: string | null;
  },
  now = Date.now(),
): CampaignStatus {
  if (campaign.status === 'archived') return 'archived';
  if (campaign.status === 'draft') return 'draft';
  if (campaign.status === 'paused') return 'paused';

  const start = Date.parse(campaign.starts_at);
  const end = Date.parse(campaign.ends_at);

  if (end <= now) return 'ended';
  if (campaign.is_active) {
    if (start <= now && now < end) return 'active';
    if (now < start) return 'scheduled';
  }
  return (campaign.status as CampaignStatus) ?? 'draft';
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

/**
 * Plan-aware overlap check:
 * Two campaigns only conflict if their time windows overlap AND they target the same plan tier.
 * Campaigns that are ended, archived, paused, or draft do not conflict.
 */
export async function findOverlappingActiveCampaign(
  svc: SupabaseClient,
  candidate: {
    starts_at: string;
    ends_at: string;
    applies_to_plans?: PaidPlanId[];
  },
  excludeId?: string,
): Promise<PricingCampaignRecord | null> {
  const candidatePlans: PaidPlanId[] =
    candidate.applies_to_plans && candidate.applies_to_plans.length > 0
      ? candidate.applies_to_plans
      : ['starter', 'pro'];

  const nowIso = new Date().toISOString();

  // Query unexpired active or scheduled campaigns
  const query = svc
    .from('pricing_campaigns')
    .select(
      'id, name, slug, status, is_active, discount_type, discount_value, applies_to_plans, starts_at, ends_at, display_label, display_badge, parent_campaign_id, archived_at, metadata',
    )
    .eq('is_active', true)
    .gt('ends_at', nowIso);

  const { data, error } = excludeId ? await query.neq('id', excludeId) : await query;
  if (error) {
    throw new Error(error.message);
  }

  const overlap = (data ?? []).find((row) => {
    // Only genuine active or scheduled campaigns can cause a conflict
    const rowStatus = (row.status as CampaignStatus) ?? 'active';
    if (rowStatus === 'ended' || rowStatus === 'archived' || rowStatus === 'paused' || rowStatus === 'draft') {
      return false;
    }

    const timeOverlaps = windowsOverlap(
      candidate.starts_at,
      candidate.ends_at,
      String(row.starts_at),
      String(row.ends_at),
    );
    if (!timeOverlaps) return false;

    const rowPlans = parseAppliesToPlans(row.applies_to_plans);
    const effectiveRowPlans: PaidPlanId[] = rowPlans.length > 0 ? rowPlans : ['starter', 'pro'];
    const sharedPlans = candidatePlans.filter((p) => effectiveRowPlans.includes(p));
    return sharedPlans.length > 0;
  });

  if (!overlap) return null;

  return {
    id: String(overlap.id),
    name: String(overlap.name),
    slug: String(overlap.slug ?? ''),
    status: (overlap.status as CampaignStatus) ?? 'active',
    is_active: Boolean(overlap.is_active),
    discount_type: overlap.discount_type === 'flat_paise' ? 'flat_paise' : 'percent',
    discount_value: Number(overlap.discount_value),
    applies_to_plans: parseAppliesToPlans(overlap.applies_to_plans),
    starts_at: String(overlap.starts_at),
    ends_at: String(overlap.ends_at),
    display_label: (overlap.display_label as string | null) ?? null,
    display_badge: (overlap.display_badge as string | null) ?? null,
    parent_campaign_id: (overlap.parent_campaign_id as string | null) ?? null,
    archived_at: (overlap.archived_at as string | null) ?? null,
    metadata: (overlap.metadata as Record<string, unknown> | null) ?? {},
  };
}

/**
 * Check whether a campaign can be safely deleted or must be archived.
 * Audits all protected business references:
 *   - payments (financial transactions)
 *   - marketing_tracking_links (active acquisition spend)
 *   - child pricing_campaigns (continuation lineage)
 */
export async function canDeleteCampaign(
  svc: SupabaseClient,
  campaignId: string,
): Promise<{
  canDelete: boolean;
  paymentCount: number;
  trackingLinkCount: number;
  childCampaignCount: number;
  reason?: string;
}> {
  // 1. Check payments
  const { count: paymentCount, error: payErr } = await svc
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('pricing_campaign_id', campaignId);

  if (payErr) {
    throw new Error(`Failed to check payment references: ${payErr.message}`);
  }

  // 2. Check marketing tracking links
  let tCount = 0;
  try {
    const { count: trackingCount } = await svc
      .from('marketing_tracking_links')
      .select('id', { count: 'exact', head: true })
      .eq('pricing_campaign_id', campaignId);
    tCount = trackingCount ?? 0;
  } catch {
    // ignore if table not yet created
  }

  // 3. Check child campaign instances (continued campaigns)
  const { count: childCount } = await svc
    .from('pricing_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('parent_campaign_id', campaignId);

  const pCount = paymentCount ?? 0;
  const cCount = childCount ?? 0;

  if (pCount > 0) {
    return {
      canDelete: false,
      paymentCount: pCount,
      trackingLinkCount: tCount,
      childCampaignCount: cCount,
      reason: `Cannot delete campaign: ${pCount} payment transaction(s) are linked to it. Archive this campaign instead to preserve financial accounting records.`,
    };
  }

  if (tCount > 0) {
    return {
      canDelete: false,
      paymentCount: pCount,
      trackingLinkCount: tCount,
      childCampaignCount: cCount,
      reason: `Cannot delete campaign: ${tCount} marketing tracking link(s) reference it. Remove the tracking links or Archive this campaign instead.`,
    };
  }

  if (cCount > 0) {
    return {
      canDelete: false,
      paymentCount: pCount,
      trackingLinkCount: tCount,
      childCampaignCount: cCount,
      reason: `Cannot delete campaign: ${cCount} continued campaign instance(s) are linked as children. Archive this campaign instead to preserve historical lineage.`,
    };
  }

  return { canDelete: true, paymentCount: 0, trackingLinkCount: 0, childCampaignCount: 0 };
}

/**
 * Record a high-fidelity audit entry in campaign_audit_logs and product_events.
 * Stores campaign_name alongside campaign_id so the audit trail survives even if
 * an unreferenced draft is deleted.
 */
export async function logCampaignAudit(
  svc: SupabaseClient,
  params: {
    campaignId: string;
    campaignName?: string;
    adminId?: string | null;
    action: CampaignAuditAction;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const { campaignId, campaignName, adminId, action, details = {} } = params;

  const resolvedName =
    campaignName ??
    (details.name as string) ??
    (details.deleted_campaign_name as string) ??
    (details.parent_campaign_name as string) ??
    'campaign';

  // Insert into campaign_audit_logs
  const { error: auditErr } = await svc.from('campaign_audit_logs').insert({
    campaign_id: campaignId,
    campaign_name: resolvedName,
    admin_id: adminId ?? null,
    action,
    details,
  });
  if (auditErr) {
    console.error('[campaign-admin] campaign_audit_logs write failed:', auditErr.message);
  }

  // Insert into product_events for unified analytics
  if (adminId) {
    const { error: eventErr } = await svc.from('product_events').insert({
      event_name: 'pricing_campaign_operation',
      user_id: adminId,
      props: {
        campaign_id: campaignId,
        campaign_name: resolvedName,
        action,
        ...details,
      },
    });
    if (eventErr) {
      console.error('[campaign-admin] product_events audit failed:', eventErr.message);
    }
  }
}
