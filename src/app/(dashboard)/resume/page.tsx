import { redirect } from 'next/navigation';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker';
import {
  ResumeWorkspaceClient,
  type WorkspaceResumeItem,
} from '@/components/candidate/ResumeWorkspaceClient';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import type { ResumeLifecycleStatus, ResumeStatus } from '@/types/app.types';

export const metadata = privatePageMetadata({
  title: 'Resume',
  description: 'Upload, review, and manage the resume that powers your AI mock interviews.',
  path: '/resume',
});

export const dynamic = 'force-dynamic';

export default async function ResumeWorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { data: rows } = await serviceClient
    .from('resumes')
    .select(
      'id, status, lifecycle_status, created_at, parsed_data, is_primary, profile_group, current_version_id, latest_upload_id, storage_path, file_url',
    )
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const currentVersionIds = (rows ?? [])
    .map((r) => r.current_version_id as string | null)
    .filter((id): id is string => !!id);

  const versionMeta = new Map<
    string,
    { versionNumber: number; source: string; parserVersion: string | null; createdAt: string }
  >();

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

  const resumes: WorkspaceResumeItem[] = (rows ?? []).map((row) => {
    const parsed =
      row.status === 'parsed' && row.parsed_data ? coerceParsedResume(row.parsed_data) : null;
    const meta = versionMeta.get(row.id as string) ?? null;
    return {
      id: row.id as string,
      status: row.status as ResumeStatus,
      lifecycleStatus: (row.lifecycle_status as ResumeLifecycleStatus | null) ?? null,
      createdAt: row.created_at as string,
      isPrimary: Boolean(row.is_primary),
      profileGroup: (row.profile_group as string | null) ?? null,
      currentVersionId: (row.current_version_id as string | null) ?? null,
      latestUploadId: (row.latest_upload_id as string | null) ?? null,
      hasFile: Boolean(row.storage_path || row.file_url),
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

  return (
    <>
      <CandidatePageTracker event="resume_workspace_viewed" />
      <DashboardPageHeader
        eyebrow="Profile"
        title="Resume workspace"
        subtitle="One primary resume powers your mock interviews — upload, review the extract, then practice."
      />
      <ResumeWorkspaceClient resumes={resumes} userId={user.id} />
    </>
  );
}
