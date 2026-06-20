import fs from 'node:fs';
import path from 'node:path';
import { getProjectRoot } from './env';
import type { CampaignSendResult } from './types';

function ensureLogsDir(): string {
  const dir = path.join(getProjectRoot(), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getCampaignLogPath(date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return path.join(ensureLogsDir(), `product-update-${day}.log`);
}

export function appendCampaignLogEntry(logPath: string, result: CampaignSendResult): void {
  const timestamp = new Date().toISOString();
  const status =
    result.status === 'success'
      ? 'success'
      : result.status === 'dry-run'
        ? 'dry-run'
        : 'failed';
  const messageId = result.messageId ?? '';
  const error = result.error ?? '';

  const line = [
    timestamp,
    result.displayName,
    result.recipient.email,
    status,
    messageId,
    error,
  ]
    .map((field) => field.replace(/\|/g, '/'))
    .join(' | ');

  fs.appendFileSync(logPath, `${line}\n`, 'utf8');
}

export function writeCampaignLogHeader(logPath: string, recipientCount: number, dryRun: boolean): void {
  const header = [
    `# InterviewEra Product Update Campaign`,
    `# Started: ${new Date().toISOString()}`,
    `# Recipients: ${recipientCount}`,
    `# Mode: ${dryRun ? 'dry-run' : 'live'}`,
    `# Format: timestamp | name | email | status | resend_message_id | error`,
    '',
  ].join('\n');

  fs.writeFileSync(logPath, header, 'utf8');
}
