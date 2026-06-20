import fs from 'node:fs';
import path from 'node:path';
import { getProjectRoot } from './env';
import type { CampaignSendResult } from './types';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function writeFailureCsv(results: CampaignSendResult[]): string | null {
  const failures = results.filter((r) => r.status === 'failed');
  if (failures.length === 0) return null;

  const filePath = path.join(getProjectRoot(), 'failed-emails.csv');
  const lines = ['name,email,reason'];

  for (const failure of failures) {
    lines.push(
      [
        csvEscape(failure.displayName),
        csvEscape(failure.recipient.email),
        csvEscape(failure.error || 'Unknown error'),
      ].join(','),
    );
  }

  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
  return filePath;
}
