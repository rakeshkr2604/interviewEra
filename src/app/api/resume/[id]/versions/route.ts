import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/resume/:id/versions
 * Version history (newest first) for Prompt 2 UI.
 */
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
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
      .select('id, current_version_id, deleted_at')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!resume || resume.deleted_at) {
      return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
    }

    const { data: versions, error } = await serviceClient
      .from('resume_versions')
      .select('id, version_number, source, parser_version, created_at, upload_id')
      .eq('resume_id', resumeId)
      .eq('user_id', user.id)
      .order('version_number', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: 'Failed to list versions.' }, { status: 500 });
    }

    return NextResponse.json({
      resumeId,
      currentVersionId: resume.current_version_id,
      versions: (versions ?? []).map((v) => ({
        id: v.id,
        versionNumber: v.version_number,
        source: v.source,
        parserVersion: v.parser_version,
        uploadId: v.upload_id,
        createdAt: v.created_at,
        isCurrent: v.id === resume.current_version_id,
      })),
    });
  } catch (err) {
    console.error('[resume/versions] unexpected', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
