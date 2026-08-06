import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { isHiringAuthError, requireHiringAuth } from '@/lib/hiring/api-auth';
import { isHiringStage } from '@/lib/hiring/pipeline';
import { mapCandidateRow } from '@/lib/hiring/types';

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal('')),
  roleTitle: z.string().trim().max(120).optional().or(z.literal('')),
  stage: z.string().optional(),
  score: z.number().min(0).max(10).nullable().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export async function GET(): Promise<NextResponse> {
  const auth = await requireHiringAuth();
  if (isHiringAuthError(auth)) return auth;

  const service = createServiceClient();
  const { data, error } = await service
    .from('hiring_candidates')
    .select('*')
    .eq('org_id', auth.org.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[hiring/candidates] list failed', error.message);
    return NextResponse.json({ error: 'Failed to load candidates.' }, { status: 500 });
  }

  return NextResponse.json({
    org: auth.org,
    candidates: (data ?? []).map(mapCandidateRow),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await requireHiringAuth();
  if (isHiringAuthError(auth)) return auth;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid candidate data.' },
      { status: 400 },
    );
  }

  const stage = parsed.data.stage && isHiringStage(parsed.data.stage) ? parsed.data.stage : 'applied';
  const service = createServiceClient();
  const { data, error } = await service
    .from('hiring_candidates')
    .insert({
      org_id: auth.org.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email?.trim() || null,
      role_title: parsed.data.roleTitle?.trim() || null,
      stage,
      score: parsed.data.score ?? null,
      notes: parsed.data.notes?.trim() || null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[hiring/candidates] create failed', error?.message);
    return NextResponse.json({ error: 'Failed to add candidate.' }, { status: 500 });
  }

  return NextResponse.json({ candidate: mapCandidateRow(data) }, { status: 201 });
}
