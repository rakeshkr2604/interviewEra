import { sendEmail } from '@/lib/email/send';
import { renderEmailTemplate } from '@/lib/email/templates/render-template.server';
import { LIFECYCLE_FROM, LIFECYCLE_REPLY_TO, type LifecycleTemplateName } from './constants';
import {
  claimLifecycleEmailSend,
  confirmLifecycleEmailClaim,
  releaseLifecycleEmailClaim,
} from './log';

const LOG_PREFIX = '[lifecycle-email]';

export interface SendLifecycleTemplateInput {
  template: LifecycleTemplateName;
  to: string;
  props: Record<string, unknown>;
  userId: string | null;
  idempotencyKey?: string;
  replyTo?: string;
  text?: string;
  /** Custom Resend headers (e.g. List-Unsubscribe on weekly digest). */
  headers?: Record<string, string>;
}

export interface SendLifecycleTemplateResult {
  sent: boolean;
  skipped: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Render a registered React Email template, send via shared Resend helper, and log.
 *
 * When idempotencyKey is set: claim the DB slot FIRST (unique on status=sent),
 * then call Resend only if the claim succeeds. Concurrent callers that lose the
 * race skip without calling Resend. On send/render failure the claim is released
 * (status→failed) so a legitimate retry can re-claim.
 */
export async function sendLifecycleTemplate(
  input: SendLifecycleTemplateInput,
): Promise<SendLifecycleTemplateResult> {
  const { template, to, props, userId, idempotencyKey, replyTo, text, headers } = input;

  let claimId: string | null = null;

  if (idempotencyKey) {
    const claim = await claimLifecycleEmailSend({
      userId,
      template,
      idempotencyKey,
    });
    if (claim.status === 'already_handled') {
      console.info(`${LOG_PREFIX} skip duplicate`, { template, idempotencyKey });
      return { sent: false, skipped: true };
    }
    if (claim.status === 'error') {
      console.error(`${LOG_PREFIX} claim failed — not sending`, {
        template,
        idempotencyKey,
        error: claim.message,
      });
      return { sent: false, skipped: false, error: claim.message };
    }
    claimId = claim.claimId;
  }

  const releaseOrIgnore = async (errorMessage: string) => {
    if (claimId) {
      await releaseLifecycleEmailClaim({ claimId, errorMessage });
      claimId = null;
    }
  };

  if (!process.env.RESEND_API_KEY?.trim()) {
    const error = 'Missing RESEND_API_KEY';
    console.error(`${LOG_PREFIX} ${error}`, { template, to });
    await releaseOrIgnore(error);
    return { sent: false, skipped: false, error };
  }

  let html: string;
  let subject: string;
  try {
    const rendered = await renderEmailTemplate(template, props);
    html = rendered.html;
    subject = rendered.subject;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`${LOG_PREFIX} render failed`, { template, error });
    await releaseOrIgnore(error);
    return { sent: false, skipped: false, error };
  }

  const result = await sendEmail({
    to,
    from: LIFECYCLE_FROM,
    replyTo: replyTo ?? LIFECYCLE_REPLY_TO,
    subject,
    html,
    text,
    headers,
  });

  if (!result.success) {
    console.error(`${LOG_PREFIX} send failed`, { template, to, error: result.error });
    await releaseOrIgnore(result.error ?? 'send_failed');
    return { sent: false, skipped: false, error: result.error };
  }

  if (claimId && result.id) {
    await confirmLifecycleEmailClaim({
      claimId,
      providerMessageId: result.id,
    });
  } else if (claimId && !result.id) {
    // Delivered but no provider id — keep claim as sent so we never double-send.
    await confirmLifecycleEmailClaim({
      claimId,
      providerMessageId: 'unknown',
    });
  }

  console.info(`${LOG_PREFIX} sent`, { template, to, id: result.id });
  return { sent: true, skipped: false, providerMessageId: result.id };
}
