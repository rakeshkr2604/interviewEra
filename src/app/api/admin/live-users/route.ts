/**
 * GET /api/admin/live-users
 *
 * Returns users with heartbeat activity in the last 5 minutes,
 * enriched with profile data.
 * Cached in-process for 30 seconds.
 *
 * Secured: platform admin (ADMIN_EMAILS) only.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getCached, setCached } from '@/lib/admin/cache';

const CACHE_KEY = 'admin:live-users';
const CACHE_TTL = 30_000; // 30 seconds

export interface LiveUser {
  user_id:      string;
  email:        string;
  name:         string | null;
  plan_tier:    string;
  last_seen_at: string;
  current_page: string | null;
  is_online:    boolean;   // heartbeat within 5 min
  seconds_ago:  number;
}

export async function GET(request: Request) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;
  void admin;

  const fresh = new URL(request.url).searchParams.get('fresh') === '1';
  if (!fresh) {
    const cached = getCached<{ users: LiveUser[] }>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const svc = createServiceClient();
    const now = Date.now();
    const fiveMinAgo = new Date(now - 5 * 60_000).toISOString();

    const { data: activities, error: actErr } = await svc
      .from('user_activity')
      .select('user_id, last_seen_at, current_page')
      .gte('last_seen_at', fiveMinAgo)
      .order('last_seen_at', { ascending: false })
      .limit(100);

    if (actErr) throw actErr;
    if (!activities || activities.length === 0) {
      const result = { users: [] };
      setCached(CACHE_KEY, result, CACHE_TTL);
      return NextResponse.json(result);
    }

    const userIds = activities.map((a) => a.user_id);
    const { data: profiles } = await svc
      .from('users')
      .select('id, email, name, plan_tier')
      .in('id', userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const users: LiveUser[] = activities.map((a) => {
      const p = profileMap.get(a.user_id);
      const diffMs = now - new Date(a.last_seen_at).getTime();
      return {
        user_id:      a.user_id,
        email:        p?.email ?? 'unknown',
        name:         p?.name ?? null,
        plan_tier:    p?.plan_tier ?? 'free',
        last_seen_at: a.last_seen_at,
        current_page: a.current_page,
        is_online:    diffMs < 5 * 60_000,
        seconds_ago:  Math.floor(diffMs / 1000),
      };
    });

    const result = { users };
    setCached(CACHE_KEY, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[admin/live-users] Error:', err);
    return NextResponse.json({ error: 'Failed to load live users' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
