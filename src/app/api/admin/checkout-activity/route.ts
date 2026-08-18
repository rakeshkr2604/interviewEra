/**
 * GET /api/admin/checkout-activity?range=30&limit=50
 * Optional: &from=YYYY-MM-DD&to=YYYY-MM-DD (custom range overrides preset)
 *
 * Recent pricing and checkout/payment funnel events joined with user email.
 * For payment_started rows missing props.order_id (legacy emits), falls back to
 * the nearest payments.order_id for that user.
 *
 * Secured: platform admin only. Does not alter computeGrowthMetrics.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getCached, setCached } from '@/lib/admin/cache';
import { parseAdminDateBounds, resolveGrowthPreset } from '@/lib/admin/date-range';

const CACHE_TTL = 60_000;
const EVENT_NAMES = [
  'pricing_page_viewed',
  'checkout_started',
  'payment_started',
  'payment_failed',
  'payment_completed',
] as const;
/** Max skew when matching a legacy payment_started event to payments.order_id. */
const PAYMENT_MATCH_WINDOW_MS = 10 * 60_000;

export type CheckoutActivityEventName = (typeof EVENT_NAMES)[number];

export interface CheckoutActivityRow {
  id: string;
  event_name: CheckoutActivityEventName;
  user_id: string | null;
  email: string | null;
  created_at: string;
  /** Razorpay order id when present on payment_started props (or payments fallback). */
  order_id: string | null;
  plan: string | null;
  amount: number | null;
  source: string | null;
  source_page: string | null;
}

export interface CheckoutActivityResult {
  events: CheckoutActivityRow[];
  range_days: number;
  from: string | null;
  to: string | null;
  generated_at: string;
}

function propString(props: Record<string, unknown>, key: string): string | null {
  const v = props[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function propNumber(props: Record<string, unknown>, key: string): number | null {
  const v = props[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function extractOrderId(props: Record<string, unknown>): string | null {
  return (
    propString(props, 'order_id') ??
    propString(props, 'orderId') ??
    propString(props, 'subscription_id')
  );
}

export async function GET(request: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const bounds = parseAdminDateBounds(url.searchParams, {
    defaultPreset: '30',
    resolvePreset: resolveGrowthPreset,
  });
  const rangeDays = bounds.rangeDays ?? 30;
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10) || 50));
  const fresh = url.searchParams.get('fresh') === '1';
  const cacheKey = `admin:checkout-activity:${bounds.preset}:${bounds.fromIso}:${bounds.toIso}:${limit}`;

  if (!fresh) {
    const cached = getCached<CheckoutActivityResult>(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const svc = createServiceClient();
    const since = bounds.fromIso ?? new Date(Date.now() - rangeDays * 24 * 60 * 60_000).toISOString();

    let eventsQuery = svc
      .from('product_events')
      .select('id, event_name, user_id, props, created_at')
      .in('event_name', [...EVENT_NAMES])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (bounds.toIso) {
      eventsQuery = eventsQuery.lte('created_at', bounds.toIso);
    }

    const { data: events, error: eventsError } = await eventsQuery;
    if (eventsError) throw eventsError;

    const rows = events ?? [];
    const userIds = [
      ...new Set(rows.map((e) => e.user_id as string | null).filter((id): id is string => !!id)),
    ];

    const emailMap = new Map<string, string>();
    const paymentsByUser = new Map<string, { order_id: string; created_at: string; amount: number | null }[]>();

    if (userIds.length > 0) {
      const [{ data: users }, { data: payments }] = await Promise.all([
        svc.from('users').select('id, email').in('id', userIds),
        svc
          .from('payments')
          .select('user_id, order_id, amount, created_at')
          .in('user_id', userIds)
          .gte('created_at', since)
          .order('created_at', { ascending: false }),
      ]);
      for (const u of users ?? []) {
        emailMap.set(u.id, u.email);
      }
      for (const p of payments ?? []) {
        const uid = p.user_id as string;
        const list = paymentsByUser.get(uid) ?? [];
        list.push({
          order_id: p.order_id as string,
          created_at: p.created_at as string,
          amount: typeof p.amount === 'number' ? p.amount : null,
        });
        paymentsByUser.set(uid, list);
      }
    }

    const enriched: CheckoutActivityRow[] = rows.map((e) => {
      const props = (e.props ?? {}) as Record<string, unknown>;
      const eventName = e.event_name as CheckoutActivityEventName;
      let orderId =
        eventName === 'pricing_page_viewed' ? null : extractOrderId(props);

      // Legacy payment_started rows never stored order_id — match nearest payments row.
      if (eventName === 'payment_started' && !orderId && e.user_id) {
        const candidates = paymentsByUser.get(e.user_id as string) ?? [];
        const eventMs = new Date(e.created_at as string).getTime();
        const amount = propNumber(props, 'amount');
        let best: { order_id: string; dist: number } | null = null;
        for (const p of candidates) {
          const dist = Math.abs(new Date(p.created_at).getTime() - eventMs);
          if (dist > PAYMENT_MATCH_WINDOW_MS) continue;
          if (amount != null && p.amount != null && p.amount !== amount) continue;
          if (!best || dist < best.dist) best = { order_id: p.order_id, dist };
        }
        orderId = best?.order_id ?? null;
      }

      return {
        id: e.id as string,
        event_name: eventName,
        user_id: (e.user_id as string | null) ?? null,
        email: e.user_id ? (emailMap.get(e.user_id as string) ?? null) : null,
        created_at: e.created_at as string,
        order_id: orderId,
        plan: propString(props, 'plan'),
        amount: propNumber(props, 'amount'),
        source: propString(props, 'source'),
        source_page: propString(props, 'source_page'),
      };
    });

    const result: CheckoutActivityResult = {
      events: enriched,
      range_days: rangeDays,
      from: bounds.fromIso,
      to: bounds.toIso,
      generated_at: new Date().toISOString(),
    };
    setCached(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin/checkout-activity] Error:', err);
    return NextResponse.json({ error: 'Failed to load checkout activity' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
