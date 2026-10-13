/**
 * Founder growth metrics — acquisition, retention, revenue, referrals.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeConversionFunnelMetrics,
  type ConversionFunnelMetrics,
} from '@/lib/admin/conversion-funnel-metrics';
import { chunkIds } from '@/lib/dashboard/id-chunks';

export interface RetentionCohort {
  label: string;
  rate_pct: number;
  cohort_size: number;
  retained: number;
}

export interface GrowthMetricsResult {
  range_days: number;
  wau: number;
  mau: number;
  retention: RetentionCohort[];
  referrals: {
    total_credited: number;
    pending: number;
    credits_issued: number;
  };
  revenue: {
    pricing_page_views: number;
    checkout_started: number;
    payments_captured: number;
    conversion_rate_pct: number | null;
    revenue_inr: number;
  };
  conversion: ConversionFunnelMetrics;
  feedback: {
    submissions: number;
    avg_rating: number | null;
    avg_nps: number | null;
    failed_emails: number;
  };
  generated_at: string;
}

function pct(n: number, d: number): number | null {
  if (d <= 0) return null;
  return Math.round((n / d) * 1000) / 10;
}

async function countActiveSince(svc: SupabaseClient, sinceIso: string): Promise<number> {
  const { count } = await svc
    .from('user_activity')
    .select('user_id', { count: 'exact', head: true })
    .gte('last_seen_at', sinceIso);
  return count ?? 0;
}

/**
 * D{n} retention: users who signed up in [now-(n+7)d, now-n d) and returned
 * within n days via user_activity.last_seen_at or an interview started_at.
 * Set-based: one activity fetch + one interviews fetch (chunked), not N+1.
 */
export async function computeRetention(
  svc: SupabaseClient,
  days: number,
): Promise<RetentionCohort> {
  const msDay = 24 * 60 * 60 * 1000;
  const cohortStart = new Date(Date.now() - (days + 7) * msDay);
  const cohortEnd = new Date(Date.now() - days * msDay);

  const { data: cohort } = await svc
    .from('users')
    .select('id, created_at')
    .gte('created_at', cohortStart.toISOString())
    .lt('created_at', cohortEnd.toISOString());

  const users = (cohort ?? []).map((u) => ({
    id: u.id as string,
    created_at: u.created_at as string,
  }));
  if (users.length === 0) {
    return { label: `D${days}`, rate_pct: 0, cohort_size: 0, retained: 0 };
  }

  const lastSeenByUser = new Map<string, number>();
  for (const chunk of chunkIds(users.map((u) => u.id))) {
    const { data: activity } = await svc
      .from('user_activity')
      .select('user_id, last_seen_at')
      .in('user_id', chunk);
    for (const row of activity ?? []) {
      if (!row.last_seen_at) continue;
      lastSeenByUser.set(row.user_id as string, new Date(row.last_seen_at as string).getTime());
    }
  }

  const retainedByActivity = new Set<string>();
  const needInterviewCheck: { id: string; created: number; windowEnd: number }[] = [];
  for (const u of users) {
    const created = new Date(u.created_at).getTime();
    const windowEnd = created + days * msDay;
    const lastSeen = lastSeenByUser.get(u.id);
    if (lastSeen != null && lastSeen <= windowEnd && lastSeen > created) {
      retainedByActivity.add(u.id);
    } else {
      needInterviewCheck.push({ id: u.id, created, windowEnd });
    }
  }

  const retainedByInterview = new Set<string>();
  if (needInterviewCheck.length > 0) {
    const minCreated = Math.min(...needInterviewCheck.map((u) => u.created));
    const maxWindowEnd = Math.max(...needInterviewCheck.map((u) => u.windowEnd));
    const windows = new Map(needInterviewCheck.map((u) => [u.id, u]));

    for (const chunk of chunkIds(needInterviewCheck.map((u) => u.id))) {
      const { data: interviews } = await svc
        .from('interviews')
        .select('user_id, started_at')
        .in('user_id', chunk)
        .gte('started_at', new Date(minCreated).toISOString())
        .lte('started_at', new Date(maxWindowEnd).toISOString());
      for (const row of interviews ?? []) {
        const uid = row.user_id as string;
        if (retainedByInterview.has(uid)) continue;
        const window = windows.get(uid);
        if (!window || !row.started_at) continue;
        const started = new Date(row.started_at as string).getTime();
        if (started >= window.created && started <= window.windowEnd) {
          retainedByInterview.add(uid);
        }
      }
    }
  }

  const retained = retainedByActivity.size + retainedByInterview.size;
  return {
    label: `D${days}`,
    rate_pct: pct(retained, users.length) ?? 0,
    cohort_size: users.length,
    retained,
  };
}

export async function computeGrowthMetrics(
  svc: SupabaseClient,
  rangeDays: number,
  options?: { sinceIso?: string; untilIso?: string },
): Promise<GrowthMetricsResult> {
  const sinceIso =
    options?.sinceIso ?? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
  const untilIso = options?.untilIso;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const withUntil = <T extends { lte: (col: string, val: string) => T }>(q: T): T =>
    untilIso ? q.lte('created_at', untilIso) : q;

  const [
    wau,
    mau,
    d1,
    d7,
    d30,
    creditedReferrals,
    pendingReferrals,
    pricingViews,
    paymentsCaptured,
    revenueRows,
    feedbackRows,
    failedEmails,
    conversion,
  ] = await Promise.all([
    countActiveSince(svc, weekAgo),
    countActiveSince(svc, monthAgo),
    computeRetention(svc, 1),
    computeRetention(svc, 7),
    computeRetention(svc, 30),
    svc.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'credited'),
    svc.from('referrals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    withUntil(
      svc
        .from('product_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_name', 'pricing_page_viewed')
        .gte('created_at', sinceIso),
    ),
    withUntil(
      svc
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'paid')
        .gte('created_at', sinceIso),
    ),
    withUntil(
      svc
        .from('payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', sinceIso),
    ),
    withUntil(
      svc
        .from('feedbacks')
        .select('rating, nps_score')
        .gte('created_at', sinceIso),
    ),
    svc
      .from('feedbacks')
      .select('id', { count: 'exact', head: true })
      .eq('email_status', 'failed'),
    computeConversionFunnelMetrics(svc, sinceIso, untilIso),
  ]);

  const payments = paymentsCaptured.count ?? 0;
  const pricing = pricingViews.count ?? 0;

  const feedbackList = feedbackRows.data ?? [];
  const ratings = feedbackList
    .map((r) => (r.rating === null ? null : Number(r.rating)))
    .filter((n): n is number => n !== null && Number.isFinite(n));
  const npsScores = feedbackList
    .map((r) => (r.nps_score === null ? null : Number(r.nps_score)))
    .filter((n): n is number => n !== null && Number.isFinite(n));

  const revenueInr = ((revenueRows.data ?? []) as { amount: number | null }[]).reduce(
    (s, r) => s + (r.amount ?? 0),
    0,
  ) / 100;

  const credited = creditedReferrals.count ?? 0;

  let referrerCredits = 1;
  let referredCredits = 1;
  try {
    const { data: settings } = await svc
      .from('platform_reward_settings')
      .select('referrer_credits, referred_credits')
      .eq('id', 1)
      .maybeSingle();
    if (settings) {
      referrerCredits = Number(settings.referrer_credits) || 1;
      referredCredits = Number(settings.referred_credits) || 1;
    }
  } catch {
    /* table may not exist pre-migration — keep 1+1 */
  }

  return {
    range_days: rangeDays,
    wau,
    mau,
    retention: [d1, d7, d30],
    referrals: {
      total_credited: credited,
      pending: pendingReferrals.count ?? 0,
      credits_issued: credited * (referrerCredits + referredCredits),
    },
    revenue: {
      pricing_page_views: pricing,
      checkout_started:
        conversion.steps.find((item) => item.key === 'checkout_started')?.count ?? 0,
      payments_captured: payments,
      conversion_rate_pct: pct(payments, pricing),
      revenue_inr: revenueInr,
    },
    conversion,
    feedback: {
      submissions: feedbackList.length,
      avg_rating:
        ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null,
      avg_nps:
        npsScores.length > 0
          ? Math.round((npsScores.reduce((a, b) => a + b, 0) / npsScores.length) * 10) / 10
          : null,
      failed_emails: failedEmails.count ?? 0,
    },
    generated_at: new Date().toISOString(),
  };
}
