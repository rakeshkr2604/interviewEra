/**
 * GET /api/admin/interviews/[id]
 *
 * Read-only platform-admin interview inspection (questions, answers, report summary).
 * Does not resume, score, complete, abandon, or touch credits.
 *
 * Auth: requirePlatformAdmin before any service-role reads.
 * Nonexistent interviews → 404 (only after admin auth).
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  isInterviewId,
  loadAdminInterviewReview,
} from '@/lib/admin/interview-review';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;
  void admin;

  const { id } = await context.params;
  if (!isInterviewId(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const service = createServiceClient();
    const review = await loadAdminInterviewReview(service, id);
    if (!review) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(review, { status: 200 });
  } catch (err) {
    console.error('[admin:interview-review] unexpected error', {
      interviewId: id,
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
