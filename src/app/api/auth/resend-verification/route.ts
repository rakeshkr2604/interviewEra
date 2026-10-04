import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { sendSignupVerificationEmail } from '@/lib/email/lifecycle/send-verification';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { sanitizeNext } from '@/lib/auth/auth-params';
import { hasVerifiedEmail } from '@/lib/auth/verified-email-policy';

const bodySchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  next: z.string().optional(),
});

const GENERIC_SUCCESS =
  'If your account needs verification, we sent a new confirmation email. Check your inbox and spam folder.';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip')?.trim() ??
    'unknown'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid email.' },
      { status: 400 },
    );
  }

  const ip = clientIp(request);
  const email = parsed.data.email.trim().toLowerCase();
  const next = sanitizeNext(parsed.data.next);

  const rlIp = await checkRateLimit(`resend-verification:${ip}`, 3600, 5, { failClosed: true });
  const rlEmail = await checkRateLimit(`resend-verification:${email}`, 3600, 3, {
    failClosed: true,
  });
  if (!rlIp.allowed || !rlEmail.allowed) {
    const redisUnavailable = Boolean(rlIp.redisUnavailable || rlEmail.redisUnavailable);
    return NextResponse.json(
      {
        error: redisUnavailable
          ? 'Service temporarily unavailable. Please retry in a moment.'
          : 'Too many requests. Please wait before requesting another email.',
        code: redisUnavailable ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
      },
      {
        status: redisUnavailable ? 503 : 429,
        headers: {
          'Retry-After': String(
            Math.max(rlIp.resetInSeconds ?? 0, rlEmail.resetInSeconds ?? 0) || 60,
          ),
        },
      },
    );
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    return NextResponse.json(
      { error: 'Email service is temporarily unavailable.' },
      { status: 503 },
    );
  }

  try {
    const service = createServiceClient();
    const { data: linkData } = await service.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    const user = linkData?.user;
    if (!user || hasVerifiedEmail(user)) {
      return NextResponse.json({ ok: true, message: GENERIC_SUCCESS });
    }

    const name =
      typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : undefined;

    await sendSignupVerificationEmail(email, { name, next });

    return NextResponse.json({ ok: true, message: GENERIC_SUCCESS });
  } catch (err) {
    console.error('[auth/resend-verification] error', err);
    return NextResponse.json({ ok: true, message: GENERIC_SUCCESS });
  }
}
