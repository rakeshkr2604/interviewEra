import { redirect } from 'next/navigation';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker';
import { ResumeWorkspaceClient, type ResumeListItem } from '@/components/candidate/ResumeWorkspaceClient';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { createClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata({
  title: 'Resume',
  description: 'Upload, replace, and manage your resume for AI mock interviews.',
  path: '/resume',
});

export const dynamic = 'force-dynamic';

export default async function ResumeWorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('resumes')
    .select('id, status, created_at, parsed_data')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const resumes: ResumeListItem[] = (rows ?? []).map((row) => {
    const parsed =
      row.status === 'parsed' && row.parsed_data ? coerceParsedResume(row.parsed_data) : null;
    return {
      id: row.id as string,
      status: row.status as ResumeListItem['status'],
      createdAt: row.created_at as string,
      parsed,
      parseQuality: parsed?.parse_quality ?? null,
      parseWarning: parsed?.parse_warning ?? null,
    };
  });

  const latestParsed = resumes.find((r) => r.parsed)?.parsed ?? null;

  return (
    <>
      <CandidatePageTracker event="resume_workspace_viewed" />
      <DashboardPageHeader
        eyebrow="Profile"
        title="Resume workspace"
        subtitle="Upload, replace, or delete resumes — parse status and extracted skills update automatically."
      />
      <ResumeWorkspaceClient resumes={resumes} latestParsed={latestParsed} userId={user.id} />
    </>
  );
}
