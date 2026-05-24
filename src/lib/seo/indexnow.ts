/**
 * IndexNow client — pushes URLs to the IndexNow ecosystem (Bing, Yandex, Seznam, Naver, …)
 * so search engines crawl new/updated pages immediately instead of waiting for discovery.
 *
 * Why this exists: Bing was reporting "Discovered but not crawled" / "could not connect".
 * IndexNow bypasses passive discovery by actively notifying the engines.
 *
 * Verification: a key file is served at `https://interviewera.com/<key>.txt` containing the key
 * (see `public/<key>.txt`). The same key is sent as `key` + `keyLocation` in each payload.
 *
 * Endpoint: the shared `api.indexnow.org` endpoint fans a single submission out to every
 * participating engine, so we do not POST to each engine separately.
 */
import { getCanonicalSiteOrigin, CANONICAL_HOST } from '@/lib/seo/site-url';

/**
 * Default key — also written to `public/<key>.txt`. Override in prod via `INDEXNOW_KEY`
 * (and update the public key file to match) if you ever need to rotate it.
 */
export const INDEXNOW_DEFAULT_KEY = 'eddf0c2eacf1c5ea6c17d3ce9fd045f307c3a8e0744dd616d1ec20911df55041' as const;

/** Shared endpoint that distributes to all IndexNow-participating engines. */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/** IndexNow allows up to 10,000 URLs/request; we keep batches smaller for reliability. */
const MAX_URLS_PER_BATCH = 1_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;
/** Politeness gap between batches so we never look like an abusive client. */
const INTER_BATCH_DELAY_MS = 500;

export interface IndexNowResult {
  submitted: number;
  batches: number;
  ok: boolean;
  /** Per-batch HTTP status codes (200/202 = accepted). */
  statuses: number[];
  errors: string[];
}

function resolveKey(): string {
  const fromEnv = process.env.INDEXNOW_KEY?.trim();
  return fromEnv && fromEnv.length >= 8 ? fromEnv : INDEXNOW_DEFAULT_KEY;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Keep only absolute HTTPS URLs that belong to the canonical host. IndexNow rejects (403)
 * any submission whose URLs don't match the host that owns the key, so we filter defensively.
 */
function sanitizeUrls(urls: string[], origin: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const abs = trimmed.startsWith('http') ? trimmed : `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    try {
      const u = new URL(abs);
      if (u.protocol !== 'https:') continue;
      if (u.hostname.toLowerCase() !== CANONICAL_HOST) continue;
      const normalized = u.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

async function postBatch(
  urlList: string[],
  body: { host: string; key: string; keyLocation: string },
): Promise<number> {
  let lastErr = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ ...body, urlList }),
      });
      // 200 = accepted, 202 = accepted (pending). 4xx are permanent — don't retry.
      if (res.status === 200 || res.status === 202) return res.status;
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`IndexNow rejected batch: HTTP ${res.status} (permanent, not retrying)`);
      }
      lastErr = `HTTP ${res.status}`;
    } catch (err) {
      lastErr = err instanceof Error ? err.message : String(err);
      if (lastErr.includes('permanent, not retrying')) throw err;
    }
    if (attempt < MAX_RETRIES) {
      await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt); // exponential backoff
    }
  }
  throw new Error(`IndexNow batch failed after ${MAX_RETRIES + 1} attempts: ${lastErr}`);
}

/**
 * Submit one or more URLs to IndexNow. Never throws — returns a structured result so callers
 * (build hooks, API routes, cron) degrade gracefully and can log the outcome.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const origin = getCanonicalSiteOrigin();
  const key = resolveKey();
  const keyLocation = `${origin}/${key}.txt`;
  const clean = sanitizeUrls(urls, origin);

  const result: IndexNowResult = { submitted: 0, batches: 0, ok: true, statuses: [], errors: [] };

  if (clean.length === 0) {
    result.errors.push('No valid canonical HTTPS URLs to submit.');
    result.ok = false;
    return result;
  }

  const body = { host: CANONICAL_HOST, key, keyLocation };
  const batches = chunk(clean, MAX_URLS_PER_BATCH);

  for (let i = 0; i < batches.length; i++) {
    try {
      const status = await postBatch(batches[i], body);
      result.statuses.push(status);
      result.submitted += batches[i].length;
    } catch (err) {
      result.ok = false;
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
    result.batches++;
    if (i < batches.length - 1) await sleep(INTER_BATCH_DELAY_MS);
  }

  return result;
}
