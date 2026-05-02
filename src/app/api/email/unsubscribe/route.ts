import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyUnsubToken } from '@/lib/email/weekly-digest';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const token = searchParams.get('token');

  if (!userId || !token) {
    return new NextResponse('Invalid unsubscribe link.', { status: 400 });
  }

  if (!verifyUnsubToken(userId, token)) {
    return new NextResponse('Invalid or expired unsubscribe link.', { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('users')
    .update({ email_digest_unsubscribed: true })
    .eq('id', userId);

  if (error) {
    console.error('[email/unsubscribe] DB error:', error);
    return new NextResponse('Something went wrong. Please try again.', { status: 500 });
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Unsubscribed — InterviewEra</title></head>
<body style="font-family:system-ui,sans-serif;max-width:400px;margin:80px auto;text-align:center;color:#374151;">
  <p style="font-size:18px;font-weight:600;">You've been unsubscribed.</p>
  <p style="color:#6b7280;">You'll no longer receive weekly digest emails from InterviewEra.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? '/'}/dashboard" style="display:inline-block;margin-top:24px;color:#2563eb;">Go to dashboard</a>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  );
}
