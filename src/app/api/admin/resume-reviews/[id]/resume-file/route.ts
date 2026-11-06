/**
 * GET /api/admin/resume-reviews/:id/resume-file
 *
 * Redirects to a short-lived signed URL for the resume attached to a resume
 * review request — admin fulfillment only. `:id` is the review request id,
 * not the resume id, so the admin dashboard only ever needs the request id
 * it already has (no separate resume-id exposure needed in the UI).
 *
 * Deliberately NOT the candidate's own /api/resume/:id/file route: that
 * route is ownership-scoped to the requesting user (ownership_mismatch
 * would reject an admin outright). This mints the signed URL using the
 * resume's actual owning user_id, with the admin gate as the auth boundary.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { mintResumeSignedUrl } from '@/lib/resume/signed-file-url';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const { id: requestId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
    return NextResponse.json({ error: 'Invalid request id.' }, { status: 400 });
  }

  const svc = createServiceClient();
  const { data: reviewRequest, error: reqError } = await svc
    .from('resume_review_requests')
    .select('id, resume_id')
    .eq('id', requestId)
    .maybeSingle();

  if (reqError || !reviewRequest) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  }
  if (!reviewRequest.resume_id) {
    return NextResponse.json({ error: 'No resume attached to this request.' }, { status: 404 });
  }

  const { data: resume, error: resumeError } = await svc
    .from('resumes')
    .select('id, user_id, storage_path, deleted_at')
    .eq('id', reviewRequest.resume_id as string)
    .maybeSingle();

  if (resumeError || !resume || resume.deleted_at) {
    return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
  }

  const storagePath = typeof resume.storage_path === 'string' ? resume.storage_path.trim() : '';
  if (!storagePath) {
    return NextResponse.json({ error: 'Resume file is not available.' }, { status: 404 });
  }

  const minted = await mintResumeSignedUrl(svc, {
    storagePath,
    userId: resume.user_id as string,
    resumeId: resume.id as string,
  });

  if (!minted.ok) {
    console.error('[admin/resume-reviews/resume-file] mint failed:', minted.reason, minted.message);
    return NextResponse.json({ error: 'Could not generate a download link.' }, { status: 500 });
  }

  return NextResponse.redirect(minted.signedUrl, { status: 302 });
}

export const runtime = 'nodejs';
