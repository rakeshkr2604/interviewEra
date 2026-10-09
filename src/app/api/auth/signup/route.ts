import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { authPasswordSchema, displayNameSchema } from '@/lib/validations/schemas';
import { sendSignupVerificationEmail } from '@/lib/email/lifecycle/send-verification';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { sanitizeNext } from '@/lib/auth/auth-params';
import { captureReferralFromCode } from '@/lib/referral/capture-referral';
import { getAttributionFromRequest } from '@/lib/analytics/attribution';
import { persistUserAttributionOnce } from '@/lib/analytics/persist-user-attribution';
import {
  PRIVACY_ACCEPTANCE_VERSION,
  TERMS_ACCEPTANCE_VERSION,
} from '@/lib/legal/signup-consent';
import { persistSignupConsent } from '@/lib/legal/persist-signup-consent';

const GENERIC_SIGNUP_SUCCESS =
  'If this address can be registered, check your inbox for a verification email.';

const bodySchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: authPasswordSchema,
  name: displayNameSchema,
  next: z.string().optional(),
  placementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Explicit self-declaration — not a verified identity check. */
  ageConfirmed: z.literal(true, {
    error: 'You must confirm you are 18 or older to create an account.',
  }),
  acceptedTerms: z.literal(true, {
    error: 'You must accept the Terms & Conditions to create an account.',
  }),
  acceptedPrivacy: z.literal(true, {
    error: 'You must accept the Privacy Policy to create an account.',
  }),
  /** Allowlisted only — never accept arbitrary user_metadata bags. */
  metadata: z
    .object({
      role: z.literal('college_admin'),
    })
    .strict()
    .optional(),
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
  const rl = await checkRateLimit(`signup:${ip}`, 3600, 10, { failClosed: true });
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: rl.redisUnavailable
          ? 'Service temporarily unavailable. Please retry in a moment.'
          : 'Too many signup attempts. Please try again later.',
        code: rl.redisUnavailable ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
      },
      {
        status: rl.redisUnavailable ? 503 : 429,
        headers: { 'Retry-After': String(rl.resetInSeconds) },
      },
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
    user_metadata: {
      name,
      ...(metadata ?? {}),
      age_confirmed: true,
      terms_accepted_version: TERMS_ACCEPTANCE_VERSION,
      privacy_accepted_version: PRIVACY_ACCEPTANCE_VERSION,
    },
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json({
        ok: true,
        needsVerification: true,
        message: GENERIC_SIGNUP_SUCCESS,
      });
    }
    console.error('[auth/signup] createUser failed', createError.message);
    return NextResponse.json(
      { error: 'Account creation failed. Check your details and try again.' },
      { status: 400 },
    );
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Account creation failed.' }, { status: 500 });
  }

  if (placementDate) {
    await service.from('users').update({ placement_date: placementDate }).eq('id', userId);
  }

  await persistSignupConsent(service, userId, {
    ageConfirmed: true,
    acceptedTerms: true,
    acceptedPrivacy: true,
    termsVersion: TERMS_ACCEPTANCE_VERSION,
    privacyVersion: PRIVACY_ACCEPTANCE_VERSION,
  });

  const attribution = getAttributionFromRequest(request);
  await persistUserAttributionOnce(service, userId, attribution).catch((err) => {
    console.error('[auth/signup] attribution persistence failed:', err);
  });

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
    message: GENERIC_SIGNUP_SUCCESS,
  });
}
