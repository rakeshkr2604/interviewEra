/**
 * PATCH /api/admin/resume-reviews/:id — move a resume-review request through
 * the fulfillment lifecycle (pending → scheduled → completed, or cancelled).
 *
 * Cancelling frees the candidate's quota slot for this cycle (the quota
 * count excludes 'cancelled' rows) — use for duplicates/mistakes, not for
 * "did the call but ran out of time" (use completed + admin_notes instead).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

const patchSchema = z.object({
  status: z.enum(['pending', 'scheduled', 'completed', 'cancelled']).optional(),
  adminNotes: z.string().trim().max(4000).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid request id.' }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    );
  }
  if (
    parsed.data.status === undefined &&
    parsed.data.adminNotes === undefined &&
    parsed.data.scheduledAt === undefined
  ) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const svc = createServiceClient();
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) {
    payload.status = parsed.data.status;
    payload.completed_at = parsed.data.status === 'completed' ? new Date().toISOString() : null;
  }
  if (parsed.data.adminNotes !== undefined) payload.admin_notes = parsed.data.adminNotes || null;
  if (parsed.data.scheduledAt !== undefined) payload.scheduled_at = parsed.data.scheduledAt;

  const { data: updated, error: updateError } = await svc
    .from('resume_review_requests')
    .update(payload)
    .eq('id', id)
    .select(
      'id, user_id, resume_id, plan_tier, cycle_start, status, notes, admin_notes, scheduled_at, completed_at, created_at, updated_at',
    )
    .maybeSingle();

  if (updateError) {
    console.error('[admin/resume-reviews/:id] update failed:', updateError.message);
    return NextResponse.json({ error: 'Failed to update request.' }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }

  return NextResponse.json({ request: updated });
}

export const runtime = 'nodejs';
