/**
 * Cron: /api/cron/feedback-retry
 *
 * Retries failed or orphaned feedback email deliveries with exponential backoff.
 * Scheduled in vercel.json to run every 5 minutes.
 *
 * Backoff schedule (based on `email_attempts`):
 *   0 – 1 attempts  →  retry after  1 min
 *   2 attempts      →  retry after  5 min
 *   3 attempts      →  retry after 15 min
 *   4 attempts      →  retry after  1 hr
 *   ≥5 attempts     →  no more retries (permanently failed)
 *
 * Concurrency safety:
 *   email-sender's `claimEmailRow` transitions each row pending|failed → retrying
 *   with an optimistic-lock WHERE clause, so overlapping cron invocations can
 *   never double-send the same submission.
 *
 * Stuck-row recovery:
 *   Any row left in 'retrying' for > 10 minutes (e.g. from a crashed invocation)
 *   is reset to 'failed' at the top of each run so it re-enters the retry queue.
 */

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  sendFeedbackEmail,
  isReadyForRetry,
  MAX_EMAIL_ATTEMPTS,
} from '@/lib/feedback/email-sender';
import type { FeedbackPayload } from '@/lib/email/feedback-notification';

// ─── Local DB row type ────────────────────────────────────────────────────────
// The project doesn't have a generated Supabase types file, so we declare the
// shape we need explicitly. Only the columns we SELECT are listed here.

interface FeedbackRetryRow {
  id: string;
  name: string | null;
  email: string | null;
  user_id: string | null;
  rating: number;
  liked_text: string | null;
  confusion_text: string | null;
  bugs_text: string | null;
  would_use_again: boolean | null;
  page_url: string | null;
  browser_info: string | null;
  screenshot_url: string | null;
  created_at: string;
  email_status: string;
  email_attempts: number;
  last_email_attempt_at: string | null;
}

/** Columns to SELECT when reconstructing FeedbackPayload from the DB row. */
const FEEDBACK_SELECT = [
  'id',
  'name',
  'email',
  'user_id',
  'rating',
  'liked_text',
  'confusion_text',
  'bugs_text',
  'would_use_again',
  'page_url',
  'browser_info',
  'screenshot_url',
  'created_at',
  'email_status',
  'email_attempts',
  'last_email_attempt_at',
].join(', ');

/** Rows stuck in 'retrying' longer than this are reset to 'failed'. */
const STUCK_RETRYING_WINDOW_MS = 10 * 60 * 1000; // 10 min

/** Maximum rows processed in a single cron invocation (keeps runs short). */
const MAX_BATCH_SIZE = 10;

export async function GET(request: Request): Promise<NextResponse> {
  // ── Authorization ──────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/feedback-retry] CRON_SECRET env var not set');
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();

  // ── 1. Reset stuck 'retrying' rows ────────────────────────────────────────
  // Rows can get stuck if a previous invocation crashed mid-send.
  // Resetting them to 'failed' re-queues them for the next retry window.
  const stuckCutoff = new Date(Date.now() - STUCK_RETRYING_WINDOW_MS).toISOString();
  const { data: resetRows } = await service
    .from('feedbacks')
    .update({ email_status: 'failed' })
    .eq('email_status', 'retrying')
    .lt('last_email_attempt_at', stuckCutoff)
    .select('id');

  const stuckReset = resetRows?.length ?? 0;
  if (stuckReset > 0) {
    console.info(`[cron/feedback-retry] Reset ${stuckReset} stuck retrying → failed`);
  }

  // ── 2. Fetch failed rows eligible for retry ────────────────────────────────
  const { data: failedRows, error: failedErr } = await service
    .from('feedbacks')
    .select(FEEDBACK_SELECT)
    .eq('email_status', 'failed')
    .lt('email_attempts', MAX_EMAIL_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH_SIZE * 2); // over-fetch; JS filters by backoff below

  if (failedErr) {
    console.error('[cron/feedback-retry] Failed to fetch failed rows:', failedErr.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // ── 3. Fetch pending orphans ───────────────────────────────────────────────
  // Rows stuck in 'pending' are submissions where the API route inserted the
  // row but the process was killed before sendFeedbackEmail could run.
  // Treat any 'pending' row older than 2 minutes as an orphan.
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: pendingOrphans, error: pendingErr } = await service
    .from('feedbacks')
    .select(FEEDBACK_SELECT)
    .eq('email_status', 'pending')
    .lt('created_at', twoMinsAgo)
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH_SIZE);

  if (pendingErr) {
    console.error('[cron/feedback-retry] Failed to fetch pending orphans:', pendingErr.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // ── 4. Merge + filter by backoff ──────────────────────────────────────────
  // Cast through unknown since the Supabase client types the result as a union
  // with error types when no generated schema is present.
  const allCandidates = [
    ...((failedRows ?? []) as unknown as FeedbackRetryRow[]),
    ...((pendingOrphans ?? []) as unknown as FeedbackRetryRow[]),
  ];

  const retryable = allCandidates
    .filter((row) => isReadyForRetry(row.email_attempts, row.last_email_attempt_at))
    .slice(0, MAX_BATCH_SIZE);

  if (retryable.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, sent: 0, failed: 0, stuckReset });
  }

  console.info(`[cron/feedback-retry] Processing ${retryable.length} row(s)`);

  // ── 5. Attempt delivery for each row ──────────────────────────────────────
  let sent = 0;
  let failed = 0;

  for (const row of retryable) {
    // Reconstruct FeedbackPayload from the DB row.
    // screenshot_url is already a long-lived signed URL created at submit time.
    const payload: FeedbackPayload = {
      name: row.name ?? '',
      email: row.email ?? '',
      userId: row.user_id ?? null,
      rating: row.rating,
      likedText: row.liked_text ?? '',
      confusionText: row.confusion_text ?? '',
      bugsText: row.bugs_text ?? '',
      wouldUseAgain: row.would_use_again ?? null,
      pageUrl: row.page_url ?? '',
      browserInfo: row.browser_info ?? '',
      screenshotUrl: row.screenshot_url ?? null,
      createdAt: new Date(row.created_at),
    };

    const ok = await sendFeedbackEmail(service, row.id, payload, row.email_attempts);
    if (ok) {
      sent++;
    } else {
      failed++;
    }
  }

  console.info(
    `[cron/feedback-retry] Finished — sent=${sent} failed=${failed} stuckReset=${stuckReset}`,
  );

  return NextResponse.json({
    ok: true,
    processed: retryable.length,
    sent,
    failed,
    stuckReset,
  });
}
