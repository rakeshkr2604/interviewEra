import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/auth/password-reset';
import { checkRateLimit } from '@/lib/redis/rate-limit';

const bodySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
});

const GENERIC_SUCCESS =
  "If an account exists for this email, we'll send a reset link shortly. Check your inbox and spam folder.";

const GENERIC_FAILURE =
  'Unable to send a reset email right now. Please try again in a few minutes.';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip')?.trim() ??
    'unknown'
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const reqId = crypto.randomUUID().slice(0, 8);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request.', requestId: reqId },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid email.', requestId: reqId },
      { status: 400 },
    );
  }

  const ip = clientIp(request);
  const rl = await checkRateLimit(`forgot-password:${ip}`, 60, 5);
  if (!rl.allowed) {
    console.warn('[password-reset] rate_limited', { reqId, ip });
    return NextResponse.json(
      {
        error: 'Too many reset attempts. Please wait a minute and try again.',
        code: 'RATE_LIMITED',
        requestId: reqId,
      },
      { status: 429, headers: { 'Retry-After': String(rl.resetInSeconds) } },
    );
  }

  // Pre-flight: missing platform config — safe to surface 503 (no user lookup yet).
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !process.env.RESEND_API_KEY?.trim()
  ) {
    console.error('[password-reset] missing env', { reqId });
    return NextResponse.json(
      { error: GENERIC_FAILURE, requestId: reqId },
      { status: 503 },
    );
  }

  try {
    await sendPasswordResetEmail(parsed.data.email);

    // Anti-enumeration: identical response whether the address exists or delivery failed.
    return NextResponse.json(
      { ok: true, message: GENERIC_SUCCESS, requestId: reqId },
      { status: 200 },
    );
  } catch (err) {
    console.error('[password-reset] unhandled', {
      reqId,
      error: err instanceof Error ? err.stack ?? err.message : String(err),
    });
    return NextResponse.json(
      { error: GENERIC_FAILURE, requestId: reqId },
      { status: 503 },
    );
  }
}
