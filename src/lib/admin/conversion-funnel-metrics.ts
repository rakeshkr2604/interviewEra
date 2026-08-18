import type { SupabaseClient } from '@supabase/supabase-js';

const CONVERSION_EVENT_NAMES = [
  'pricing_page_viewed',
  'plan_selected',
  'promotion_viewed',
  'coupon_entered',
  'coupon_applied',
  'checkout_started',
  'payment_started',
  'payment_failed',
  'payment_completed',
] as const;

const ABANDONMENT_WINDOW_MS = 60 * 60 * 1000;
const PAGE_SIZE = 1000;

type ConversionEventName = (typeof CONVERSION_EVENT_NAMES)[number];
type Plan = 'free' | 'starter' | 'pro';

export interface ConversionEventRow {
  id: string;
  event_name: string;
  user_id: string | null;
  props: Record<string, unknown> | null;
  created_at: string;
}

export interface ConversionStepMetric {
  key:
    | 'pricing_viewed'
    | 'plan_selected'
    | 'checkout_started'
    | 'payment_started'
    | 'payment_completed';
  label: string;
  count: number;
  conversion_pct: number | null;
  drop_off_pct: number | null;
}

export interface PlanConversionMetric {
  plan: Plan;
  pricing_views: number;
  selections: number;
  checkout_starts: number;
  conversions: number;
  conversion_rate_pct: number | null;
}

export interface CampaignConversionMetric {
  campaign: string;
  promotion_views: number;
  selections: number;
  checkout_starts: number;
  conversions: number;
  conversion_rate_pct: number | null;
}

export interface ConversionFunnelMetrics {
  steps: ConversionStepMetric[];
  promotion_views: number;
  coupon_entries: number;
  coupon_applications: number;
  payment_failures: number;
  abandoned_checkouts: number;
  unresolved_checkouts: number;
  abandonment_window_minutes: 60;
  plans: PlanConversionMetric[];
  campaigns: CampaignConversionMetric[];
}

type NormalizedOrder = {
  orderId: string;
  createdAt: string;
  plan: Plan | null;
  campaign: string | null;
};

function stringProp(props: Record<string, unknown>, key: string): string | null {
  const value = props[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function planProp(props: Record<string, unknown>): Plan | null {
  const plan = stringProp(props, 'plan');
  return plan === 'free' || plan === 'starter' || plan === 'pro' ? plan : null;
}

function campaignProp(props: Record<string, unknown>): string | null {
  return stringProp(props, 'campaign_code_id') ?? stringProp(props, 'campaign_code');
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function uniqueOutcomeKey(row: ConversionEventRow): string {
  const props = row.props ?? {};
  return (
    stringProp(props, 'order_id') ??
    stringProp(props, 'payment_id') ??
    `event:${row.id}`
  );
}

function normalizedOrders(
  rows: ConversionEventRow[],
  eventName: ConversionEventName,
): Map<string, NormalizedOrder> {
  const orders = new Map<string, NormalizedOrder>();
  for (const row of rows) {
    if (row.event_name !== eventName) continue;
    const props = row.props ?? {};
    const orderId = stringProp(props, 'order_id');
    if (!orderId) continue;
    const existing = orders.get(orderId);
    if (!existing || row.created_at < existing.createdAt) {
      orders.set(orderId, {
        orderId,
        createdAt: row.created_at,
        plan: planProp(props) ?? existing?.plan ?? null,
        campaign: campaignProp(props) ?? existing?.campaign ?? null,
      });
    } else {
      existing.plan ??= planProp(props);
      existing.campaign ??= campaignProp(props);
    }
  }
  return orders;
}

function step(
  key: ConversionStepMetric['key'],
  label: string,
  count: number,
  previous: number | null,
): ConversionStepMetric {
  return {
    key,
    label,
    count,
    conversion_pct: previous === null ? null : pct(count, previous),
    drop_off_pct:
      previous === null || previous <= 0
        ? null
        : pct(Math.max(0, previous - count), previous),
  };
}

export function aggregateConversionEvents(
  rows: ConversionEventRow[],
  now: Date = new Date(),
): ConversionFunnelMetrics {
  const pricingViews = rows.filter((row) => row.event_name === 'pricing_page_viewed').length;
  const planSelections = rows.filter((row) => row.event_name === 'plan_selected');
  const promotionViews = rows.filter((row) => row.event_name === 'promotion_viewed');
  const couponEntries = rows.filter((row) => row.event_name === 'coupon_entered');
  const couponApplications = rows.filter((row) => row.event_name === 'coupon_applied');

  const checkoutOrders = normalizedOrders(rows, 'checkout_started');
  const paymentStartedOrders = normalizedOrders(rows, 'payment_started');
  const completedRows = rows.filter((row) => row.event_name === 'payment_completed');
  const failedRows = rows.filter((row) => row.event_name === 'payment_failed');
  const completedKeys = new Set(completedRows.map(uniqueOutcomeKey));
  const failedKeys = new Set(failedRows.map(uniqueOutcomeKey));

  const couponEntryKeys = new Set(
    couponEntries.map((row) => stringProp(row.props ?? {}, 'coupon_attempt_id') ?? row.id),
  );
  const couponApplicationKeys = new Set(
    couponApplications.map(
      (row) => stringProp(row.props ?? {}, 'coupon_attempt_id') ?? row.id,
    ),
  );

  let abandonedCheckouts = 0;
  let unresolvedCheckouts = 0;
  for (const checkout of checkoutOrders.values()) {
    const terminal =
      completedKeys.has(checkout.orderId) || failedKeys.has(checkout.orderId);
    if (terminal) continue;
    const age = now.getTime() - new Date(checkout.createdAt).getTime();
    if (age >= ABANDONMENT_WINDOW_MS) abandonedCheckouts += 1;
    else unresolvedCheckouts += 1;
  }

  const completedCount = completedKeys.size;
  const failedCount = failedKeys.size;
  const steps: ConversionStepMetric[] = [];
  steps.push(step('pricing_viewed', 'Pricing Viewed', pricingViews, null));
  steps.push(step('plan_selected', 'Plan Selected', planSelections.length, pricingViews));
  steps.push(
    step(
      'checkout_started',
      'Checkout Started',
      checkoutOrders.size,
      planSelections.length,
    ),
  );
  steps.push(
    step(
      'payment_started',
      'Payment Started',
      paymentStartedOrders.size,
      checkoutOrders.size,
    ),
  );
  steps.push(
    step(
      'payment_completed',
      'Payment Completed',
      completedCount,
      paymentStartedOrders.size,
    ),
  );

  const plans: PlanConversionMetric[] = (['free', 'starter', 'pro'] as const).map(
    (plan) => {
      const selections = planSelections.filter(
        (row) => planProp(row.props ?? {}) === plan,
      ).length;
      const checkoutStarts = [...checkoutOrders.values()].filter(
        (order) => order.plan === plan,
      ).length;
      const conversions = completedRows.filter((row) => {
        const props = row.props ?? {};
        const orderId = stringProp(props, 'order_id');
        return (
          planProp(props) === plan ||
          (orderId ? checkoutOrders.get(orderId)?.plan === plan : false)
        );
      });
      const uniqueConversions = new Set(conversions.map(uniqueOutcomeKey)).size;
      return {
        plan,
        pricing_views: pricingViews,
        selections,
        checkout_starts: checkoutStarts,
        conversions: uniqueConversions,
        conversion_rate_pct: pct(uniqueConversions, checkoutStarts),
      };
    },
  );

  const campaignStats = new Map<string, CampaignConversionMetric>();
  const ensureCampaign = (campaign: string): CampaignConversionMetric => {
    const current = campaignStats.get(campaign);
    if (current) return current;
    const created: CampaignConversionMetric = {
      campaign,
      promotion_views: 0,
      selections: 0,
      checkout_starts: 0,
      conversions: 0,
      conversion_rate_pct: null,
    };
    campaignStats.set(campaign, created);
    return created;
  };

  for (const row of promotionViews) {
    const campaign = campaignProp(row.props ?? {});
    if (campaign) ensureCampaign(campaign).promotion_views += 1;
  }
  for (const row of planSelections) {
    const campaign = campaignProp(row.props ?? {});
    if (campaign) ensureCampaign(campaign).selections += 1;
  }
  for (const checkout of checkoutOrders.values()) {
    if (checkout.campaign) ensureCampaign(checkout.campaign).checkout_starts += 1;
  }

  const campaignCompletionKeys = new Set<string>();
  for (const row of completedRows) {
    const props = row.props ?? {};
    const orderId = stringProp(props, 'order_id');
    const campaign =
      campaignProp(props) ?? (orderId ? checkoutOrders.get(orderId)?.campaign : null);
    if (!campaign) continue;
    const key = `${campaign}:${uniqueOutcomeKey(row)}`;
    if (campaignCompletionKeys.has(key)) continue;
    campaignCompletionKeys.add(key);
    ensureCampaign(campaign).conversions += 1;
  }

  const campaigns = [...campaignStats.values()]
    .map((campaign) => ({
      ...campaign,
      conversion_rate_pct: pct(campaign.conversions, campaign.checkout_starts),
    }))
    .sort((a, b) => b.conversions - a.conversions || a.campaign.localeCompare(b.campaign));

  return {
    steps,
    promotion_views: promotionViews.length,
    coupon_entries: couponEntryKeys.size,
    coupon_applications: couponApplicationKeys.size,
    payment_failures: failedCount,
    abandoned_checkouts: abandonedCheckouts,
    unresolved_checkouts: unresolvedCheckouts,
    abandonment_window_minutes: 60,
    plans,
    campaigns,
  };
}

export async function computeConversionFunnelMetrics(
  svc: SupabaseClient,
  sinceIso: string,
  untilIso?: string,
): Promise<ConversionFunnelMetrics> {
  const rows: ConversionEventRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = svc
      .from('product_events')
      .select('id, event_name, user_id, props, created_at')
      .in('event_name', [...CONVERSION_EVENT_NAMES])
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (untilIso) query = query.lte('created_at', untilIso);

    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as ConversionEventRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return aggregateConversionEvents(rows);
}
