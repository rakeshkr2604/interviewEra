import { NextResponse } from 'next/server';
import { SUPPORT_EMAIL } from '@/lib/contact/constants';
import { sendEmail } from '@/lib/email/send';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { contactFormSchema } from '@/lib/validations/contact';

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip')?.trim() ??
    'unknown'
  );
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: Request): Promise<NextResponse> {
  const ip = clientIp(request);
  const rl = await checkRateLimit(`contact-form:${ip}`, 3600, 5, { failClosed: true });
  if (!rl.allowed) {
    const status = rl.redisUnavailable ? 503 : 429;
    return NextResponse.json(
      {
        error: rl.redisUnavailable
          ? 'Service temporarily unavailable. Please retry in a moment.'
          : 'Too many messages. Please try again later.',
      },
      { status, headers: { 'Retry-After': String(rl.resetInSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid message.' },
      { status: 400 },
    );
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.error('[contact] Missing RESEND_API_KEY');
    return NextResponse.json({ error: 'Contact form is temporarily unavailable.' }, { status: 503 });
  }

  const { name, email, message } = parsed.data;
  const subject = `[Contact] Message from ${name}`;
  const text = [`Name: ${name}`, `Email: ${email}`, '', message].join('\n');
  const html = [
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
    `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
  ].join('');

  const result = await sendEmail({
    to: SUPPORT_EMAIL,
    replyTo: email,
    subject,
    html,
    text,
  });

  if (!result.success) {
    console.error('[contact] send failed', { error: result.error, email });
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

export const runtime = 'nodejs';
