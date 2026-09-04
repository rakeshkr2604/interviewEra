/**
 * PATCH /api/admin/feedback/[id]
 * DELETE /api/admin/feedback/[id]
 *
 * Triage mutations + hard-delete for a single feedback row.
 * Works across both general platform feedbacks and interview_feedbacks tables.
 * PATCH allowed fields: is_read, is_resolved, is_archived, is_pinned, notes, assigned_to.
 * Immutable fields (rating, email, user_id, etc.) are rejected if present in body.
 * DELETE permanently removes the row (for clearing test submissions).
 *
 * Secured: platform admin only.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const ALLOWED_KEYS = new Set([
  'is_read',
  'is_resolved',
  'is_archived',
  'is_pinned',
  'notes',
  'assigned_to',
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseFeedbackId(id: string | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  const trimmed = id.trim();
  return UUID_RE.test(trimmed) ? trimmed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const id = parseFeedbackId((await params).id);
  if (!id) {
    return NextResponse.json({ error: 'Invalid feedback ID.' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Only allow triage fields — never let the caller mutate ratings or user data.
  const patch: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(body)) {
    if (!ALLOWED_KEYS.has(k)) continue;

    if (k === 'notes') {
      if (v !== null && typeof v !== 'string') continue;
      if (typeof v === 'string' && v.length > 5000) continue;
      patch.notes = v === '' ? null : v;
    } else if (k === 'assigned_to') {
      if (v !== null && typeof v !== 'string') continue;
      patch.assigned_to = v || null;
    } else {
      // Boolean triage flags
      if (typeof v !== 'boolean') continue;
      patch[k] = v;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const service = createServiceClient();

  // Try updating feedbacks first
  const { data: generalData, error: updateError } = await service
    .from('feedbacks')
    .update(patch)
    .eq('id', id)
    .select('id, is_read, is_resolved, is_archived, is_pinned, notes, assigned_to')
    .maybeSingle();

  if (generalData) {
    return NextResponse.json({ ok: true, row: generalData });
  }

  if (updateError && updateError.code !== 'PGRST116') {
    console.error('[admin/feedback/[id]] Update general feedback error:', updateError.message);
  }

  // Fallback to updating interview_feedbacks
  const { data: interviewData, error: interviewError } = await service
    .from('interview_feedbacks')
    .update(patch)
    .eq('id', id)
    .select('id, is_read, is_resolved, is_archived, is_pinned, notes')
    .maybeSingle();

  if (interviewData) {
    return NextResponse.json({ ok: true, row: interviewData });
  }

  if (interviewError && interviewError.code !== 'PGRST116') {
    console.error('[admin/feedback/[id]] Update interview feedback error:', interviewError.message);
  }

  // Fallback to updating interview_exit_feedbacks
  const { data: exitData, error: exitError } = await service
    .from('interview_exit_feedbacks')
    .update(patch)
    .eq('id', id)
    .select('id, is_read, is_resolved, is_archived, is_pinned, notes')
    .maybeSingle();

  if (exitData) {
    return NextResponse.json({ ok: true, row: exitData });
  }

  if (exitError) {
    console.error('[admin/feedback/[id]] Update interview exit feedback error:', exitError.message);
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }

  return NextResponse.json({ error: 'Feedback not found.' }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const id = parseFeedbackId((await params).id);
  if (!id) {
    return NextResponse.json({ error: 'Invalid feedback ID.' }, { status: 400 });
  }

  const service = createServiceClient();

  // Try deleting from feedbacks table
  const { data: generalData, error: deleteError } = await service
    .from('feedbacks')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (generalData) {
    return NextResponse.json({ ok: true, id: generalData.id });
  }

  if (deleteError) {
    console.error('[admin/feedback/[id]] Delete general feedback error:', deleteError.message);
    if (deleteError.code === '23503') {
      return NextResponse.json(
        { error: 'Feedback linked to a technical failure case cannot be deleted.' },
        { status: 409 },
      );
    }
  }

  // Fallback to deleting from interview_feedbacks table
  const { data: interviewData, error: interviewDeleteError } = await service
    .from('interview_feedbacks')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (interviewData) {
    return NextResponse.json({ ok: true, id: interviewData.id });
  }

  if (interviewDeleteError) {
    console.error('[admin/feedback/[id]] Delete interview feedback error:', interviewDeleteError.message);
  }

  // Fallback to deleting from interview_exit_feedbacks table
  const { data: exitData, error: exitDeleteError } = await service
    .from('interview_exit_feedbacks')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (exitData) {
    return NextResponse.json({ ok: true, id: exitData.id });
  }

  if (exitDeleteError) {
    console.error('[admin/feedback/[id]] Delete interview exit feedback error:', exitDeleteError.message);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }

  return NextResponse.json({ error: 'Feedback not found.' }, { status: 404 });
}
