import { createServiceClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/server/get-base-url';
import { buildSignupConfirmUrl } from '@/lib/auth/confirm-link';
import { sendLifecycleTemplate } from './send-template';

const LOG_PREFIX = '[signup-verification]';

function resolveDisplayName(
  authMeta: Record<string, unknown> | undefined,
  fallbackName?: string,
): string {
  const fromMeta =
    (typeof authMeta?.name === 'string' && authMeta.name.trim()) ||
    (typeof authMeta?.full_name === 'string' && authMeta.full_name.trim()) ||
    undefined;
  return fromMeta ?? fallbackName?.trim() ?? 'there';
}

export interface SendSignupVerificationResult {
  delivered: boolean;
  error?: string;
}

/**
 * Generates a Supabase signup confirmation link and delivers VerificationEmail via Resend.
 * Does not use Supabase's built-in email delivery.
 */
export async function sendSignupVerificationEmail(
  email: string,
  options?: { name?: string; next?: string; password?: string },
): Promise<SendSignupVerificationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const baseUrl = getBaseUrl();
  const next = options?.next ?? '/dashboard';
  const redirectTo = `${baseUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  let service;
  try {
    service = createServiceClient();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} service client error`, error);
    return { delivered: false, error };
  }

  const linkParams =
    options?.password != null
      ? {
          type: 'signup' as const,
          email: normalizedEmail,
          password: options.password,
          options: { redirectTo },
        }
      : {
          type: 'magiclink' as const,
          email: normalizedEmail,
          options: { redirectTo },
        };

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink(linkParams);

  if (linkError) {
    console.error(`${LOG_PREFIX} generateLink failed`, linkError.message);
    return { delivered: false, error: linkError.message };
  }

  const hashedToken = linkData.properties?.hashed_token?.trim();
  if (!hashedToken) {
    console.error(`${LOG_PREFIX} missing hashed_token`);
    return { delivered: false, error: 'Token generation failed' };
  }

  const verificationUrl = buildSignupConfirmUrl(
    hashedToken,
    next,
    baseUrl,
    linkParams.type === 'magiclink' ? 'magiclink' : 'signup',
  );
  const userId = linkData.user?.id ?? null;
  const name = resolveDisplayName(
    linkData.user?.user_metadata as Record<string, unknown> | undefined,
    options?.name,
  );

  const result = await sendLifecycleTemplate({
    template: 'verification',
    to: normalizedEmail,
    userId,
    props: { name, verificationUrl },
    text: `Verify your InterviewEra email: ${verificationUrl}`,
  });

  return {
    delivered: result.sent,
    error: result.error,
  };
}
