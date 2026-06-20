import fs from 'node:fs';
import path from 'node:path';
import { getProjectRoot } from './env';
import type { CampaignRecipient } from './types';

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

export function loadFailedRecipientsFromCsv(
  csvPath = path.join(getProjectRoot(), 'failed-emails.csv'),
): CampaignRecipient[] {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Failure report not found: ${csvPath}`);
  }

  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) {
    return [];
  }

  const recipients: CampaignRecipient[] = [];

  for (const line of lines.slice(1)) {
    const [name, email] = parseCsvLine(line);
    if (!email?.trim()) continue;

    recipients.push({
      id: `retry-${email.trim().toLowerCase()}`,
      name: name?.trim() || null,
      email: email.trim(),
    });
  }

  return recipients;
}
