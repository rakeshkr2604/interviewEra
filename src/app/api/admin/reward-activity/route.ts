/**
 * GET /api/admin/reward-activity — unified usage log (campaign redemptions + referral credits).
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export interface RewardActivityRow {
  id: string;
  type: 'referral_credit' | 'promo' | 'sponsorship' | 'campaign_change';
  created_at: string;
  user_email: string | null;
  detail: string;
  status: string;
  order_id: string | null;
  code_or_label: string | null;
}

export async function GET(request: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));

  const svc = createServiceClient();

  const [{ data: redemptions }, { data: creditedRefs }, { data: campaignChanges }] =
    await Promise.all([
    svc
      .from('campaign_code_redemptions')
      .select('id, user_id, order_id, plan, discount_paise, final_amount_paise, status, created_at, campaign_code_id')
      .order('created_at', { ascending: false })
      .limit(limit),
    svc
      .from('referrals')
      .select('id, referrer_id, referred_id, status, credited_at')
      .eq('status', 'credited')
      .order('credited_at', { ascending: false })
      .limit(limit),
    svc
      .from('product_events')
      .select('id, event_name, user_id, props, created_at')
      .in('event_name', ['campaign_created', 'campaign_updated'])
      .order('created_at', { ascending: false })
      .limit(limit),
    ]);

  const codeIds = [...new Set((redemptions ?? []).map((r) => r.campaign_code_id as string))];
  const userIds = new Set<string>();
  for (const r of redemptions ?? []) userIds.add(r.user_id as string);
  for (const r of creditedRefs ?? []) {
    userIds.add(r.referrer_id as string);
    userIds.add(r.referred_id as string);
  }
  for (const event of campaignChanges ?? []) {
    if (event.user_id) userIds.add(event.user_id as string);
  }

  const emailMap = new Map<string, string>();
  const codeMap = new Map<string, { code: string; kind: string; label: string }>();

  await Promise.all([
    userIds.size > 0
      ? svc
          .from('users')
          .select('id, email')
          .in('id', [...userIds])
          .then(({ data }) => {
            for (const u of data ?? []) emailMap.set(u.id, u.email);
          })
      : Promise.resolve(),
    codeIds.length > 0
      ? svc
          .from('campaign_codes')
          .select('id, code, kind, label')
          .in('id', codeIds)
          .then(({ data }) => {
            for (const c of data ?? []) {
              codeMap.set(c.id, { code: c.code, kind: c.kind, label: c.label });
            }
          })
      : Promise.resolve(),
  ]);

  const rows: RewardActivityRow[] = [];

  for (const r of redemptions ?? []) {
    const meta = codeMap.get(r.campaign_code_id as string);
    const kind = (meta?.kind === 'sponsorship' ? 'sponsorship' : 'promo') as 'promo' | 'sponsorship';
    rows.push({
      id: `c-${r.id}`,
      type: kind,
      created_at: r.created_at as string,
      user_email: emailMap.get(r.user_id as string) ?? null,
      detail: `₹${((r.discount_paise as number) / 100).toFixed(0)} off ${r.plan} → ₹${((r.final_amount_paise as number) / 100).toFixed(0)}`,
      status: r.status as string,
      order_id: (r.order_id as string | null) ?? null,
      code_or_label: meta ? `${meta.code} (${meta.label})` : null,
    });
  }

  for (const r of creditedRefs ?? []) {
    const at = (r.credited_at as string | null) ?? new Date(0).toISOString();
    rows.push({
      id: `r-${r.id}`,
      type: 'referral_credit',
      created_at: at,
      user_email: emailMap.get(r.referred_id as string) ?? null,
      detail: `Referrer ${emailMap.get(r.referrer_id as string) ?? r.referrer_id} · referred ${emailMap.get(r.referred_id as string) ?? r.referred_id}`,
      status: 'credited',
      order_id: null,
      code_or_label: 'referral',
    });
  }

  for (const event of campaignChanges ?? []) {
    const props = (event.props ?? {}) as Record<string, unknown>;
    rows.push({
      id: `a-${event.id}`,
      type: 'campaign_change',
      created_at: event.created_at as string,
      user_email: event.user_id ? emailMap.get(event.user_id as string) ?? null : null,
      detail:
        event.event_name === 'campaign_created'
          ? 'Campaign created'
          : `Campaign updated: ${Array.isArray(props.changed_fields) ? props.changed_fields.join(', ') : 'fields changed'}`,
      status: event.event_name === 'campaign_created' ? 'created' : 'updated',
      order_id: null,
      code_or_label: typeof props.code === 'string' ? props.code : null,
    });
  }

  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ events: rows.slice(0, limit) });
}

export const runtime = 'nodejs';
