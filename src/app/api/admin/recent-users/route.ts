/**
 * GET /api/admin/recent-users?page=1&limit=20
 *
 * Paginated user table enriched with interview count and last-seen timestamp.
 * Sorted by most recently registered.
 *
 * Secured: platform admin (ADMIN_EMAILS) only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export interface RecentUser {
  id:               string;
  email:            string;
  name:             string | null;
  plan_tier:        string;
  credits_remaining: number;
  created_at:       string;
  interviews_count: number;
  last_seen_at:     string | null;
  is_online:        boolean;
}

export async function GET(request: NextRequest) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;
  void admin;

  const url   = request.nextUrl;
  const page  = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1',  10));
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10));
  const offset = (page - 1) * limit;

  const fresh = url.searchParams.get('fresh') === '1';
  void fresh; // no cache on this route — results are page-specific; fresh flag accepted but ignored

  try {
    const svc = createServiceClient();

    // Paginated users
    const { data: users, count } = await svc
      .from('users')
      .select('id, email, name, plan_tier, credits_remaining, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!users || users.length === 0) {
      return NextResponse.json({ users: [], total: count ?? 0, page, limit, total_pages: 0 });
    }

    const userIds = users.map((u) => u.id);
    const now = Date.now();

    // Fetch activity + interview counts in parallel
    const [{ data: activities }, { data: interviews }] = await Promise.all([
      svc.from('user_activity')
        .select('user_id, last_seen_at')
        .in('user_id', userIds),
      svc.from('interviews')
        .select('user_id')
        .in('user_id', userIds),
    ]);

    const activityMap = new Map(
      (activities ?? []).map((a) => [a.user_id, a.last_seen_at as string]),
    );
    const interviewCounts = new Map<string, number>();
    for (const iv of interviews ?? []) {
      interviewCounts.set(iv.user_id, (interviewCounts.get(iv.user_id) ?? 0) + 1);
    }

    const enriched: RecentUser[] = users.map((u) => {
      const lastSeen = activityMap.get(u.id) ?? null;
      const diffMs   = lastSeen ? now - new Date(lastSeen).getTime() : null;
      return {
        id:               u.id,
        email:            u.email,
        name:             u.name,
        plan_tier:        u.plan_tier,
        credits_remaining: u.credits_remaining,
        created_at:       u.created_at,
        interviews_count: interviewCounts.get(u.id) ?? 0,
        last_seen_at:     lastSeen,
        is_online:        diffMs !== null && diffMs < 5 * 60_000,
      };
    });

    return NextResponse.json({
      users:       enriched,
      total:       count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    });
  } catch (err) {
    console.error('[admin/recent-users] Error:', err);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
