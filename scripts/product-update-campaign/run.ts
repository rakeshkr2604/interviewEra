import { sendCampaignBatches } from './batch-sender';
import { confirmCampaignSend } from './confirmation';
import { PRODUCT_UPDATE_FROM, PRODUCT_UPDATE_REPLY_TO, PRODUCT_UPDATE_SUBJECT } from './email-config';
import { writeFailureCsv } from './failure-csv';
import {
  appendCampaignLogEntry,
  getCampaignLogPath,
  writeCampaignLogHeader,
} from './log-file';
import { printPreviewSummary, writePreviewHtml } from './preview';
import { runPreflightChecks } from './preflight';
import {
  printCampaignHeader,
  printFinalReport,
  printSendProgress,
} from './progress-logger';
import { fetchEligibleRecipients } from './recipients';
import { loadFailedRecipientsFromCsv } from './retry-failed';
import type { CampaignOptions, CampaignSendResult, CampaignSummary } from './types';

function buildSummary(
  results: CampaignSendResult[],
  durationMs: number,
): CampaignSummary {
  let success = 0;
  let retriedSuccess = 0;
  let failed = 0;
  let dryRun = 0;

  for (const result of results) {
    if (result.status === 'success') {
      success += 1;
      if (result.retried) retriedSuccess += 1;
    } else if (result.status === 'failed') {
      failed += 1;
    } else {
      dryRun += 1;
    }
  }

  return {
    total: results.length,
    success,
    retriedSuccess,
    failed,
    dryRun,
    durationMs,
  };
}

export async function runProductUpdateCampaign(options: CampaignOptions): Promise<number> {
  const startedAt = Date.now();

  let recipients;
  if (options.retryFailed) {
    recipients = loadFailedRecipientsFromCsv();
    if (recipients.length === 0) {
      console.error('No failed recipients in failed-emails.csv.');
      return 1;
    }
    console.log(`Retry mode: ${recipients.length} recipient(s) from failed-emails.csv`);
    console.log('');
  } else {
    const fetched = await fetchEligibleRecipients();
    recipients = fetched.recipients;
    if (fetched.skippedInvalid > 0 || fetched.skippedDuplicate > 0) {
      console.log(
        `Skipped ${fetched.skippedInvalid} invalid/empty email(s), ${fetched.skippedDuplicate} duplicate(s).`,
      );
      console.log('');
    }
  }

  if (recipients.length === 0) {
    console.error('No eligible recipients found (email present, credits_remaining = 3).');
    return 1;
  }

  if (options.preview) {
    printCampaignHeader(recipients.length, 'preview');
    const sample = recipients[0];
    const previewPath = await writePreviewHtml(sample);
    await printPreviewSummary(sample, previewPath);

    if (options.dryRun) {
      printCampaignHeader(recipients.length, 'dry-run');
      const logPath = getCampaignLogPath();
      writeCampaignLogHeader(logPath, recipients.length, true);

      const results = await sendCampaignBatches(
        recipients,
        { dryRun: true, preview: false, retryFailed: options.retryFailed },
        (result, index, total) => {
          appendCampaignLogEntry(logPath, result);
          printSendProgress(result, index, total);
        },
      );

      printFinalReport(buildSummary(results, Date.now() - startedAt), true);
      console.log(`Log file: ${logPath}`);
    }

    return 0;
  }

  printCampaignHeader(recipients.length, options.dryRun ? 'dry-run' : 'live');

  if (!options.dryRun) {
    requireEnvKeys();

    console.log(`From: ${PRODUCT_UPDATE_FROM}`);
    console.log(`Reply-To: ${PRODUCT_UPDATE_REPLY_TO}`);
    console.log(`Subject: ${PRODUCT_UPDATE_SUBJECT}`);
    console.log('');

    await runPreflightChecks(recipients[0]);

    const confirmed = await confirmCampaignSend(recipients.length);
    if (!confirmed) {
      console.log('Campaign cancelled.');
      return 0;
    }

    console.log('Starting Campaign...');
    console.log('');
  } else {
    const previewPath = await writePreviewHtml(recipients[0]);
    await printPreviewSummary(recipients[0], previewPath);
    console.log('');
  }

  const logPath = getCampaignLogPath();
  writeCampaignLogHeader(logPath, recipients.length, options.dryRun);

  const results = await sendCampaignBatches(recipients, options, (result, index, total) => {
    appendCampaignLogEntry(logPath, result);
    printSendProgress(result, index, total);
  });

  printFinalReport(buildSummary(results, Date.now() - startedAt), options.dryRun);

  console.log('');
  console.log(`Log file: ${logPath}`);

  if (!options.dryRun) {
    const failureCsvPath = writeFailureCsv(results);
    if (failureCsvPath) {
      console.log(`Failure report: ${failureCsvPath}`);
    }
  }

  return results.some((r) => r.status === 'failed') ? 1 : 0;
}

function requireEnvKeys(): void {
  const required = ['RESEND_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
