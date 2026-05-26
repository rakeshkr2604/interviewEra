/**
 * PATCH /api/admin/feedback/[id]
 *
 * Triage mutations for a single feedback row.
 * Allowed fields: is_read, is_resolved, is_archived, is_pinned, notes, assigned_to.
 * Immutable fields (rating, email, user_id, etc.) are rejected if present in body.
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing feedback ID.' }, { status: 400 });
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

  const { data, error: updateError } = await service
    .from('feedbacks')
    .update(patch)
    .eq('id', id)
    .select('id, is_read, is_resolved, is_archived, is_pinned, notes, assigned_to')
    .single();

  if (updateError) {
    console.error('[admin/feedback/[id]] Update error:', updateError.message);
    if (updateError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Feedback not found.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, row: data });
}
