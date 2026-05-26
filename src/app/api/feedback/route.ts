import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { feedbackSubmitSchema } from '@/lib/validations/schemas';
import { assessFeedback, type FeedbackPayload } from '@/lib/email/feedback-notification';
import { SCREENSHOT_BUCKET, isOwnedScreenshotPath } from '@/lib/feedback/screenshot';
import { sendFeedbackEmail } from '@/lib/feedback/email-sender';
import type { FeedbackSessionContext } from '@/lib/feedback/collect-context';

const SCREENSHOT_URL_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year — outlives the email

export async function POST(request: Request): Promise<NextResponse> {
  // ── Auth: the feedback surface lives behind the dashboard. ──────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Rate limit: max 5 submissions / 10 min per user. ────────────────────────
  const rl = await checkRateLimit(`feedback:${user.id}`, 600, 5);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  // ── Parse + server-side validation (never trust the client). ────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = feedbackSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid feedback.' },
      { status: 400 },
    );
  }

  const {
    name,
    rating,
    likedText,
    confusionText,
    bugsText,
    wouldUseAgain,
    pageUrl,
    browserInfo,
    screenshotPath,
    sessionContext,
  } = parsed.data;

  // Require at least one substantive field (text or screenshot).
  if (!likedText && !confusionText && !bugsText && !screenshotPath) {
    return NextResponse.json(
      { error: 'Please share at least one note or screenshot before submitting.' },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  // Resolve a long-lived signed URL for the screenshot (non-fatal if it fails).
  let screenshotUrl: string | null = null;
  if (screenshotPath && isOwnedScreenshotPath(screenshotPath, user.id)) {
    const { data, error } = await service.storage
      .from(SCREENSHOT_BUCKET)
      .createSignedUrl(screenshotPath, SCREENSHOT_URL_TTL_SECONDS);
    if (error) {
      console.error('[feedback] createSignedUrl failed:', error.message);
    } else {
      screenshotUrl = data?.signedUrl ?? null;
    }
  }

  // Email comes from the verified session, never the request body.
  const email = user.email ?? '';
  const createdAt = new Date();

  const payload: FeedbackPayload = {
    name,
    email,
    userId: user.id,
    rating,
    likedText,
    confusionText,
    bugsText,
    wouldUseAgain: wouldUseAgain ?? null,
    pageUrl,
    browserInfo,
    screenshotUrl,
    sessionContext: (sessionContext ?? null) as unknown as FeedbackSessionContext | null,
    createdAt,
  };

  const { severity } = assessFeedback(payload);

  // ── 1. Persist first — email_status starts as 'pending'. ────────────────────
  // If the DB write fails we return 502 immediately; the user should retry.
  // If the email delivery fails the row stays 'failed' and the retry cron
  // (api/cron/feedback-retry) will redeliver it automatically — so we always
  // return 200 once the row is safely stored.
  const { data: insertedRow, error: insertError } = await service
    .from('feedbacks')
    .insert({
      user_id: user.id,
      name,
      email,
      rating,
      liked_text: likedText,
      confusion_text: confusionText,
      bugs_text: bugsText,
      would_use_again: wouldUseAgain ?? null,
      page_url: pageUrl,
      browser_info: browserInfo,
      severity,
      screenshot_url: screenshotUrl,
      session_context: sessionContext ?? null,
      created_at: createdAt.toISOString(),
      // Retry-system columns — start in 'pending'; email-sender will update.
      email_status: 'pending',
      email_attempts: 0,
    })
    .select('id')
    .single();

  if (insertError || !insertedRow) {
    console.error('[feedback] DB insert failed:', insertError?.message);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 502 },
    );
  }

  // ── 2. Attempt immediate email delivery. ────────────────────────────────────
  // sendFeedbackEmail handles its own DB status transitions (pending → sent or
  // pending → failed). Failures here are non-fatal — the retry cron recovers.
  // We await so the status is updated before we respond; Resend is fast enough
  // that this doesn't meaningfully increase latency.
  await sendFeedbackEmail(service, insertedRow.id, payload, 0);

  return NextResponse.json({ ok: true });
}
