/**
 * Manual IndexNow submission.
 *
 *   npm run submit:indexnow                 # submit every indexable URL (all sitemaps)
 *   npm run submit:indexnow -- /interviewera /about   # submit specific paths/URLs
 *   INDEXNOW_DEBUG=1 npm run submit:indexnow          # verbose: print full URL list + backoff
 *
 * Run after a deploy when you publish a new blog post / page, or whenever you want to
 * proactively nudge Bing + the IndexNow ecosystem to (re)crawl. Safe to run repeatedly.
 *
 * A 403 self-resolves and is retried automatically (it usually means the key file hadn't
 * propagated yet). Requires no secrets locally (uses the committed default key). In CI/prod
 * set INDEXNOW_KEY and keep `public/<key>.txt` in sync.
 */
import { submitToIndexNow } from '../src/lib/seo/indexnow';
import { buildAllIndexableUrls } from '../src/lib/seo/sitemap/registry';

const DEBUG = process.env.INDEXNOW_DEBUG === '1' || process.env.INDEXNOW_DEBUG === 'true';

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter(Boolean);
  const urls = args.length > 0 ? args : buildAllIndexableUrls(new Date());

  // ── Print the exact payload shape BEFORE submission (forensic visibility) ──
  console.log('[indexnow] payload preview:');
  console.log(`  endpoint : https://api.indexnow.org/indexnow`);
  console.log(`  host     : interviewera.com`);
  console.log(`  urlCount : ${urls.length}`);
  if (DEBUG) {
    console.log('  urlList  :');
    for (const u of urls) console.log(`    - ${u}`);
  } else {
    console.log(`  sample   : ${urls.slice(0, 3).join(', ')}${urls.length > 3 ? ', …' : ''}`);
    console.log('  (set INDEXNOW_DEBUG=1 to print the full urlList)');
  }

  console.log(`[indexnow] submitting ${urls.length} URL(s)…`);
  const result = await submitToIndexNow(urls);

  console.log(
    `[indexnow] done — submitted=${result.submitted} batches=${result.batches} ` +
      `statuses=[${result.statuses.join(',')}] ok=${result.ok}`,
  );
  console.log(
    `[indexnow] key=${result.payloadMeta.key.slice(0, 8)}… keyLocation=${result.payloadMeta.keyLocation}`,
  );
  for (const o of result.outcomes) {
    if (!o.accepted) console.error(`[indexnow] rejected batch (${o.count} urls): HTTP ${o.status}${o.body ? ` — ${o.body}` : ''}`);
  }
  if (result.errors.length > 0) {
    console.error('[indexnow] errors:');
    for (const e of result.errors) console.error('  -', e);
  }

  process.exit(result.ok ? 0 : 1);
}

void main().catch((err) => {
  console.error('[indexnow] fatal:', err);
  process.exit(1);
});
