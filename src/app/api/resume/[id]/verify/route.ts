import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/resume/:id/verify
 * REVIEW_READY → VERIFIED without field edits (confirm extracted profile).
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
    const { data: resume } = await serviceClient
      .from('resumes')
      .select('id, status, lifecycle_status, current_version_id, deleted_at')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!resume || resume.deleted_at) {
      return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
    }
    if (resume.status !== 'parsed' || !resume.current_version_id) {
      return NextResponse.json({ error: 'Resume is not ready for verification.' }, { status: 422 });
    }

    if (resume.lifecycle_status === 'verified') {
      return NextResponse.json({ ok: true, resumeId, lifecycleStatus: 'verified' });
    }

    const { error } = await serviceClient
      .from('resumes')
      .update({ lifecycle_status: 'verified' })
      .eq('id', resumeId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to verify resume.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, resumeId, lifecycleStatus: 'verified' });
  } catch (err) {
    console.error('[resume/verify] unexpected', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
