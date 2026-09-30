/**
 * GET /api/cron/abandon-stale-interviews
 *
 * Abandons V2.1 pending/in_progress interviews whose last activity is older
 * than 45 minutes (same policy as create_interview_with_credit / migration 096).
 * Attempts durable interview_abandoned milestones for each transitioned row.
 * No credit refund. Idempotent. Milestone persistence failure does not fail
 * a successful abandonment batch.
 *
 * vercel.json: once daily (Hobby plan forbids sub-daily crons). Start-path
 * stale cleanup still runs on every new interview create.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { abandonStaleActiveInterviews } from '@/lib/interview/abandon-stale-active-interviews';

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceClient();
  try {
    const result = await abandonStaleActiveInterviews(svc);
    if (!result.ok) {
      console.error('[cron:abandon-stale-interviews] failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    console.info('[cron:abandon-stale-interviews]', {
      abandoned: result.abandoned,
      milestoneAttempts: result.milestoneAttempts,
      milestoneFailures: result.milestoneFailures,
    });
    return NextResponse.json({
      ok: true,
      abandoned: result.abandoned,
      milestoneAttempts: result.milestoneAttempts,
      milestoneFailures: result.milestoneFailures,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron:abandon-stale-interviews] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
