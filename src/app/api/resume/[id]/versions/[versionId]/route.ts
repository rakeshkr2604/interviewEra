import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import {
  resumeFileDownloadPath,
  resumeHasFile,
} from '@/lib/resume/resume-file-access';

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

/**
 * GET /api/resume/:id/versions/:versionId
 * Immutable version payload for review UI.
 *
 * File access: use `fileDownloadPath` → GET that path for a short-lived signed URL.
 * Do not treat `fileUrl` as an access mechanism (deprecated public URL).
 */
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: resumeId, versionId } = await context.params;
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
      .select('id, current_version_id, is_primary, lifecycle_status, deleted_at')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!resume || resume.deleted_at) {
      return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
    }

    const { data: version, error } = await serviceClient
      .from('resume_versions')
      .select(
        'id, resume_id, version_number, upload_id, source, parser_version, storage_path, file_url, raw_text, parsed_data, skills_extracted, jd_text_hash, created_at',
      )
      .eq('id', versionId)
      .eq('resume_id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[resume/version] fetch', error.message);
      return NextResponse.json({ error: 'Failed to load version.' }, { status: 500 });
    }
    if (!version) {
      return NextResponse.json({ error: 'Version not found.' }, { status: 404 });
    }

    const parsed = coerceParsedResume(version.parsed_data);
    const hasFile = resumeHasFile(version.storage_path as string | null);

    return NextResponse.json({
      resumeId,
      isPrimary: Boolean(resume.is_primary),
      lifecycleStatus: resume.lifecycle_status,
      isCurrent: resume.current_version_id === version.id,
      version: {
        id: version.id,
        versionNumber: version.version_number,
        uploadId: version.upload_id,
        source: version.source,
        parserVersion: version.parser_version,
        hasFile,
        /** Call this path when the client needs bytes — do not mint signed URLs here. */
        fileDownloadPath: hasFile ? resumeFileDownloadPath(resumeId) : null,
        /**
         * @deprecated Durable public Storage URL. Kept for backward compatibility only.
         * Prefer `fileDownloadPath` → GET /api/resume/:id/file.
         */
        fileUrl: version.file_url,
        // raw_text available for review but truncated in list UIs — full here for editor
        rawText: version.raw_text,
        parsed,
        skillsExtracted: version.skills_extracted ?? [],
        jdTextHash: version.jd_text_hash,
        createdAt: version.created_at,
      },
    });
  } catch (err) {
    console.error('[resume/version] unexpected', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
