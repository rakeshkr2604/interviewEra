/**
 * Manual IndexNow submission.
 *
 *   npm run submit:indexnow                 # submit every indexable URL (all sitemaps)
 *   npm run submit:indexnow -- /interviewera /about   # submit specific paths/URLs
 *
 * Run after a deploy when you publish a new blog post / page, or whenever you want to
 * proactively nudge Bing + the IndexNow ecosystem to (re)crawl. Safe to run repeatedly.
 *
 * Requires no secrets locally (uses the committed default key). In CI/prod set INDEXNOW_KEY
 * and keep `public/<key>.txt` in sync.
 */
import { submitToIndexNow } from '../src/lib/seo/indexnow';
import { buildAllIndexableUrls } from '../src/lib/seo/sitemap/registry';

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter(Boolean);
  const urls = args.length > 0 ? args : buildAllIndexableUrls(new Date());

  console.log(`[indexnow] submitting ${urls.length} URL(s)…`);
  const result = await submitToIndexNow(urls);

  console.log(
    `[indexnow] done — submitted=${result.submitted} batches=${result.batches} ` +
      `statuses=[${result.statuses.join(',')}] ok=${result.ok}`,
  );
  if (result.errors.length > 0) {
    console.error('[indexnow] errors:');
    for (const e of result.errors) console.error('  -', e);
  }

  // Non-zero exit on hard failure so CI/deploy hooks can surface the problem.
  process.exit(result.ok ? 0 : 1);
}

void main().catch((err) => {
  console.error('[indexnow] fatal:', err);
  process.exit(1);
});
