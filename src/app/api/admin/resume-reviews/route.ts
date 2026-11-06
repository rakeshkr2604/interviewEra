/**
 * GET /api/admin/resume-reviews — founder fulfillment queue for the paid-tier
 * resume-review perk (Starter 1 / Pro 2 per billing cycle).
 *
 * Query params: status ('pending' | 'scheduled' | 'completed' | 'cancelled' | 'all', default 'pending'),
 * limit (default 50, max 100).
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

const STATUSES = new Set(['pending', 'scheduled', 'completed', 'cancelled']);

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status') ?? 'pending';
  const limitParam = Number(url.searchParams.get('limit') ?? '50');
  const limit = Math.min(100, Math.max(1, Number.isFinite(limitParam) ? limitParam : 50));

  const svc = createServiceClient();
  let query = svc
    .from('resume_review_requests')
    .select(
      'id, user_id, resume_id, plan_tier, cycle_start, status, notes, admin_notes, scheduled_at, completed_at, created_at, updated_at',
    )
    .order('created_at', { ascending: true })
    .limit(limit);

  if (statusParam !== 'all') {
    if (!STATUSES.has(statusParam)) {
      return NextResponse.json({ error: 'Invalid status filter.' }, { status: 400 });
    }
    query = query.eq('status', statusParam);
  }

  const { data: rows, error: listError } = await query;
  if (listError) {
    console.error('[admin/resume-reviews] list failed:', listError.message);
    return NextResponse.json({ error: 'Failed to load requests.' }, { status: 500 });
  }

  const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id as string)));
  const usersById = new Map<string, { email: string | null; name: string | null }>();
  if (userIds.length > 0) {
    const { data: users } = await svc.from('users').select('id, email, name').in('id', userIds);
    for (const u of users ?? []) {
      usersById.set(u.id as string, { email: (u.email as string) ?? null, name: (u.name as string) ?? null });
    }
  }

  const requests = (rows ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    userEmail: usersById.get(row.user_id as string)?.email ?? null,
    userName: usersById.get(row.user_id as string)?.name ?? null,
    resumeId: (row.resume_id as string | null) ?? null,
    planTier: row.plan_tier as string,
    cycleStart: row.cycle_start as string,
    status: row.status as string,
    notes: (row.notes as string | null) ?? null,
    adminNotes: (row.admin_notes as string | null) ?? null,
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));

  return NextResponse.json({ requests });
}

export const runtime = 'nodejs';
