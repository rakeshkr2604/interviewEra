import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { resolveResumeReviewQuota } from '@/lib/resume-review/quota';
import { ResumeReviewClient, type ResumeReviewRequestView, type ResumeOption } from './ResumeReviewClient';

export const metadata: Metadata = privatePageMetadata({
  title: 'Resume review',
  description: 'Request a 1:1 human resume review session — a Starter/Pro perk.',
  path: '/resume-review',
});

export const dynamic = 'force-dynamic';

export default async function ResumeReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/resume-review');

  const serviceClient = createServiceClient();
  const quotaResult = await resolveResumeReviewQuota(serviceClient, user.id);

  const [{ data: requestRows }, { data: resumeRows }] = await Promise.all([
    serviceClient
      .from('resume_review_requests')
      .select('id, resume_id, status, notes, scheduled_at, completed_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    serviceClient
      .from('resumes')
      .select('id, created_at, is_primary, storage_path')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const initialRequests: ResumeReviewRequestView[] = (requestRows ?? []).map((row) => ({
    id: row.id as string,
    resumeId: (row.resume_id as string | null) ?? null,
    status: row.status as ResumeReviewRequestView['status'],
    notes: (row.notes as string | null) ?? null,
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }));

  const resumes: ResumeOption[] = (resumeRows ?? [])
    .filter((r) => typeof r.storage_path === 'string' && (r.storage_path as string).trim().length > 0)
    .map((r) => ({
      id: r.id as string,
      createdAt: r.created_at as string,
      isPrimary: Boolean(r.is_primary),
    }));

  return (
    <ResumeReviewClient
      initialQuota={quotaResult.ok ? quotaResult.quota : null}
      initialRequests={initialRequests}
      resumes={resumes}
    />
  );
}
