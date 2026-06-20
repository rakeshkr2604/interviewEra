import fs from 'node:fs';
import path from 'node:path';
import { getCampaignAppBaseUrl, getProjectRoot } from './env';
import { renderProductUpdateEmail } from './render-email';
import { getDisplayName } from './recipients';
import type { CampaignRecipient } from './types';

export function writePreviewHtml(recipient: CampaignRecipient): string {
  const logsDir = path.join(getProjectRoot(), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  const filePath = path.join(logsDir, 'product-update-preview.html');
  const rendered = renderProductUpdateEmail(recipient);
  fs.writeFileSync(filePath, rendered.html, 'utf8');

  return filePath;
}

export function printPreviewSummary(recipient: CampaignRecipient, filePath: string): void {
  const rendered = renderProductUpdateEmail(recipient);
  const displayName = getDisplayName(recipient.name, recipient.email);
  const appUrl = getCampaignAppBaseUrl();

  console.log('Preview generated');
  console.log('');
  console.log(`Recipient sample: ${displayName} <${recipient.email}>`);
  console.log(`Greeting: Hi ${rendered.firstName} 👋`);
  console.log(`Subject: ${rendered.subject}`);
  console.log(`CTA links: ${appUrl}/dashboard`);
  console.log(`File: ${filePath}`);
  console.log('');
  console.log('Open the HTML file in a browser to review the final template.');
}
