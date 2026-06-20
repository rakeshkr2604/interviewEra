import { createServiceClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/server/get-base-url';
import { sendEmail } from '@/lib/email/send';
import { renderResetPasswordEmail } from '@/lib/email/render-reset-password.server';

const LOG_PREFIX = '[password-reset]';

/** Verified Resend sender — matches feedback / weekly digest. */
const RESET_FROM =
  process.env.SENDER_EMAIL_TRANSACTIONAL?.trim() ||
  'InterviewEra <transactional@interviewera.com>';

export type PasswordResetStep =
  | 'env_check'
  | 'validate_email'
  | 'rate_limit'
  | 'generate_link'
  | 'render_email'
  | 'send_email'
  | 'complete';

export interface PasswordResetLogContext {
  step: PasswordResetStep;
  emailDomain?: string;
  userFound?: boolean;
  tokenGenerated?: boolean;
  emailRendered?: boolean;
  emailSent?: boolean;
  supabaseCode?: string;
  supabaseMessage?: string;
  resendId?: string;
  resendError?: string;
  rootCause?: string;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function logStep(ctx: PasswordResetLogContext): void {
  console.info(LOG_PREFIX, JSON.stringify(ctx));
}

function buildRedirectTo(): string {
  const base = getBaseUrl();
  return `${base}/auth/callback?next=${encodeURIComponent('/reset-password')}`;
}

function resolveDisplayName(
  authMeta: Record<string, unknown> | undefined,
  dbName: string | null | undefined,
): string | undefined {
  const fromMeta =
    (typeof authMeta?.full_name === 'string' && authMeta.full_name.trim()) ||
    (typeof authMeta?.name === 'string' && authMeta.name.trim()) ||
    undefined;
  const fromDb = typeof dbName === 'string' && dbName.trim().length > 0 ? dbName.trim() : undefined;
  return fromDb ?? fromMeta;
}

export interface SendPasswordResetResult {
  /** Always true for anti-enumeration — caller returns 200 unless infra is down. */
  acknowledged: true;
  /** False when user missing or delivery failed; logged server-side only. */
  delivered: boolean;
}

/**
 * Generates a Supabase recovery link (no Supabase email) and delivers via Resend.
 * Never throws — callers map `delivered: false` to a generic client message.
 */
export async function sendPasswordResetEmail(email: string): Promise<SendPasswordResetResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const emailDomain = normalizedEmail.split('@')[1] ?? 'unknown';
  const masked = maskEmail(normalizedEmail);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    logStep({
      step: 'env_check',
      emailDomain,
      rootCause: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    });
    return { acknowledged: true, delivered: false };
  }

  if (!resendKey) {
    logStep({
      step: 'env_check',
      emailDomain,
      rootCause: 'Missing RESEND_API_KEY',
    });
    return { acknowledged: true, delivered: false };
  }

  logStep({ step: 'validate_email', emailDomain });

  let service;
  try {
    service = createServiceClient();
  } catch (err) {
    logStep({
      step: 'generate_link',
      emailDomain,
      rootCause: err instanceof Error ? err.message : String(err),
    });
    return { acknowledged: true, delivered: false };
  }

  const redirectTo = buildRedirectTo();

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: 'recovery',
    email: normalizedEmail,
    options: { redirectTo },
  });

  if (linkError) {
    const isNotFound =
      linkError.status === 404 ||
      linkError.code === 'user_not_found' ||
      linkError.message.toLowerCase().includes('not found');

    logStep({
      step: 'generate_link',
      emailDomain,
      userFound: false,
      tokenGenerated: false,
      supabaseCode: linkError.code,
      supabaseMessage: linkError.message,
      rootCause: isNotFound ? 'user_not_found' : linkError.message,
    });

    // Anti-enumeration: unknown emails still get a generic success response.
    return { acknowledged: true, delivered: false };
  }

  const resetUrl = linkData.properties?.action_link;
  if (!resetUrl) {
    logStep({
      step: 'generate_link',
      emailDomain,
      userFound: true,
      tokenGenerated: false,
      rootCause: 'Supabase generateLink returned no action_link',
    });
    return { acknowledged: true, delivered: false };
  }

  logStep({
    step: 'generate_link',
    emailDomain,
    userFound: true,
    tokenGenerated: true,
  });

  const userId = linkData.user?.id;
  let dbName: string | null = null;
  if (userId) {
    const { data: profile } = await service
      .from('users')
      .select('name')
      .eq('id', userId)
      .maybeSingle();
    dbName = profile?.name ?? null;
  }

  const name = resolveDisplayName(
    linkData.user?.user_metadata as Record<string, unknown> | undefined,
    dbName,
  );

  let html: string;
  let subject: string;
  try {
    const rendered = await renderResetPasswordEmail({
      name: name ?? 'there',
      resetUrl,
    });
    html = rendered.html;
    subject = rendered.subject;
    logStep({
      step: 'render_email',
      emailDomain,
      userFound: true,
      tokenGenerated: true,
      emailRendered: true,
    });
  } catch (err) {
    logStep({
      step: 'render_email',
      emailDomain,
      userFound: true,
      tokenGenerated: true,
      emailRendered: false,
      rootCause: err instanceof Error ? err.message : String(err),
    });
    return { acknowledged: true, delivered: false };
  }

  const sendResult = await sendEmail({
    to: normalizedEmail,
    from: RESET_FROM,
    subject,
    html,
    text: `Reset your InterviewEra password: ${resetUrl}`,
  });

  if (!sendResult.success) {
    logStep({
      step: 'send_email',
      emailDomain,
      userFound: true,
      tokenGenerated: true,
      emailRendered: true,
      emailSent: false,
      resendError: sendResult.error,
      rootCause: sendResult.error ?? 'Resend send failed',
    });
    console.error(`${LOG_PREFIX} delivery failed for ${masked}`, sendResult.error);
    return { acknowledged: true, delivered: false };
  }

  logStep({
    step: 'complete',
    emailDomain,
    userFound: true,
    tokenGenerated: true,
    emailRendered: true,
    emailSent: true,
    resendId: sendResult.id,
  });

  return { acknowledged: true, delivered: true };
}
