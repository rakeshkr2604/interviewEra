import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { displayNameSchema } from '@/lib/validations/schemas';
import { sendSignupVerificationEmail } from '@/lib/email/lifecycle/send-verification';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { sanitizeNext } from '@/lib/auth/auth-params';
import { captureReferralFromCode } from '@/lib/referral/capture-referral';

const bodySchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[0-9]/, 'Password must include a number.')
    .regex(/[^A-Za-z0-9\s]/, 'Password must include a special character.'),
  name: displayNameSchema,
  next: z.string().optional(),
  placementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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
      { error: parsed.error.issues[0]?.message ?? 'Invalid signup data.' },
      { status: 400 },
    );
  }

  const ip = clientIp(request);
  const rl = await checkRateLimit(`signup:${ip}`, 3600, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.', code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } },
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !process.env.RESEND_API_KEY?.trim()
  ) {
    console.error('[auth/signup] missing platform env');
    return NextResponse.json(
      { error: 'Signup is temporarily unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

  const { email, password, name, next, metadata, placementDate } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const safeNext = sanitizeNext(next);

  const service = createServiceClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: false,
    user_metadata: { name, ...(metadata ?? {}) },
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 },
      );
    }
    console.error('[auth/signup] createUser failed', createError.message);
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Account creation failed.' }, { status: 500 });
  }

  if (placementDate) {
    await service.from('users').update({ placement_date: placementDate }).eq('id', userId);
  }

  const cookieStore = await cookies();
  const referralCode = cookieStore.get('referral_code')?.value;
  if (referralCode) {
    void captureReferralFromCode(service, userId, referralCode).catch((err) => {
      console.warn('[auth/signup] referral capture failed:', err);
    });
  }

  const verification = await sendSignupVerificationEmail(normalizedEmail, {
    name,
    next: safeNext,
    password,
  });

  if (!verification.delivered) {
    console.error('[auth/signup] verification email failed', {
      userId,
      error: verification.error,
    });
    return NextResponse.json(
      {
        error:
          'Your account was created but we could not send the verification email. Use resend verification or contact support.',
        userId,
        needsVerification: true,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    userId,
    needsVerification: true,
    message: 'Account created! Check your email to verify before signing in.',
  });
}
