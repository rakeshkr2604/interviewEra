import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import {
  resumeFileDownloadPath,
  resumeHasFile,
} from '@/lib/resume/resume-file-access';

/**
 * GET /api/resume
 * List non-deleted resumes with current version summary for Prompt 2 UI.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const { data: rows, error } = await serviceClient
      .from('resumes')
      .select(
        'id, status, lifecycle_status, created_at, parsed_data, is_primary, profile_group, current_version_id, latest_upload_id, storage_path',
      )
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[resume/list]', error.message);
      return NextResponse.json({ error: 'Failed to list resumes.' }, { status: 500 });
    }

    const versionMeta = new Map<
      string,
      { versionNumber: number; source: string; parserVersion: string | null; createdAt: string }
    >();

    const currentVersionIds = (rows ?? [])
      .map((r) => r.current_version_id as string | null)
      .filter((id): id is string => !!id);

    if (currentVersionIds.length > 0) {
      const { data: versions } = await serviceClient
        .from('resume_versions')
        .select('id, resume_id, version_number, source, parser_version, created_at')
        .in('id', currentVersionIds);

      for (const v of versions ?? []) {
        versionMeta.set(v.resume_id as string, {
          versionNumber: Number(v.version_number),
          source: String(v.source),
          parserVersion: (v.parser_version as string | null) ?? null,
          createdAt: String(v.created_at),
        });
      }
    }

    const resumes = (rows ?? []).map((row) => {
      const parsed =
        row.status === 'parsed' && row.parsed_data ? coerceParsedResume(row.parsed_data) : null;
      const meta = versionMeta.get(row.id as string) ?? null;
      const hasFile = resumeHasFile(row.storage_path as string | null);
      return {
        id: row.id as string,
        status: row.status as string,
        lifecycleStatus: (row.lifecycle_status as string) ?? null,
        createdAt: row.created_at as string,
        isPrimary: Boolean(row.is_primary),
        profileGroup: (row.profile_group as string | null) ?? null,
        currentVersionId: (row.current_version_id as string | null) ?? null,
        latestUploadId: (row.latest_upload_id as string | null) ?? null,
        hasFile,
        fileDownloadPath: hasFile ? resumeFileDownloadPath(row.id as string) : null,
        parsed,
        parseQuality: parsed?.parse_quality ?? null,
        parseWarning: parsed?.parse_warning ?? null,
        currentVersion: meta
          ? {
              versionNumber: meta.versionNumber,
              source: meta.source,
              parserVersion: meta.parserVersion,
              createdAt: meta.createdAt,
            }
          : null,
      };
    });

    return NextResponse.json({ resumes });
  } catch (err) {
    console.error('[resume/list] unexpected', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
