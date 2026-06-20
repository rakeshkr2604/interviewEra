import { Resend } from 'resend';
import { requireEnv } from './env';
import { PRODUCT_UPDATE_FROM, PRODUCT_UPDATE_REPLY_TO } from './email-config';
import type { RenderedProductUpdateEmail } from './render-email';
import type { CampaignRecipient } from './types';

export interface SendProductUpdateResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const MAX_ATTEMPTS = 4;
const RETRYABLE = /too many requests|rate limit|429/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendProductUpdateEmail(
  recipient: CampaignRecipient,
  rendered: RenderedProductUpdateEmail,
): Promise<SendProductUpdateResult> {
  const resend = new Resend(requireEnv('RESEND_API_KEY'));
  let lastError = 'Send failed';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await resend.emails.send({
        from: PRODUCT_UPDATE_FROM,
        to: recipient.email,
        replyTo: PRODUCT_UPDATE_REPLY_TO,
        subject: rendered.subject,
        html: rendered.html,
      });

      if (response.error) {
        lastError = response.error.message || JSON.stringify(response.error);
        if (RETRYABLE.test(lastError) && attempt < MAX_ATTEMPTS) {
          await sleep(1500 * attempt);
          continue;
        }
        return { success: false, error: lastError };
      }

      return { success: true, messageId: response.data?.id };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (RETRYABLE.test(lastError) && attempt < MAX_ATTEMPTS) {
        await sleep(1500 * attempt);
        continue;
      }
      return { success: false, error: lastError };
    }
  }

  return { success: false, error: lastError };
}
