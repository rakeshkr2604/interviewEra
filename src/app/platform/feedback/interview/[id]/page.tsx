import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { AdminInterviewInvestigationCenter } from '@/components/platform/AdminInterviewInvestigationCenter';
import { isPlatformAdminUser } from '@/lib/admin/auth';
import {
  isInterviewId,
  loadAdminInterviewReview,
} from '@/lib/admin/interview-review';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const metadata: Metadata = privatePageMetadata({
  title: 'Interview investigation',
  description: 'Platform admin interview investigation and resolution center.',
  path: '/platform/feedback/interview',
});

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ feedbackId?: string }>;
}

export default async function PlatformFeedbackInterviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { feedbackId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense-in-depth (layout already gates). Identical not-found for
  // unauthorized and missing interviews — do not leak existence.
  if (!user) {
    redirect(`/login?next=/platform/feedback/interview/${encodeURIComponent(id)}`);
  }
  const allowed = await isPlatformAdminUser(user.id, user.email);
  if (!allowed || !isInterviewId(id)) {
    notFound();
  }

  let review;
  try {
    const service = createServiceClient();
    review = await loadAdminInterviewReview(service, id);
  } catch {
    notFound();
  }

  if (!review) {
    notFound();
  }

  return (
    <AdminInterviewInvestigationCenter
      review={review}
      feedbackId={typeof feedbackId === 'string' && feedbackId.length <= 80 ? feedbackId : null}
    />
  );
}
