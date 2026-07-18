import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/resume/:id/primary
 * Set this resume as the user's sole primary (powers interviews by default).
 */
export async function POST(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: resumeId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data: resume, error: fetchError } = await serviceClient
      .from('resumes')
      .select('id, status, deleted_at')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to verify resume.' }, { status: 500 });
    }
    if (!resume || resume.deleted_at) {
      return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
    }
    if (resume.status !== 'parsed') {
      return NextResponse.json(
        { error: 'Only a successfully parsed resume can be set as primary.' },
        { status: 422 },
      );
    }

    // Clear other primaries, then set this one (unique partial index)
    const { error: clearErr } = await serviceClient
      .from('resumes')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .is('deleted_at', null);

    if (clearErr) {
      console.error('[resume/primary] clear failed', clearErr.message);
      return NextResponse.json({ error: 'Failed to update primary resume.' }, { status: 500 });
    }

    const { error: setErr } = await serviceClient
      .from('resumes')
      .update({ is_primary: true, lifecycle_status: 'verified' })
      .eq('id', resumeId)
      .eq('user_id', user.id);

    if (setErr) {
      console.error('[resume/primary] set failed', setErr.message);
      return NextResponse.json({ error: 'Failed to set primary resume.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, resumeId, isPrimary: true });
  } catch (err) {
    console.error('[resume/primary] unexpected', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
