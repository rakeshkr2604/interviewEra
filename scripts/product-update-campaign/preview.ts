import fs from 'node:fs';
import path from 'node:path';
import { getCampaignAppBaseUrl, getProjectRoot } from './env';
import { renderProductUpdateEmail } from './render-email';
import { getDisplayName } from './recipients';
import { assertNoLocalhostInHtml, buildCampaignUrls, printCampaignUrls } from './url-validation';
import type { CampaignRecipient } from './types';

export async function writePreviewHtml(recipient: CampaignRecipient): Promise<string> {
  const logsDir = path.join(getProjectRoot(), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });

  const filePath = path.join(logsDir, 'product-update-preview.html');
  const urls = buildCampaignUrls();
  const rendered = await renderProductUpdateEmail(recipient, urls);
  assertNoLocalhostInHtml(rendered.html);
  fs.writeFileSync(filePath, rendered.html, 'utf8');

  return filePath;
}

export async function printPreviewSummary(recipient: CampaignRecipient, filePath: string): Promise<void> {
  const urls = buildCampaignUrls();
  const rendered = await renderProductUpdateEmail(recipient, urls);
  const displayName = getDisplayName(recipient.name, recipient.email);

  console.log('Preview generated');
  console.log('');
  console.log(`Recipient sample: ${displayName} <${recipient.email}>`);
  console.log(`Greeting: Hi ${rendered.firstName} 👋`);
  console.log(`Subject: ${rendered.subject}`);
  console.log('');
  printCampaignUrls(urls);
  console.log(`File: ${filePath}`);
  console.log('');
  console.log('Open the HTML file in a browser to review the final template.');
}
