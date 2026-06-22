import { sendEmail } from '@/lib/email/send';
import { renderEmailTemplate } from '@/lib/email/templates/render-template.server';
import { LIFECYCLE_FROM, LIFECYCLE_REPLY_TO, type LifecycleTemplateName } from './constants';
import { logLifecycleEmail, wasLifecycleEmailSent } from './log';

const LOG_PREFIX = '[lifecycle-email]';

export interface SendLifecycleTemplateInput {
  template: LifecycleTemplateName;
  to: string;
  props: Record<string, unknown>;
  userId: string | null;
  idempotencyKey?: string;
  replyTo?: string;
  text?: string;
}

export interface SendLifecycleTemplateResult {
  sent: boolean;
  skipped: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Render a registered React Email template, send via shared Resend helper, and log.
 * When idempotencyKey is set, skips if a prior successful send exists.
 */
export async function sendLifecycleTemplate(
  input: SendLifecycleTemplateInput,
): Promise<SendLifecycleTemplateResult> {
  const { template, to, props, userId, idempotencyKey, replyTo, text } = input;

  if (idempotencyKey && (await wasLifecycleEmailSent(idempotencyKey))) {
    console.info(`${LOG_PREFIX} skip duplicate`, { template, idempotencyKey });
    return { sent: false, skipped: true };
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    const error = 'Missing RESEND_API_KEY';
    console.error(`${LOG_PREFIX} ${error}`, { template, to });
    if (idempotencyKey) {
      await logLifecycleEmail({
        userId,
        template,
        idempotencyKey,
        status: 'failed',
        errorMessage: error,
      });
    }
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
    if (idempotencyKey) {
      await logLifecycleEmail({
        userId,
        template,
        idempotencyKey,
        status: 'failed',
        errorMessage: error,
      });
    }
    return { sent: false, skipped: false, error };
  }

  const result = await sendEmail({
    to,
    from: LIFECYCLE_FROM,
    replyTo: replyTo ?? LIFECYCLE_REPLY_TO,
    subject,
    html,
    text,
  });

  if (!result.success) {
    console.error(`${LOG_PREFIX} send failed`, { template, to, error: result.error });
    if (idempotencyKey) {
      await logLifecycleEmail({
        userId,
        template,
        idempotencyKey,
        status: 'failed',
        errorMessage: result.error,
      });
    }
    return { sent: false, skipped: false, error: result.error };
  }

  if (idempotencyKey) {
    await logLifecycleEmail({
      userId,
      template,
      idempotencyKey,
      status: 'sent',
      providerMessageId: result.id,
    });
  }

  console.info(`${LOG_PREFIX} sent`, { template, to, id: result.id });
  return { sent: true, skipped: false, providerMessageId: result.id };
}
