/**
 * Cron: retry failed feedback notification emails.
 * Schedule: every 15 minutes (vercel.json).
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { retryFailedFeedbackEmails } from '@/lib/feedback/retry-failed-emails';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const svc = createServiceClient();
    const summary = await retryFailedFeedbackEmails(svc);
    console.info(
      `[cron/feedback-retry] retried=${summary.retried} sent=${summary.sent} failed=${summary.failed}`,
    );
    return NextResponse.json(summary);
  } catch (err) {
    console.error('[cron/feedback-retry] Error:', err);
    return NextResponse.json({ error: 'Retry failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
