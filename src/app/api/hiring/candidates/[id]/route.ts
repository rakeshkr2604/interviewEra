import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { isHiringAuthError, requireHiringAuth } from '@/lib/hiring/api-auth';
import { canMoveToStage, isHiringStage } from '@/lib/hiring/pipeline';
import { mapCandidateRow } from '@/lib/hiring/types';

const patchSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  roleTitle: z.string().trim().max(120).optional().nullable().or(z.literal('')),
  stage: z.string().optional(),
  score: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().trim().max(2000).optional().nullable().or(z.literal('')),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireHiringAuth();
  if (isHiringAuthError(auth)) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing candidate id.' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid update.' },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  const { data: existing, error: loadError } = await service
    .from('hiring_candidates')
    .select('*')
    .eq('id', id)
    .eq('org_id', auth.org.id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
  }

  if (parsed.data.stage !== undefined) {
    if (!isHiringStage(parsed.data.stage)) {
      return NextResponse.json({ error: 'Invalid pipeline stage.' }, { status: 400 });
    }
    if (!isHiringStage(existing.stage) || !canMoveToStage(existing.stage, parsed.data.stage)) {
      return NextResponse.json({ error: 'Invalid stage transition.' }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.fullName !== undefined) updates.full_name = parsed.data.fullName;
  if (parsed.data.email !== undefined) {
    updates.email = parsed.data.email === '' || parsed.data.email === null ? null : parsed.data.email;
  }
  if (parsed.data.roleTitle !== undefined) {
    updates.role_title =
      parsed.data.roleTitle === '' || parsed.data.roleTitle === null ? null : parsed.data.roleTitle;
  }
  if (parsed.data.stage !== undefined) updates.stage = parsed.data.stage;
  if (parsed.data.score !== undefined) updates.score = parsed.data.score;
  if (parsed.data.notes !== undefined) {
    updates.notes = parsed.data.notes === '' || parsed.data.notes === null ? null : parsed.data.notes;
  }

  const { data, error } = await service
    .from('hiring_candidates')
    .update(updates)
    .eq('id', id)
    .eq('org_id', auth.org.id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[hiring/candidates] patch failed', error?.message);
    return NextResponse.json({ error: 'Failed to update candidate.' }, { status: 500 });
  }

  return NextResponse.json({ candidate: mapCandidateRow(data) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const auth = await requireHiringAuth();
  if (isHiringAuthError(auth)) return auth;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing candidate id.' }, { status: 400 });
  }

  const service = createServiceClient();
  const { error, count } = await service
    .from('hiring_candidates')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('org_id', auth.org.id);

  if (error) {
    console.error('[hiring/candidates] delete failed', error.message);
    return NextResponse.json({ error: 'Failed to delete candidate.' }, { status: 500 });
  }

  if (!count) {
    return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
