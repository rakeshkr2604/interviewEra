/**
 * One-time InterviewEra product update email campaign (final production run).
 *
 * Usage:
 *   npm run send-product-update                 # live send to all 55 eligible users
 *   npm run send-product-update -- --dry-run    # simulate sends + preview HTML
 *   npm run send-product-update -- --preview    # render preview only (first recipient)
 *   npm run send-product-update -- --retry-failed  # legacy: failed-emails.csv only
 *
 * Preflight validates Resend, domain, production URLs, and zero localhost in HTML.
 *
 * Env (see .env.example):
 *   PRODUCT_UPDATE_APP_URL=https://interviewera.com
 *   PRODUCT_UPDATE_FROM=Rakesh Kumar, Founder, InterviewEra <founder@interviewera.com>
 *   PRODUCT_UPDATE_REPLY_TO=founder@interviewera.com
 *   PRODUCT_UPDATE_SUBJECT=InterviewEra just got better — your account has been updated
 */
import { loadCampaignEnv } from './product-update-campaign/env';
import { runProductUpdateCampaign } from './product-update-campaign/run';
import type { CampaignOptions } from './product-update-campaign/types';

loadCampaignEnv();

function parseOptions(argv: string[]): CampaignOptions {
  return {
    dryRun: argv.includes('--dry-run'),
    preview: argv.includes('--preview'),
    retryFailed: argv.includes('--retry-failed'),
  };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));

  if (!options.dryRun && !options.preview && !options.retryFailed) {
    console.log('Final production campaign — resends to ALL eligible users (credits_remaining = 3).');
    console.log('Preflight checks run automatically before send.');
    console.log('Use --dry-run or --preview to validate without sending.');
    console.log('');
  }

  const exitCode = await runProductUpdateCampaign(options);
  process.exit(exitCode);
}

void main().catch((err) => {
  console.error('[send-product-update] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
