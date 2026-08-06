import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { displayNameSchema } from '@/lib/validations/schemas';
import { sendSignupVerificationEmail } from '@/lib/email/lifecycle/send-verification';
import { checkRateLimit } from '@/lib/redis/rate-limit';

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
  'aol.com',
  'mail.com',
  'yandex.com',
  'rediffmail.com',
]);

const bodySchema = z.object({
  email: z.string().trim().email('Enter a valid work email.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must include an uppercase letter.')
    .regex(/[a-z]/, 'Password must include a lowercase letter.')
    .regex(/[0-9]/, 'Password must include a number.')
    .regex(/[^A-Za-z0-9\s]/, 'Password must include a special character.'),
  name: displayNameSchema,
  companyName: z.string().trim().min(2, 'Enter your company name.').max(120),
  companySize: z.string().trim().max(40).optional(),
});

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip')?.trim() ??
    'unknown'
  );
}

function isFreeEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return Boolean(domain && FREE_EMAIL_DOMAINS.has(domain));
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
  const rl = await checkRateLimit(`hiring-signup:${ip}`, 3600, 10);
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
    console.error('[hiring/signup-workspace] missing platform env');
    return NextResponse.json(
      { error: 'Signup is temporarily unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

  const { email, password, name, companyName, companySize } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  if (isFreeEmail(normalizedEmail)) {
    return NextResponse.json(
      {
        error:
          'Team accounts need a work email (yourcompany.com). Personal addresses like Gmail are not supported for hiring workspaces.',
        code: 'business_email_required',
      },
      { status: 400 },
    );
  }

  const service = createServiceClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: false,
    user_metadata: { name, role: 'hiring_admin', company_name: companyName },
  });

  if (createError) {
    const msg = createError.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try signing in instead.' },
        { status: 409 },
      );
    }
    console.error('[hiring/signup-workspace] createUser failed', createError.message);
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const userId = created.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Account creation failed.' }, { status: 500 });
  }

  const { data: org, error: orgError } = await service
    .from('hiring_organizations')
    .insert({
      name: companyName,
      admin_user_id: userId,
      company_size: companySize?.trim() || null,
    })
    .select('id')
    .single();

  if (orgError || !org) {
    console.error('[hiring/signup-workspace] org insert failed', orgError?.message);
    await service.auth.admin.deleteUser(userId).catch(() => undefined);
    return NextResponse.json(
      { error: `Failed to create hiring workspace: ${orgError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  const verification = await sendSignupVerificationEmail(normalizedEmail, {
    name,
    next: '/hiring/dashboard',
    password,
  });

  if (!verification.delivered) {
    console.error('[hiring/signup-workspace] verification email failed', {
      userId,
      error: verification.error,
    });
    return NextResponse.json(
      {
        error:
          'Your workspace was created but we could not send the verification email. Use resend verification or contact support.',
        userId,
        orgId: org.id,
        needsVerification: true,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    userId,
    orgId: org.id,
    needsVerification: true,
    message: 'Hiring workspace created. Check your email to verify before signing in.',
  });
}
