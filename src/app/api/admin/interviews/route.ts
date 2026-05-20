/**
 * GET /api/admin/interviews
 *
 * Returns interview analytics including daily chart data (last 30 days),
 * status breakdown, and top-10 roles by volume.
 * Cached in-process for 60 seconds — 30-day chart changes very slowly.
 *
 * Secured: platform admin (ADMIN_EMAILS) only.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getCached, setCached } from '@/lib/admin/cache';

const CACHE_KEY = 'admin:interviews';
const CACHE_TTL = 60_000; // 60 seconds

export interface DailyCount {
  date:  string;
  count: number;
}

export interface InterviewStats {
  chart_data: DailyCount[];
  by_status:  { completed: number; in_progress: number; abandoned: number };
  top_roles:  { role: string; count: number }[];
}

export async function GET(request: Request) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;
  void admin;

  const fresh = new URL(request.url).searchParams.get('fresh') === '1';
  if (!fresh) {
    const cached = getCached<InterviewStats>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const svc = createServiceClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();

    const { data: interviews, error: ivErr } = await svc
      .from('interviews')
      .select('started_at, status, role')
      .gte('started_at', thirtyDaysAgo)
      .order('started_at', { ascending: false });

    if (ivErr) throw ivErr;

    const rows = interviews ?? [];
    const dailyMap: Record<string, number> = {};
    const statusCounts = { completed: 0, in_progress: 0, abandoned: 0 };
    const roleCounts: Record<string, number> = {};

    for (const iv of rows) {
      if (iv.started_at) {
        const date = (iv.started_at as string).slice(0, 10);
        dailyMap[date] = (dailyMap[date] ?? 0) + 1;
      }
      const status = iv.status as string;
      if (status === 'completed' || status === 'in_progress' || status === 'abandoned') {
        statusCounts[status]++;
      }
      if (iv.role) {
        roleCounts[iv.role as string] = (roleCounts[iv.role as string] ?? 0) + 1;
      }
    }

    const chartData: DailyCount[] = [];
    for (let i = 29; i >= 0; i--) {
      const d    = new Date(Date.now() - i * 24 * 60 * 60_000);
      const date = d.toISOString().slice(0, 10);
      chartData.push({ date, count: dailyMap[date] ?? 0 });
    }

    const topRoles = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const result: InterviewStats = {
      chart_data: chartData,
      by_status:  statusCounts,
      top_roles:  topRoles,
    };

    setCached(CACHE_KEY, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin/interviews] Error:', err);
    return NextResponse.json({ error: 'Failed to load interview data' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
