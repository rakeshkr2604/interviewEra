/**
 * POST /api/admin/feedback-retry
 *
 * Retries delivery of feedback notification emails that previously failed.
 * Platform-admin only (ADMIN_EMAILS env var).
 *
 * Body (optional JSON):
 *   { ids?: string[] }   — retry specific rows; omit to retry all failed rows.
 *
 * Response:
 *   { retried: number; sent: number; failed: number; rows: RetryResultRow[] }
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { sendFeedbackEmail } from '@/lib/feedback/email-sender';
import type { FeedbackPayload } from '@/lib/email/feedback-notification';

export const runtime = 'nodejs';

/** Max rows retried in one request — prevents accidental multi-minute runs. */
const BATCH_LIMIT = 25;

interface FeedbackRow {
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
  session_context: Record<string, unknown> | null;
  created_at: string;
  email_attempts: number;
}

export interface RetryResultRow {
  id: string;
  name: string;
  email: string;
  attempts_before: number;
  ok: boolean;
}

export async function POST(request: Request): Promise<NextResponse> {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  // Optional: caller may specify a list of IDs to retry.
  let targetIds: string[] | undefined;
  try {
    const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
    if (Array.isArray(body?.ids) && body.ids.every((x) => typeof x === 'string')) {
      targetIds = body.ids as string[];
    }
  } catch {
    // No body is fine — retry all failed.
  }

  const service = createServiceClient();

  // ── Fetch failed rows ──────────────────────────────────────────────────────
  let query = service
    .from('feedbacks')
    .select(
      'id, name, email, user_id, rating, liked_text, confusion_text, bugs_text, ' +
        'would_use_again, page_url, browser_info, screenshot_url, session_context, created_at, email_attempts',
    )
    .eq('email_status', 'failed')
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT);

  if (targetIds && targetIds.length > 0) {
    query = query.in('id', targetIds);
  }

  const { data: rows, error: fetchError } = await query;

  if (fetchError) {
    console.error('[admin/feedback-retry] Fetch error:', fetchError.message);
    return NextResponse.json({ error: 'Failed to load feedback rows.' }, { status: 500 });
  }

  const feedbackRows = (rows ?? []) as unknown as FeedbackRow[];

  if (feedbackRows.length === 0) {
    return NextResponse.json({ retried: 0, sent: 0, failed: 0, rows: [] });
  }

  // ── Attempt delivery for each row ──────────────────────────────────────────
  const results: RetryResultRow[] = [];

  for (const row of feedbackRows) {
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
      // screenshot_url is already a long-lived signed URL created at submit time.
      screenshotUrl: row.screenshot_url ?? null,
      // Re-hydrate stored JSONB as FeedbackSessionContext (shape is identical).
      sessionContext: row.session_context
        ? (row.session_context as unknown as import('@/lib/feedback/collect-context').FeedbackSessionContext)
        : null,
      createdAt: new Date(row.created_at),
    };

    const ok = await sendFeedbackEmail(service, row.id, payload, row.email_attempts);
    results.push({
      id: row.id,
      name: row.name ?? '',
      email: row.email ?? '',
      attempts_before: row.email_attempts,
      ok,
    });
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.info(
    `[admin/feedback-retry] Retried ${feedbackRows.length} rows — sent=${sent} failed=${failed}`,
  );

  return NextResponse.json({
    retried: feedbackRows.length,
    sent,
    failed,
    rows: results,
  });
}
