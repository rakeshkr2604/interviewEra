import type { CampaignSendResult, CampaignSummary } from './types';

const SEP = '==================================';
const SUB = '----------------------------------';

export function printCampaignHeader(recipientCount: number, mode: 'live' | 'dry-run' | 'preview'): void {
  console.log(SEP);
  console.log('InterviewEra Product Update Campaign — Final Run');
  if (mode === 'dry-run') {
    console.log('Mode: DRY RUN (no emails will be sent)');
  } else if (mode === 'preview') {
    console.log('Mode: PREVIEW');
  }
  console.log('');
  console.log(`Recipients Found: ${recipientCount}`);
  console.log(SEP);
  console.log('');
}

export function printSendProgress(result: CampaignSendResult, index: number, total: number): void {
  const icon = result.status === 'failed' ? '✖' : '✓';
  const statusLabel =
    result.status === 'success'
      ? result.retried
        ? 'Success (after retry)'
        : 'Success'
      : result.status === 'dry-run'
        ? 'Dry Run (skipped)'
        : 'Failed';

  console.log(`${icon} Sending ${index}/${total}`);
  console.log('');
  console.log(result.displayName);
  console.log(result.recipient.email);
  console.log('');
  console.log(`${icon} ${statusLabel}`);

  if (result.status === 'failed' && result.error) {
    console.log('');
    console.log('Reason:');
    console.log(result.error);
  }

  console.log(SUB);
  console.log('');
  console.log('Progress');
  console.log(`${index} / ${total}`);
  console.log(SEP);
  console.log('');
}

export function printFinalReport(summary: CampaignSummary, dryRun: boolean): void {
  const successRate =
    summary.total === 0 ? 0 : (summary.success / summary.total) * 100;

  const minutes = Math.floor(summary.durationMs / 60000);
  const seconds = Math.floor((summary.durationMs % 60000) / 1000);
  const timeTaken = `${minutes}m ${seconds}s`;

  console.log(SEP);
  console.log(dryRun ? 'Dry Run Completed' : 'Campaign Completed');
  console.log(SEP);
  console.log('');
  console.log('Recipients');
  console.log(String(summary.total));
  console.log('');
  if (dryRun) {
    console.log('Would Send');
    console.log(String(summary.dryRun));
  } else {
    console.log('Successfully Sent');
    console.log(String(summary.success));
    console.log('');
    console.log('Retried Successfully');
    console.log(String(summary.retriedSuccess));
    console.log('');
    console.log('Failed');
    console.log(String(summary.failed));
    console.log('');
    console.log('Success Rate');
    console.log(`${successRate.toFixed(2)}%`);
  }
  console.log('');
  console.log('Total Time');
  console.log(timeTaken);
  console.log(SEP);
}
