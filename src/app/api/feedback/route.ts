import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { feedbackSubmitSchema } from '@/lib/validations/schemas';
import { sendFeedbackNotification, type FeedbackPayload } from '@/lib/email/feedback-notification';

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

  // ── Rate limit: max 5 submissions / 10 min per user. Spam prevention. ──────
  const rl = await checkRateLimit(`feedback:${user.id}`, 600, 5);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again in a few minutes.' },
      { status: 429 },
    );
  }

  // ── Parse + server-side validation (never trust the client). ───────────────
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

  // Require at least one substantive field so empty forms can't be submitted.
  const { name, rating, likedText, confusionText, bugsText, wouldUseAgain, pageUrl, browserInfo } =
    parsed.data;
  if (!likedText && !confusionText && !bugsText) {
    return NextResponse.json(
      { error: 'Please share at least one note before submitting.' },
      { status: 400 },
    );
  }

  // Email comes from the verified session, not the request body.
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
    createdAt,
  };

  // ── Persist + notify. Both are attempted; we only fail the request if BOTH
  //    fail, so a single subsystem outage never loses the user's feedback. ────
  const service = createServiceClient();
  const [dbResult, emailSent] = await Promise.all([
    service
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
        created_at: createdAt.toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error('[feedback] DB insert failed:', error.message);
        return !error;
      }),
    sendFeedbackNotification(payload),
  ]);

  if (!dbResult && !emailSent) {
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
