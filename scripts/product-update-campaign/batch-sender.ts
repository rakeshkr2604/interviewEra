import { getDisplayName } from './recipients';
import { renderProductUpdateEmail } from './render-email';
import { sendProductUpdateEmail } from './sender';
import { buildCampaignUrls } from './url-validation';
import type { CampaignOptions, CampaignRecipient, CampaignSendResult } from './types';

/** Resend free tier: max 2 req/sec — wait 700ms between sends. */
const SEND_INTERVAL_MS = 700;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendCampaignBatches(
  recipients: CampaignRecipient[],
  options: CampaignOptions,
  onResult: (result: CampaignSendResult, index: number, total: number) => void,
): Promise<CampaignSendResult[]> {
  const results: CampaignSendResult[] = [];
  const urls = buildCampaignUrls();

  for (let i = 0; i < recipients.length; i += 1) {
    const recipient = recipients[i];
    const displayName = getDisplayName(recipient.name, recipient.email);
    const rendered = renderProductUpdateEmail(recipient, urls);

    let result: CampaignSendResult;

    if (options.dryRun) {
      result = {
        recipient,
        displayName,
        firstName: rendered.firstName,
        status: 'dry-run',
      };
    } else {
      const sendResult = await sendProductUpdateEmail(recipient, rendered);

      result = sendResult.success
        ? {
            recipient,
            displayName,
            firstName: rendered.firstName,
            status: 'success',
            messageId: sendResult.messageId,
            retried: (sendResult.retryAttempts ?? 0) > 0,
            retryAttempts: sendResult.retryAttempts ?? 0,
          }
        : {
            recipient,
            displayName,
            firstName: rendered.firstName,
            status: 'failed',
            error: sendResult.error || 'Send failed',
            retryAttempts: sendResult.retryAttempts ?? 0,
          };

      if (i + 1 < recipients.length) {
        await sleep(SEND_INTERVAL_MS);
      }
    }

    results.push(result);
    onResult(result, i + 1, recipients.length);
  }

  return results;
}
