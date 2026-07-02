import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { anonymousFeedbackSchema } from '@/lib/validations/anonymous-feedback';
import { assessFeedback, type FeedbackPayload } from '@/lib/email/feedback-notification';
import { sendFeedbackEmail } from '@/lib/feedback/email-sender';
import { autoTagFeedback } from '@/lib/feedback/auto-tag';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip')?.trim() ??
    'unknown'
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = clientIp(request);
  const rl = await checkRateLimit(`feedback-anon:${ip}`, 3600, 5);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = anonymousFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid feedback.' },
      { status: 400 },
    );
  }

  const { rating, npsScore, feedbackCategory, message, pageUrl, email } = parsed.data;
  const service = createServiceClient();
  const createdAt = new Date();
  const name = email ? 'Anonymous (with email)' : 'Anonymous';
  const labels = autoTagFeedback(message, '', '', null);

  const payload: FeedbackPayload = {
    name,
    email: email || 'anonymous@interviewera.com',
    userId: null,
    rating,
    likedText: message,
    confusionText: '',
    bugsText: feedbackCategory === 'bug' ? message : '',
    wouldUseAgain: null,
    pageUrl,
    browserInfo: request.headers.get('user-agent')?.slice(0, 512) ?? '',
    screenshotUrl: null,
    sessionContext: null,
    labels,
    createdAt,
  };

  const { severity } = assessFeedback(payload);

  const { data: insertedRow, error: insertError } = await service
    .from('feedbacks')
    .insert({
      user_id: null,
      name,
      email: email || 'anonymous@interviewera.com',
      rating,
      nps_score: npsScore,
      feedback_category: feedbackCategory,
      is_anonymous: true,
      liked_text: message,
      confusion_text: '',
      bugs_text: feedbackCategory === 'bug' ? message : '',
      would_use_again: null,
      page_url: pageUrl,
      browser_info: payload.browserInfo,
      severity,
      labels,
      created_at: createdAt.toISOString(),
      email_status: 'pending',
      email_attempts: 0,
    })
    .select('id')
    .single();

  if (insertError || !insertedRow) {
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 502 });
  }

  await sendFeedbackEmail(service, insertedRow.id, payload, 0);
  trackProductEventServer({
    event_name: 'feedback_submitted',
    source: 'anonymous',
    feedback_category: feedbackCategory,
  });
  if (npsScore !== null) {
    trackProductEventServer({ event_name: 'nps_submitted', nps_score: npsScore, source: 'anonymous' });
  }

  return NextResponse.json({ ok: true });
}

export const runtime = 'nodejs';
