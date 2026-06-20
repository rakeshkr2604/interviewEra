/**
 * One-time InterviewEra product update email campaign.
 *
 * Usage:
 *   npm run send-product-update                 # live send (confirmation required)
 *   npm run send-product-update -- --dry-run    # simulate sends + preview HTML
 *   npm run send-product-update -- --preview    # render preview only (first recipient)
 *   npm run send-product-update -- --dry-run --preview
 *
 * Requires `.env.local` with Supabase + Resend keys. Does not modify the database.
 *
 * Optional sender overrides (defaults match official InterviewEra addresses):
 *   PRODUCT_UPDATE_FROM=InterviewEra <hello@interviewera.com>
 *   PRODUCT_UPDATE_REPLY_TO=founder@interviewera.com
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
    console.log('Live campaign mode. Use --dry-run to simulate without sending.');
    console.log('Use --preview to write logs/product-update-preview.html.');
    console.log('Use --retry-failed to resend failed-emails.csv only.');
    console.log('');
  }

  const exitCode = await runProductUpdateCampaign(options);
  process.exit(exitCode);
}

void main().catch((err) => {
  console.error('[send-product-update] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
