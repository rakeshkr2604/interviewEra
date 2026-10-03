/**
 * GET /api/cron/interview-recovery-reminders
 *
 * Daily sweep for unfinished V2.1 interview recovery emails.
 *
 * Sending requires INTERVIEW_RECOVERY_EMAIL_ENABLED=1 AND a non-dry-run request.
 * Dry-run (?dryRun=1) is read-only inventory and works with the flag off.
 * Any other dryRun value is treated as dry-run (fail-closed — never send).
 *
 * vercel.json: once daily (Hobby plan). Does not change interview/credit state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { parseRecoveryCronDryRunParam } from '@/lib/interview/recovery-email-cadence';
import { processInterviewRecoveryReminders } from '@/lib/interview/process-interview-recovery-reminders';

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

  const dryRun = parseRecoveryCronDryRunParam(
    request.nextUrl.searchParams.get('dryRun'),
  );
  const svc = createServiceClient();

  try {
    const stats = await processInterviewRecoveryReminders(svc, { dryRun });
    console.info('[cron:interview-recovery-reminders]', stats);
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron:interview-recovery-reminders] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
