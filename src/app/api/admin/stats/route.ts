/**
 * GET /api/admin/stats
 *
 * Returns aggregate platform metrics. All numbers come from live DB queries.
 * Cached in-process for 60 seconds — reduces DB load on repeated loads/refreshes.
 *
 * Secured: platform admin (ADMIN_EMAILS) only.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getCached, setCached } from '@/lib/admin/cache';

const CACHE_KEY = 'admin:stats';
const CACHE_TTL = 60_000; // 60 seconds

export interface PlatformStats {
  total_users:        number;
  online_users:       number;   // heartbeat within last 5 min
  active_5m:          number;
  active_1h:          number;
  active_24h:         number;
  total_interviews:   number;
  interviews_today:   number;
  completed_today:    number;
  api_requests_today: number;
  tokens_today:       number;
  cost_today_usd:     number;
  generated_at:       string;
}

export async function GET(request: Request) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;
  void admin;

  const fresh = new URL(request.url).searchParams.get('fresh') === '1';
  if (!fresh) {
    const cached = getCached<PlatformStats>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const svc = createServiceClient();
    const now = Date.now();
    const todayISO   = new Date().toISOString().slice(0, 10);
    const todayStart = `${todayISO}T00:00:00.000Z`;

    const [
      totalUsers,
      onlineUsers,
      active5m,
      active1h,
      active24h,
      totalInterviews,
      interviewsToday,
      completedToday,
      apiRequestsToday,
      tokensToday,
    ] = await Promise.all([
      svc.from('users').select('id', { count: 'exact', head: true }),

      // "Currently online" = heartbeat within 5 minutes
      svc.from('user_activity')
        .select('user_id', { count: 'exact', head: true })
        .gte('last_seen_at', new Date(now - 5 * 60_000).toISOString()),

      svc.from('user_activity')
        .select('user_id', { count: 'exact', head: true })
        .gte('last_seen_at', new Date(now - 5 * 60_000).toISOString()),

      svc.from('user_activity')
        .select('user_id', { count: 'exact', head: true })
        .gte('last_seen_at', new Date(now - 60 * 60_000).toISOString()),

      svc.from('user_activity')
        .select('user_id', { count: 'exact', head: true })
        .gte('last_seen_at', new Date(now - 24 * 60 * 60_000).toISOString()),

      svc.from('interviews').select('id', { count: 'exact', head: true }),

      svc.from('interviews')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', todayStart),

      svc.from('interviews')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', todayStart)
        .eq('status', 'completed'),

      svc.from('ai_call_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),

      svc.from('ai_call_logs')
        .select('total_tokens, cost_usd')
        .gte('created_at', todayStart),
    ]);

    type TokenRow = { total_tokens: number | null; cost_usd: number | null };
    const tokenRows = (tokensToday.data ?? []) as TokenRow[];
    const tokens = tokenRows.reduce((s, r) => s + (r.total_tokens ?? 0), 0);
    const costUsd = tokenRows.reduce((s, r) => s + (r.cost_usd ?? 0), 0);

    const stats: PlatformStats = {
      total_users:        totalUsers.count        ?? 0,
      online_users:       onlineUsers.count       ?? 0,
      active_5m:          active5m.count          ?? 0,
      active_1h:          active1h.count          ?? 0,
      active_24h:         active24h.count         ?? 0,
      total_interviews:   totalInterviews.count   ?? 0,
      interviews_today:   interviewsToday.count   ?? 0,
      completed_today:    completedToday.count     ?? 0,
      api_requests_today: apiRequestsToday.count  ?? 0,
      tokens_today:       tokens,
      cost_today_usd:     +costUsd.toFixed(4),
      generated_at:       new Date().toISOString(),
    };

    setCached(CACHE_KEY, stats, CACHE_TTL);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[admin/stats] Error:', err);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
