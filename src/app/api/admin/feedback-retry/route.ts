/**
 * POST /api/admin/feedback-retry — retries failed feedback notification emails.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { retryFailedFeedbackEmails } from '@/lib/feedback/retry-failed-emails';

export const runtime = 'nodejs';

export type { RetryResultRow } from '@/lib/feedback/retry-failed-emails';

export async function POST(request: Request): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  let targetIds: string[] | undefined;
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
    if (Array.isArray(body?.ids) && body.ids.every((x) => typeof x === 'string')) {
      targetIds = body.ids as string[];
    }
  } catch {
    /* no body */
  }

  try {
    const service = createServiceClient();
    const summary = await retryFailedFeedbackEmails(service, targetIds);
    console.info(
      `[admin/feedback-retry] Retried ${summary.retried} rows — sent=${summary.sent} failed=${summary.failed}`,
    );
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[admin/feedback-retry] Error:', err);
    return NextResponse.json({ error: 'Failed to load feedback rows.' }, { status: 500 });
  }
}
