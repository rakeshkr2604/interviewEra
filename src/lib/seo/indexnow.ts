/**
 * IndexNow client — pushes URLs to the IndexNow ecosystem (Bing, Yandex, Seznam, Naver, …)
 * so search engines crawl new/updated pages immediately instead of waiting for discovery.
 *
 * Why this exists: Bing was reporting "Discovered but not crawled" / "could not connect".
 * IndexNow bypasses passive discovery by actively notifying the engines.
 *
 * Verification: a key file is served at `https://interviewera.com/<key>.txt` containing EXACTLY
 * the key and nothing else (see `public/<key>.txt`). The same key is sent as `key` + `keyLocation`.
 * IndexNow fetches `keyLocation` to verify ownership before accepting URLs.
 *
 * ── 403 handling (forensic) ──────────────────────────────────────────────────────────────────
 * A 403 from IndexNow most often means the verifier could not (yet) read the key file — e.g. a
 * propagation/CDN window right after the key file is deployed, or a transient fetch failure. It is
 * therefore RETRIED with backoff (it self-resolves). Genuinely permanent client errors (400 invalid
 * format, 422 URLs not owned by host) are NOT retried. Response bodies are always captured + logged.
 */
import { getCanonicalSiteOrigin, CANONICAL_HOST } from '@/lib/seo/site-url';

/**
 * Default key — also written to `public/<key>.txt` (no trailing newline). Override in prod via
 * `INDEXNOW_KEY` (and update the public key file to match) if you ever rotate it.
 */
export const INDEXNOW_DEFAULT_KEY = 'eddf0c2eacf1c5ea6c17d3ce9fd045f307c3a8e0744dd616d1ec20911df55041' as const; // gitleaks:allow — public IndexNow ownership key (also in public/<key>.txt)

/** Shared endpoint that distributes to all IndexNow-participating engines. */
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/** Some IndexNow nodes are picky about anonymous clients — send an explicit, descriptive UA. */
const INDEXNOW_USER_AGENT = 'InterviewEra-IndexNow/1.0 (+https://interviewera.com)';

/** IndexNow allows up to 10,000 URLs/request; we keep batches smaller for reliability. */
const MAX_URLS_PER_BATCH = 1_000;
const MAX_RETRIES = 4;
const BASE_RETRY_DELAY_MS = 1_500;
/** Politeness gap between batches so we never look like an abusive client. */
const INTER_BATCH_DELAY_MS = 600;
/** Key charset per spec: a–z, A–Z, 0–9, and dashes; length 8–128. */
const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

export interface IndexNowBatchOutcome {
  count: number;
  status: number;
  accepted: boolean;
  /** Trimmed response body (IndexNow returns a reason on rejection). */
  body?: string;
}

export interface IndexNowResult {
  submitted: number;
  batches: number;
  ok: boolean;
  statuses: number[];
  outcomes: IndexNowBatchOutcome[];
  errors: string[];
  /** Echo of the payload metadata that was sent (never includes the full URL list). */
  payloadMeta: { host: string; key: string; keyLocation: string; totalUrls: number };
}

export interface IndexNowValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const DEBUG = process.env.INDEXNOW_DEBUG === '1' || process.env.INDEXNOW_DEBUG === 'true';

function log(...args: unknown[]): void {
  console.log('[indexnow]', ...args);
}
function debug(...args: unknown[]): void {
  if (DEBUG) console.log('[indexnow:debug]', ...args);
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
 * Keep only absolute HTTPS URLs that belong to the canonical host. IndexNow rejects any
 * submission whose URLs don't match the host that owns the key, so we filter defensively
 * (drops localhost, vercel preview, http://, foreign hosts, duplicates).
 */
function sanitizeUrls(urls: string[], origin: string): { clean: string[]; dropped: string[] } {
  const seen = new Set<string>();
  const clean: string[] = [];
  const dropped: string[] = [];
  for (const raw of urls) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const abs = trimmed.startsWith('http')
      ? trimmed
      : `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
    try {
      const u = new URL(abs);
      if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== CANONICAL_HOST) {
        dropped.push(abs);
        continue;
      }
      const normalized = u.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      clean.push(normalized);
    } catch {
      dropped.push(abs);
    }
  }
  return { clean, dropped };
}

/**
 * Strong pre-submission guards. Validates the IndexNow contract BEFORE any network call so we
 * never burn a request (or risk key flagging) on a malformed payload.
 */
export function validateIndexNowSubmission(input: {
  host: string;
  key: string;
  keyLocation: string;
  urls: string[];
}): IndexNowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (input.host !== CANONICAL_HOST) {
    errors.push(`host must be "${CANONICAL_HOST}" (got "${input.host}")`);
  }
  if (!KEY_PATTERN.test(input.key)) {
    errors.push(`key must match ${KEY_PATTERN} (length 8–128, [a-zA-Z0-9-])`);
  }
  // keyLocation must be HTTPS, on the canonical host, and serve <key>.txt.
  try {
    const kl = new URL(input.keyLocation);
    if (kl.protocol !== 'https:') errors.push('keyLocation must be https://');
    if (kl.hostname.toLowerCase() !== CANONICAL_HOST) {
      errors.push(`keyLocation host must be ${CANONICAL_HOST} (got ${kl.hostname})`);
    }
    if (!kl.pathname.endsWith(`/${input.key}.txt`)) {
      errors.push(`keyLocation should serve /${input.key}.txt (got ${kl.pathname})`);
    }
  } catch {
    errors.push(`keyLocation is not a valid URL: "${input.keyLocation}"`);
  }

  if (input.urls.length === 0) {
    errors.push('urlList is empty after sanitization (no canonical HTTPS URLs)');
  }
  const foreign = input.urls.filter((u) => {
    try {
      return new URL(u).hostname.toLowerCase() !== CANONICAL_HOST;
    } catch {
      return true;
    }
  });
  if (foreign.length > 0) {
    errors.push(`${foreign.length} URL(s) are not on ${CANONICAL_HOST}: ${foreign.slice(0, 3).join(', ')}`);
  }
  if (input.urls.length > 10_000) {
    warnings.push(`urlList has ${input.urls.length} URLs; IndexNow caps at 10,000/request (auto-batched).`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** true = worth retrying (transient). 403 included: usually a key-verification propagation window. */
function isRetryableStatus(status: number): boolean {
  return status === 403 || status === 408 || status === 429 || status >= 500;
}
/** true = permanent client error; do not retry. */
function isPermanentStatus(status: number): boolean {
  return status === 400 || status === 422 || (status >= 400 && status < 500 && !isRetryableStatus(status));
}

async function postBatch(
  urlList: string[],
  body: { host: string; key: string; keyLocation: string },
): Promise<IndexNowBatchOutcome> {
  let last: IndexNowBatchOutcome = { count: urlList.length, status: 0, accepted: false };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': INDEXNOW_USER_AGENT,
          Accept: 'application/json, text/plain, */*',
        },
        body: JSON.stringify({ ...body, urlList }),
      });

      const text = (await res.text().catch(() => '')).trim();
      last = { count: urlList.length, status: res.status, accepted: res.ok, body: text || undefined };

      if (res.status === 200 || res.status === 202) return last;

      // Log the reason body on every rejection (forensic visibility).
      log(
        `batch rejected: HTTP ${res.status}${text ? ` — ${text.slice(0, 300)}` : ''}` +
          (attempt < MAX_RETRIES && isRetryableStatus(res.status) ? ' (retrying)' : ''),
      );
      if (res.status === 403) {
        log(
          'hint: 403 usually means IndexNow could not verify the key file. ' +
            `Confirm ${body.keyLocation} returns 200 with exactly the key, then retry.`,
        );
      }

      if (isPermanentStatus(res.status)) return last; // do not retry permanent errors
      // else fall through to backoff + retry
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      last = { count: urlList.length, status: 0, accepted: false, body: `network error: ${msg}` };
      log(`network error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${msg}`);
    }

    if (attempt < MAX_RETRIES) {
      const delay = BASE_RETRY_DELAY_MS * 2 ** attempt; // exponential backoff
      debug(`backing off ${delay}ms before retry ${attempt + 2}`);
      await sleep(delay);
    }
  }
  return last;
}

/**
 * Submit one or more URLs to IndexNow. Never throws — returns a structured result so callers
 * (build hooks, API routes, cron) degrade gracefully and can log the outcome.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const origin = getCanonicalSiteOrigin();
  const key = resolveKey();
  const keyLocation = `${origin}/${key}.txt`;
  const { clean, dropped } = sanitizeUrls(urls, origin);

  const result: IndexNowResult = {
    submitted: 0,
    batches: 0,
    ok: true,
    statuses: [],
    outcomes: [],
    errors: [],
    payloadMeta: { host: CANONICAL_HOST, key, keyLocation, totalUrls: clean.length },
  };

  if (dropped.length > 0) {
    log(`dropped ${dropped.length} non-canonical URL(s) (not https://${CANONICAL_HOST}): ${dropped.slice(0, 5).join(', ')}`);
  }

  const validation = validateIndexNowSubmission({ host: CANONICAL_HOST, key, keyLocation, urls: clean });
  for (const w of validation.warnings) log('warning:', w);
  if (!validation.valid) {
    result.ok = false;
    result.errors.push(...validation.errors);
    log('aborting before submit — validation failed:');
    for (const e of validation.errors) log('  -', e);
    return result;
  }

  debug('payload meta:', JSON.stringify(result.payloadMeta));

  const body = { host: CANONICAL_HOST, key, keyLocation };
  const batches = chunk(clean, MAX_URLS_PER_BATCH);

  for (let i = 0; i < batches.length; i++) {
    const outcome = await postBatch(batches[i], body);
    result.outcomes.push(outcome);
    result.statuses.push(outcome.status);
    result.batches++;
    if (outcome.accepted) {
      result.submitted += outcome.count;
    } else {
      result.ok = false;
      result.errors.push(
        `batch ${i + 1}/${batches.length} failed: HTTP ${outcome.status}${outcome.body ? ` — ${outcome.body.slice(0, 200)}` : ''}`,
      );
    }
    if (i < batches.length - 1) await sleep(INTER_BATCH_DELAY_MS);
  }

  return result;
}
