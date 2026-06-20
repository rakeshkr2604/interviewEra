import { Resend } from 'resend';
import { requireEnv } from './env';
import { PRODUCT_UPDATE_FROM, PRODUCT_UPDATE_REPLY_TO } from './email-config';
import type { RenderedProductUpdateEmail } from './render-email';
import type { CampaignRecipient } from './types';

export interface SendProductUpdateResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Number of send attempts after the first failure (0 = succeeded on first try). */
  retryAttempts?: number;
}

const MAX_ATTEMPTS = 6;
const RETRY_BACKOFF_MS = [2000, 4000, 8000, 8000, 8000];
const RETRYABLE =
  /too many requests|rate limit|429|timeout|timed out|network|fetch failed|econnreset|enotfound|unable to fetch|temporary/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: string): boolean {
  return RETRYABLE.test(error);
}

export async function sendProductUpdateEmail(
  recipient: CampaignRecipient,
  rendered: RenderedProductUpdateEmail,
): Promise<SendProductUpdateResult> {
  const resend = new Resend(requireEnv('RESEND_API_KEY'));
  let lastError = 'Send failed';
  let retryAttempts = 0;

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
        if (isRetryable(lastError) && attempt < MAX_ATTEMPTS) {
          retryAttempts += 1;
          await sleep(RETRY_BACKOFF_MS[Math.min(retryAttempts - 1, RETRY_BACKOFF_MS.length - 1)]);
          continue;
        }
        return { success: false, error: lastError, retryAttempts };
      }

      return { success: true, messageId: response.data?.id, retryAttempts };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (isRetryable(lastError) && attempt < MAX_ATTEMPTS) {
        retryAttempts += 1;
        await sleep(RETRY_BACKOFF_MS[Math.min(retryAttempts - 1, RETRY_BACKOFF_MS.length - 1)]);
        continue;
      }
      return { success: false, error: lastError, retryAttempts };
    }
  }

  return { success: false, error: lastError, retryAttempts };
}
