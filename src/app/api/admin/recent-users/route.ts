/**
 * GET /api/admin/recent-users?page=1&limit=20&range=all
 * Optional: &from=YYYY-MM-DD&to=YYYY-MM-DD (custom join-date range)
 *
 * Paginated user table enriched with per-user interview stats and last-seen.
 * Sorted by most recently registered.
 *
 * Secured: platform admin (ADMIN_EMAILS / platform_role) only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { parseAdminDateBounds, resolveUsersJoinPreset } from '@/lib/admin/date-range';
import { aggregateInterviewsByUser } from '@/lib/admin/recent-user-interview-stats';

export type RecentUsersRange = 'today' | '7d' | 'month' | 'all' | 'custom';

export interface RecentUser {
  id: string;
  email: string;
  name: string | null;
  plan_tier: string;
  credits_remaining: number;
  created_at: string;
  /** All interviews (any status) for this user. */
  interviews_count: number;
  /**
   * Incomplete interviews (UI: "Incomplete").
   * status IN ('pending', 'in_progress', 'abandoned') — unfinished.
   * Field name kept for API compatibility; not limited to status=pending.
   */
  pending_interviews: number;
  /** status = 'completed' (transactional lifecycle — not product_events). */
  completed_interviews: number;
  /**
   * Most recent interview activity/start (`started_at`, with completed_at
   * fallback only for successful completions missing started_at).
   * Abandoned.completed_at is intentionally not used here.
   */
  last_interview_at: string | null;
  last_seen_at: string | null;
  is_online: boolean;
}

export async function GET(request: NextRequest) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;
  void admin;

  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10));
  const offset = (page - 1) * limit;

  const bounds = parseAdminDateBounds(url.searchParams, {
    defaultPreset: 'all',
    resolvePreset: resolveUsersJoinPreset,
  });
  const range = (bounds.preset ?? 'all') as RecentUsersRange;

  const fresh = url.searchParams.get('fresh') === '1';
  void fresh; // no cache on this route — results are page-specific; fresh flag accepted but ignored

  try {
    const svc = createServiceClient();

    let usersQuery = svc
      .from('users')
      .select('id, email, name, plan_tier, credits_remaining, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (bounds.fromIso) {
      usersQuery = usersQuery.gte('created_at', bounds.fromIso);
    }
    if (bounds.toIso) {
      usersQuery = usersQuery.lte('created_at', bounds.toIso);
    }

    const { data: users, count } = await usersQuery;

    if (!users || users.length === 0) {
      return NextResponse.json({
        users: [],
        total: count ?? 0,
        page,
        limit,
        total_pages: 0,
        range,
        from: bounds.fromIso,
        to: bounds.toIso,
      });
    }

    const userIds = users.map((u) => u.id);
    const now = Date.now();

    // Batched enrich — 2 queries total for the page (not N+1).
    const [{ data: activities }, { data: interviews }] = await Promise.all([
      svc.from('user_activity').select('user_id, last_seen_at').in('user_id', userIds),
      svc
        .from('interviews')
        .select('user_id, status, started_at, completed_at')
        .in('user_id', userIds),
    ]);

    const activityMap = new Map(
      (activities ?? []).map((a) => [a.user_id, a.last_seen_at as string]),
    );

    const interviewAgg = aggregateInterviewsByUser(
      (interviews ?? []).map((iv) => ({
        user_id: iv.user_id as string,
        status: iv.status as string,
        started_at: (iv.started_at as string | null) ?? null,
        completed_at: (iv.completed_at as string | null) ?? null,
      })),
    );

    const enriched: RecentUser[] = users.map((u) => {
      const lastSeen = activityMap.get(u.id) ?? null;
      const diffMs = lastSeen ? now - new Date(lastSeen).getTime() : null;
      const agg = interviewAgg.get(u.id);
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        plan_tier: u.plan_tier,
        credits_remaining: u.credits_remaining,
        created_at: u.created_at,
        interviews_count: agg?.total ?? 0,
        pending_interviews: agg?.pending ?? 0,
        completed_interviews: agg?.completed ?? 0,
        last_interview_at: agg?.lastAt ?? null,
        last_seen_at: lastSeen,
        is_online: diffMs !== null && diffMs < 5 * 60_000,
      };
    });

    return NextResponse.json({
      users: enriched,
      total: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
      range,
      from: bounds.fromIso,
      to: bounds.toIso,
    });
  } catch (err) {
    console.error('[admin/recent-users] Error:', err);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
