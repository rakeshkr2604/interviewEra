/**
 * Shared feedback email retry logic — used by admin route and cron.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendFeedbackEmail } from '@/lib/feedback/email-sender';
import type { FeedbackPayload } from '@/lib/email/feedback-notification';
import type { FeedbackLabel } from '@/lib/feedback/auto-tag';

export const FEEDBACK_RETRY_BATCH_LIMIT = 25;

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
  labels: string[] | null;
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

export interface FeedbackRetrySummary {
  retried: number;
  sent: number;
  failed: number;
  rows: RetryResultRow[];
}

export async function retryFailedFeedbackEmails(
  service: SupabaseClient,
  targetIds?: string[],
): Promise<FeedbackRetrySummary> {
  let query = service
    .from('feedbacks')
    .select(
      'id, name, email, user_id, rating, liked_text, confusion_text, bugs_text, ' +
        'would_use_again, page_url, browser_info, screenshot_url, session_context, labels, created_at, email_attempts',
    )
    .eq('email_status', 'failed')
    .order('created_at', { ascending: true })
    .limit(FEEDBACK_RETRY_BATCH_LIMIT);

  if (targetIds && targetIds.length > 0) {
    query = query.in('id', targetIds);
  }

  const { data: rows, error: fetchError } = await query;
  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const feedbackRows = (rows ?? []) as unknown as FeedbackRow[];
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
      screenshotUrl: row.screenshot_url ?? null,
      sessionContext: row.session_context
        ? (row.session_context as unknown as import('@/lib/feedback/collect-context').FeedbackSessionContext)
        : null,
      labels: (row.labels ?? []) as FeedbackLabel[],
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

  return { retried: feedbackRows.length, sent, failed, rows: results };
}
