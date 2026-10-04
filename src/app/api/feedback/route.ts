import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { feedbackSubmitSchema } from '@/lib/validations/schemas';
import { assessFeedback, type FeedbackPayload } from '@/lib/email/feedback-notification';
import { SCREENSHOT_BUCKET, isOwnedScreenshotPath } from '@/lib/feedback/screenshot';
import { sendFeedbackEmail } from '@/lib/feedback/email-sender';
import type { FeedbackSessionContext } from '@/lib/feedback/collect-context';
import { autoTagFeedback } from '@/lib/feedback/auto-tag';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';

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
  const rl = await checkRateLimit(`feedback:${user.id}`, 600, 5, { failClosed: true });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: rl.redisUnavailable
          ? 'Service temporarily unavailable. Please retry in a moment.'
          : 'Too many submissions. Please try again in a few minutes.',
      },
      {
        status: rl.redisUnavailable ? 503 : 429,
        headers: { 'Retry-After': String(rl.resetInSeconds) },
      },
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
    consentPublicDisplay,
    npsScore,
    feedbackCategory,
    pageUrl,
    browserInfo,
    screenshotPath,
    sessionContext,
    interviewId,
    technicalFailureCategory,
    technicalIssueDescription,
  } = parsed.data;

  const isTechnicalIssue = feedbackCategory === 'technical_issue';
  const persistedRating = isTechnicalIssue ? null : rating;
  const persistedBugsText = isTechnicalIssue
    ? technicalIssueDescription?.trim() ?? ''
    : bugsText;

  // Require at least one substantive field (text or screenshot).
  if (!likedText && !confusionText && !persistedBugsText && !screenshotPath) {
    return NextResponse.json(
      { error: 'Please share at least one note or screenshot before submitting.' },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  if (screenshotPath && !isOwnedScreenshotPath(screenshotPath, user.id)) {
    return NextResponse.json({ error: 'Invalid screenshot reference.' }, { status: 403 });
  }

  if (isTechnicalIssue) {
    const { data: interview, error: interviewError } = await service
      .from('interviews')
      .select('id')
      .eq('id', interviewId!)
      .eq('user_id', user.id)
      .maybeSingle();

    if (interviewError) {
      console.error('[feedback] interview ownership lookup failed:', interviewError.message);
      return NextResponse.json({ error: 'Could not verify the selected interview.' }, { status: 502 });
    }
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found.' }, { status: 404 });
    }
  }

  // Resolve a long-lived signed URL for the screenshot (non-fatal if it fails).
  let screenshotUrl: string | null = null;
  if (screenshotPath) {
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

  const persistedSessionContext = isTechnicalIssue
    ? { ...(sessionContext ?? {}), session_id: interviewId! }
    : sessionContext ?? null;
  const typedSessionCtx = persistedSessionContext as unknown as FeedbackSessionContext | null;
  const labels = autoTagFeedback(likedText, confusionText, persistedBugsText, typedSessionCtx);

  const payload: FeedbackPayload = {
    name,
    email,
    userId: user.id,
    rating: persistedRating,
    likedText,
    confusionText,
    bugsText: persistedBugsText,
    wouldUseAgain: isTechnicalIssue ? null : wouldUseAgain ?? null,
    pageUrl,
    browserInfo,
    screenshotUrl,
    sessionContext: typedSessionCtx,
    labels,
    feedbackCategory: feedbackCategory ?? 'general',
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
      rating: persistedRating,
      liked_text: likedText,
      confusion_text: confusionText,
      bugs_text: persistedBugsText,
      would_use_again: isTechnicalIssue ? null : wouldUseAgain ?? null,
      consent_public_display: !isTechnicalIssue && consentPublicDisplay === true,
      nps_score: isTechnicalIssue ? null : npsScore ?? null,
      feedback_category: feedbackCategory ?? 'general',
      is_anonymous: false,
      page_url: pageUrl,
      browser_info: browserInfo,
      severity,
      screenshot_url: screenshotUrl,
      session_context: persistedSessionContext,
      labels,
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

  let technicalFailureCase:
    | {
        status: string;
        created: boolean;
      }
    | undefined;

  if (isTechnicalIssue) {
    const { data: caseRows, error: caseError } = await service.rpc(
      'create_technical_failure_case',
      {
        p_user_id: user.id,
        p_interview_id: interviewId!,
        p_feedback_id: insertedRow.id,
        p_failure_category: technicalFailureCategory!,
      },
    );

    const caseRow = (
      caseRows as Array<{
        case_id: string;
        case_status: string;
        original_debit_transaction_id: string | null;
        created: boolean;
      }> | null
    )?.[0];

    if (caseError || !caseRow) {
      console.error('[feedback] technical failure case creation failed:', caseError?.message);
      const { error: cleanupError } = await service
        .from('feedbacks')
        .delete()
        .eq('id', insertedRow.id);
      if (cleanupError) {
        console.error('[feedback] failed technical feedback cleanup:', cleanupError.message);
      }
      return NextResponse.json(
        { error: 'Could not create the technical issue case. Please try again.' },
        { status: 502 },
      );
    }

    technicalFailureCase = {
      status: caseRow.case_status,
      created: caseRow.created,
    };

    if (!caseRow.created) {
      const { error: duplicateCleanupError } = await service
        .from('feedbacks')
        .delete()
        .eq('id', insertedRow.id);
      if (duplicateCleanupError) {
        console.error(
          '[feedback] duplicate technical feedback cleanup failed:',
          duplicateCleanupError.message,
        );
        return NextResponse.json(
          { error: 'The existing technical issue case was found, but retry cleanup failed.' },
          { status: 502 },
        );
      }
      if (screenshotPath) {
        const { error: screenshotCleanupError } = await service.storage
          .from(SCREENSHOT_BUCKET)
          .remove([screenshotPath]);
        if (screenshotCleanupError) {
          console.error(
            '[feedback] duplicate screenshot cleanup failed:',
            screenshotCleanupError.message,
          );
        }
      }
      return NextResponse.json({ ok: true, technicalFailureCase, deduped: true });
    }
  }

  // ── 2. Attempt immediate email delivery. ────────────────────────────────────
  // sendFeedbackEmail handles its own DB status transitions (pending → sent or
  // pending → failed). Failures here are non-fatal — the retry cron recovers.
  // We await so the status is updated before we respond; Resend is fast enough
  // that this doesn't meaningfully increase latency.
  await sendFeedbackEmail(service, insertedRow.id, payload, 0);

  trackProductEventServer({
    event_name: 'feedback_submitted',
    user_id: user.id,
    feedback_category: feedbackCategory ?? 'general',
  });
  if (!isTechnicalIssue && npsScore !== null && npsScore !== undefined) {
    trackProductEventServer({ event_name: 'nps_submitted', user_id: user.id, nps_score: npsScore });
  }

  return NextResponse.json({ ok: true, technicalFailureCase });
}
