/**
 * Attribution acquisition reporting — read-only query helper.
 *
 * Canonical sources:
 *   - User acquisition: public.users.first_touch_attribution (never latest-touch)
 *   - Payment-level historical: public.payments.attribution_snapshot
 *   - Revenue: public.payments.amount (server-authoritative paise; status='paid')
 *
 * Campaign vs. attribution distinction:
 *   - payments.campaign_code_id / campaign_redemption_id = promotional discount
 *   - payments.attribution_snapshot / users.first_touch_attribution = acquisition UTM
 *   These concepts are independent and must not be merged.
 *
 * Anonymous→user join:
 *   There is no per-row anonymous session identifier in product_events or users.
 *   users.first_touch_attribution IS the bridge from pre-auth UTM → authenticated user
 *   at the aggregate level. Individual pre-auth events cannot be joined to a user row.
 *
 * Deterministic join keys:
 *   users.id ↔ payments.user_id
 *   users.id ↔ product_events.user_id
 *   payments.order_id ↔ product_events.props->>'order_id' (payment_completed events)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Equivalent canonical SQL (run via service-role, read-only):
 *
 * -- Acquisition report
 * SELECT
 *   u.first_touch_attribution->>'utm_source'   AS utm_source,
 *   u.first_touch_attribution->>'utm_medium'   AS utm_medium,
 *   u.first_touch_attribution->>'utm_campaign' AS utm_campaign,
 *   COUNT(DISTINCT u.id)                        AS attributed_users,
 *   COUNT(DISTINCT p.id)                        AS attributed_payments,
 *   COUNT(DISTINCT pe.id)                       AS payment_completed_count,
 *   COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0)
 *                                               AS total_amount_paise
 * FROM public.users u
 * LEFT JOIN public.payments p
 *   ON p.user_id = u.id AND p.status = 'paid'
 * LEFT JOIN public.product_events pe
 *   ON pe.user_id = u.id AND pe.event_name = 'payment_completed'
 * WHERE u.first_touch_attribution IS NOT NULL
 *   AND u.first_touch_attribution <> '{}'
 * GROUP BY 1, 2, 3
 * ORDER BY payment_completed_count DESC, attributed_users DESC;
 *
 * -- Attribution gap (unattributed users count)
 * SELECT COUNT(*) AS unattributed_users
 * FROM public.users
 * WHERE first_touch_attribution IS NULL OR first_touch_attribution = '{}';
 *
 * -- Validation: payments with attribution_snapshot but mismatched keys
 * SELECT id, attribution_snapshot
 * FROM public.payments
 * WHERE attribution_snapshot IS NOT NULL
 *   AND attribution_snapshot <> '{}'::JSONB
 *   AND attribution_snapshot - ARRAY['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
 *       <> '{}'::JSONB;  -- any key outside the allowed set
 *
 * -- Validation: users with attribution but foreign keys
 * SELECT id, first_touch_attribution
 * FROM public.users
 * WHERE first_touch_attribution IS NOT NULL
 *   AND first_touch_attribution - ARRAY['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
 *       <> '{}'::JSONB;
 *
 * -- Validation: payment_completed events without matching payments
 * SELECT pe.id, pe.props->>'order_id' AS order_id
 * FROM public.product_events pe
 * WHERE pe.event_name = 'payment_completed'
 *   AND NOT EXISTS (
 *     SELECT 1 FROM public.payments p WHERE p.order_id = pe.props->>'order_id'
 *   );
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { UTM_KEYS, normalizeAttribution, hasAttribution } from '@/lib/analytics/attribution';

/** One aggregated row per (utm_source, utm_medium, utm_campaign) acquisition bucket. */
export type AttributionReportRow = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  attributed_users: number;
  attributed_payments: number;
  payment_completed_count: number;
  /** Sum of payments.amount (paise) for paid payments in this bucket. Server-authoritative. */
  total_amount_paise: number;
};

/** Per-attribution-source validation result. */
export type AttributionValidationResult = {
  /** Total users checked. */
  total_users: number;
  /** Users with at least one first_touch_attribution key. */
  attributed_users: number;
  /** Users whose first_touch_attribution contains only normalized UTM keys. */
  valid_first_touch: number;
  /** Payments with attribution_snapshot that contain only normalized UTM keys. */
  valid_payment_snapshots: number;
  /** Payments with attribution_snapshot that contain non-UTM keys (should be 0). */
  invalid_payment_snapshots: number;
};

type AggKey = string;

type AggBucket = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  users: Set<string>;
  payments: Set<string>;
  events: Set<string>;
  total_amount_paise: number;
};

function makeAggKey(
  src: string | null,
  med: string | null,
  cam: string | null,
): AggKey {
  return JSON.stringify([src ?? null, med ?? null, cam ?? null]);
}

/**
 * Canonical acquisition attribution report.
 *
 * Groups users by first_touch_attribution (utm_source / utm_medium / utm_campaign).
 * Joins payments and payment_completed events on user_id.
 * Revenue uses payments.amount for status='paid' (server-authoritative).
 *
 * Users without any first_touch_attribution are excluded from this report.
 * Use queryAttributionGap() to count unattributed users.
 *
 * PostgREST does not support GROUP BY on JSONB subfields, so aggregation
 * is performed in TypeScript after batched fetches.
 */
export async function queryAttributionReport(
  svc: SupabaseClient,
  limit = 10_000,
): Promise<AttributionReportRow[]> {
  const { data: users, error: usersError } = await svc
    .from('users')
    .select('id, first_touch_attribution')
    .not('first_touch_attribution', 'is', null)
    .limit(limit);

  if (usersError || !users?.length) return [];

  // Build per-user bucket assignment and filter out empty attribution.
  const userBucket = new Map<string, AggKey>();
  const buckets = new Map<AggKey, AggBucket>();

  for (const u of users) {
    const attr = normalizeAttribution((u as Record<string, unknown>).first_touch_attribution);
    if (!hasAttribution(attr)) continue;

    const src = attr.utm_source ?? null;
    const med = attr.utm_medium ?? null;
    const cam = attr.utm_campaign ?? null;
    const key = makeAggKey(src, med, cam);

    if (!buckets.has(key)) {
      buckets.set(key, {
        utm_source: src,
        utm_medium: med,
        utm_campaign: cam,
        users: new Set(),
        payments: new Set(),
        events: new Set(),
        total_amount_paise: 0,
      });
    }

    buckets.get(key)!.users.add(u.id as string);
    userBucket.set(u.id as string, key);
  }

  if (buckets.size === 0) return [];

  const userIds = Array.from(userBucket.keys());

  const [paymentsResult, eventsResult] = await Promise.all([
    svc
      .from('payments')
      .select('id, user_id, amount')
      .in('user_id', userIds)
      .eq('status', 'paid'),
    svc
      .from('product_events')
      .select('id, user_id')
      .in('user_id', userIds)
      .eq('event_name', 'payment_completed'),
  ]);

  for (const p of paymentsResult.data ?? []) {
    const key = userBucket.get(p.user_id as string);
    if (!key) continue;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.payments.add(p.id as string);
    bucket.total_amount_paise += Number(p.amount);
  }

  for (const e of eventsResult.data ?? []) {
    const key = userBucket.get(e.user_id as string);
    if (!key) continue;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.events.add(e.id as string);
  }

  return Array.from(buckets.values())
    .map(
      (b): AttributionReportRow => ({
        utm_source: b.utm_source,
        utm_medium: b.utm_medium,
        utm_campaign: b.utm_campaign,
        attributed_users: b.users.size,
        attributed_payments: b.payments.size,
        payment_completed_count: b.events.size,
        total_amount_paise: b.total_amount_paise,
      }),
    )
    .sort(
      (a, b) =>
        b.payment_completed_count - a.payment_completed_count ||
        b.attributed_users - a.attributed_users,
    );
}

/**
 * Count users without first_touch_attribution (unattributed or pre-Phase-3 legacy).
 * Reports the attribution coverage gap without modifying data.
 */
export async function queryAttributionGap(
  svc: SupabaseClient,
): Promise<{ unattributed_users: number }> {
  const { count, error } = await svc
    .from('users')
    .select('id', { count: 'exact', head: true })
    .or('first_touch_attribution.is.null,first_touch_attribution.eq.{}');

  if (error) return { unattributed_users: -1 };
  return { unattributed_users: count ?? 0 };
}

/**
 * Validate that attribution data in the DB conforms to the canonical schema:
 * - first_touch_attribution / latest_touch_attribution contain only UTM_KEYS
 * - payments.attribution_snapshot contains only UTM_KEYS
 *
 * Read-only. Never modifies data. Returns counts for drift detection.
 */
export async function validateAttributionConsistency(
  svc: SupabaseClient,
  userLimit = 5_000,
  paymentLimit = 5_000,
): Promise<AttributionValidationResult> {
  const [usersResult, paymentsResult] = await Promise.all([
    svc
      .from('users')
      .select('id, first_touch_attribution')
      .limit(userLimit),
    svc
      .from('payments')
      .select('id, attribution_snapshot')
      .not('attribution_snapshot', 'is', null)
      .limit(paymentLimit),
  ]);

  const users = usersResult.data ?? [];
  const payments = paymentsResult.data ?? [];

  let attributed_users = 0;
  let valid_first_touch = 0;

  for (const u of users) {
    const raw = (u as Record<string, unknown>).first_touch_attribution;
    if (!raw) continue;

    const normalized = normalizeAttribution(raw);
    const has = hasAttribution(normalized);
    if (has) attributed_users += 1;

    // Check no foreign keys survive normalization vs. the raw value
    const rawKeys = typeof raw === 'object' && raw !== null ? Object.keys(raw as object) : [];
    const onlyUtmKeys = rawKeys.every((k) => (UTM_KEYS as readonly string[]).includes(k));
    if (onlyUtmKeys) valid_first_touch += 1;
  }

  let valid_payment_snapshots = 0;
  let invalid_payment_snapshots = 0;

  for (const p of payments) {
    const snap = (p as Record<string, unknown>).attribution_snapshot;
    if (!snap) continue;
    const snapKeys = typeof snap === 'object' && snap !== null ? Object.keys(snap as object) : [];
    const onlyUtmKeys = snapKeys.every((k) => (UTM_KEYS as readonly string[]).includes(k));
    if (onlyUtmKeys) {
      valid_payment_snapshots += 1;
    } else {
      invalid_payment_snapshots += 1;
    }
  }

  return {
    total_users: users.length,
    attributed_users,
    valid_first_touch,
    valid_payment_snapshots,
    invalid_payment_snapshots,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Creator Attribution (Phase 7 experiment)
//
// Creator attribution reuses the canonical Attribution model without any schema
// or pipeline changes. The creator identifier is conveyed via:
//
//   utm_content=<creator_id>
//
// Canonical URL contract:
//   /?utm_source=creator&utm_medium=referral&utm_campaign=creator_2026
//     &utm_content=<creator_id>
//
// Creator ID rules (enforced by existing normalizeAttribution()):
//   - URL-safe lowercase slug (e.g. creator_rakesh)
//   - Max 128 characters (ATTRIBUTION_MAX_VALUE_LENGTH)
//   - No spaces — normalizeAttribution strips control chars but NOT spaces;
//     creator IDs containing spaces are stored with spaces intact.
//     Use underscores/hyphens for word separation.
//   - Case-sensitive in storage (normalizeAttribution does not lowercase)
//   - Recommend all-lowercase slugs for consistency across campaigns
//
// Separation from campaign codes:
//   - campaign_codes / redemptions = promotional discount (unchanged)
//   - utm_content = acquisition source identifier (metadata only)
//   - A payment may have both a campaign_code_id AND utm_content attribution
//
// Acquisition source: users.first_touch_attribution.utm_content
// Historical payment source: payments.attribution_snapshot.utm_content
// ─────────────────────────────────────────────────────────────────────────────

/** One aggregated row per creator (utm_content) acquisition bucket. */
export type CreatorReportRow = {
  /** Creator identifier from utm_content; null means "no creator". */
  creator_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  attributed_users: number;
  attributed_payments: number;
  payment_completed_count: number;
  /** Sum of payments.amount (paise) for paid payments. Server-authoritative. */
  total_amount_paise: number;
};

/**
 * Creator acquisition report.
 *
 * Groups users by utm_content from users.first_touch_attribution, optionally
 * filtered to a specific utm_source (default: 'creator').
 *
 * Pass utmSourceFilter=null to include ALL utm_content values regardless of
 * source (useful for auditing).
 *
 * Revenue uses payments.amount for status='paid' (server-authoritative).
 * Users with no utm_content in first_touch_attribution are excluded.
 */
export async function queryCreatorReport(
  svc: SupabaseClient,
  options: { utmSourceFilter?: string | null; limit?: number } = {},
): Promise<CreatorReportRow[]> {
  const { utmSourceFilter = 'creator', limit = 10_000 } = options;

  const { data: users, error: usersError } = await svc
    .from('users')
    .select('id, first_touch_attribution')
    .not('first_touch_attribution', 'is', null)
    .limit(limit);

  if (usersError || !users?.length) return [];

  type CreatorKey = string;
  type CreatorBucket = {
    creator_id: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    users: Set<string>;
    payments: Set<string>;
    events: Set<string>;
    total_amount_paise: number;
  };

  const userBucket = new Map<string, CreatorKey>();
  const buckets = new Map<CreatorKey, CreatorBucket>();

  for (const u of users) {
    const attr = normalizeAttribution((u as Record<string, unknown>).first_touch_attribution);
    const creatorId = attr.utm_content ?? null;
    if (!creatorId) continue;

    // Optionally filter to a specific utm_source
    if (utmSourceFilter !== null && attr.utm_source !== utmSourceFilter) continue;

    const key = creatorId;

    if (!buckets.has(key)) {
      buckets.set(key, {
        creator_id: creatorId,
        utm_source: attr.utm_source ?? null,
        utm_medium: attr.utm_medium ?? null,
        utm_campaign: attr.utm_campaign ?? null,
        users: new Set(),
        payments: new Set(),
        events: new Set(),
        total_amount_paise: 0,
      });
    }

    buckets.get(key)!.users.add(u.id as string);
    userBucket.set(u.id as string, key);
  }

  if (buckets.size === 0) return [];

  const userIds = Array.from(userBucket.keys());

  const [paymentsResult, eventsResult] = await Promise.all([
    svc
      .from('payments')
      .select('id, user_id, amount')
      .in('user_id', userIds)
      .eq('status', 'paid'),
    svc
      .from('product_events')
      .select('id, user_id')
      .in('user_id', userIds)
      .eq('event_name', 'payment_completed'),
  ]);

  for (const p of paymentsResult.data ?? []) {
    const key = userBucket.get(p.user_id as string);
    if (!key) continue;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.payments.add(p.id as string);
    bucket.total_amount_paise += Number(p.amount);
  }

  for (const e of eventsResult.data ?? []) {
    const key = userBucket.get(e.user_id as string);
    if (!key) continue;
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.events.add(e.id as string);
  }

  return Array.from(buckets.values())
    .map(
      (b): CreatorReportRow => ({
        creator_id: b.creator_id,
        utm_source: b.utm_source,
        utm_medium: b.utm_medium,
        utm_campaign: b.utm_campaign,
        attributed_users: b.users.size,
        attributed_payments: b.payments.size,
        payment_completed_count: b.events.size,
        total_amount_paise: b.total_amount_paise,
      }),
    )
    .sort(
      (a, b) =>
        b.payment_completed_count - a.payment_completed_count ||
        b.attributed_users - a.attributed_users,
    );
}
