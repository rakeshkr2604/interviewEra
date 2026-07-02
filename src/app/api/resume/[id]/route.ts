import { NextResponse } from 'next/server';
import { trackResumeDeletedServer } from '@/lib/analytics/resume-analytics-server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext): Promise<NextResponse> {
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
      .select('id, user_id, file_url')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[resume/delete] fetch error:', fetchError.message);
      return NextResponse.json({ error: 'Failed to verify resume.' }, { status: 500 });
    }

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
    }

    const { count: activeInterviewCount } = await serviceClient
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('resume_id', resumeId)
      .neq('status', 'completed');

    if ((activeInterviewCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a resume linked to an in-progress interview.' },
        { status: 409 },
      );
    }

    const { error: deleteError } = await serviceClient
      .from('resumes')
      .delete()
      .eq('id', resumeId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[resume/delete] delete error:', deleteError.message);
      return NextResponse.json({ error: 'Failed to delete resume.' }, { status: 500 });
    }

    trackResumeDeletedServer({
      user_id: user.id,
      resume_id: resumeId,
      source: 'api_resume_delete',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[resume/delete] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
