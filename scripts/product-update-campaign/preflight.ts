import { Resend } from 'resend';
import { requireEnv } from './env';
import { renderProductUpdateEmail } from './render-email';
import {
  assertNoLocalhostInHtml,
  assertProductionUrls,
  buildCampaignUrls,
  printCampaignUrls,
} from './url-validation';
import type { CampaignRecipient } from './types';

export interface PreflightResult {
  resendConnected: boolean;
  domainVerified: boolean;
  productionUrlsVerified: boolean;
  emailTemplateOk: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyResendConnected(): Promise<void> {
  const apiKey = requireEnv('RESEND_API_KEY');

  if (!apiKey.startsWith('re_')) {
    throw new Error(
      'RESEND_API_KEY looks invalid (expected format: re_...). Copy a live key from https://resend.com/api-keys',
    );
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.domains.list();

  if (error) {
    throw new Error(`Resend API key check failed: ${error.message}`);
  }
}

async function verifyDomainVerified(): Promise<void> {
  const resend = new Resend(requireEnv('RESEND_API_KEY'));
  const { data, error } = await resend.domains.list();

  if (error) {
    throw new Error(`Domain verification check failed: ${error.message}`);
  }

  const domain = data?.data?.find(
    (entry) => entry.name === 'interviewera.com' && entry.status === 'verified',
  );

  if (!domain) {
    throw new Error(
      'interviewera.com is not verified in Resend. Verify the domain before sending.',
    );
  }
}

function verifyEmailTemplate(sampleRecipient: CampaignRecipient): void {
  const urls = buildCampaignUrls();
  assertProductionUrls(urls);

  const rendered = renderProductUpdateEmail(sampleRecipient, urls);
  assertNoLocalhostInHtml(rendered.html);

  if (!rendered.html.includes('<!DOCTYPE html>') && !rendered.html.includes('<html')) {
    throw new Error('Email template did not render valid HTML.');
  }
}

export function printPreflightChecks(result: PreflightResult): void {
  console.log('Preflight Checks');
  console.log('');
  console.log(result.resendConnected ? '✅ Resend Connected' : '✖ Resend Connected');
  console.log(result.domainVerified ? '✅ Domain Verified' : '✖ Domain Verified');
  console.log(
    result.productionUrlsVerified ? '✅ Production URLs Verified' : '✖ Production URLs Verified',
  );
  console.log(result.emailTemplateOk ? '✅ Email Template OK' : '✖ Email Template OK');
  console.log('');
}

/**
 * Runs all preflight checks. Aborts by throwing if any check fails.
 */
export async function runPreflightChecks(sampleRecipient: CampaignRecipient): Promise<void> {
  const result: PreflightResult = {
    resendConnected: false,
    domainVerified: false,
    productionUrlsVerified: false,
    emailTemplateOk: false,
  };

  try {
    await verifyResendConnected();
    result.resendConnected = true;

    await verifyDomainVerified();
    result.domainVerified = true;

    const urls = buildCampaignUrls();
    assertProductionUrls(urls);
    result.productionUrlsVerified = true;

    verifyEmailTemplate(sampleRecipient);
    result.emailTemplateOk = true;
  } catch (err) {
    printPreflightChecks(result);
    throw err;
  }

  printPreflightChecks(result);

  console.log('Validated CTA URLs');
  console.log('');
  printCampaignUrls(buildCampaignUrls());
  console.log('');

  // Small pause so operators can read output before confirmation.
  await sleep(500);
}
