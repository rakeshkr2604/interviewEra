export interface STTTokenResponse {
  token: string
  expires_in_seconds: number
  interview_id: string
  issued_at: string
  session_lease_id?: string
  quota_remaining_s?: number
  quota_warning?: string
  fallback?: 'text_mode'
}

export interface FetchSTTTokenOptions {
  refreshLeaseId?: string
  /** When true, ignore any cached token and mint/fetch fresh. */
  bypassCache?: boolean
}

export class STTTokenError extends Error {
  readonly status: number
  readonly retryAfterSeconds: number | null
  readonly fallback: 'text_mode' | null
  readonly isRateLimit: boolean

  constructor(
    message: string,
    status: number,
    opts?: { retryAfterSeconds?: number | null; fallback?: 'text_mode' | null },
  ) {
    super(message)
    this.name = 'STTTokenError'
    this.status = status
    this.retryAfterSeconds = opts?.retryAfterSeconds ?? null
    this.fallback = opts?.fallback ?? null
    this.isRateLimit = status === 429
  }
}

function parseRetryAfter(res: Response): number | null {
  const raw = res.headers.get('Retry-After')
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : null
}

async function parseTokenResponse(res: Response): Promise<STTTokenResponse> {
  const data = (await res.json()) as STTTokenResponse & {
    error?: string
    fallback?: 'text_mode'
  }

  if (res.status === 401) {
    throw new STTTokenError('Please sign in to use voice recording.', 401)
  }
  if (res.status === 403) {
    throw new STTTokenError('Voice recording is only available during an active interview.', 403)
  }
  if (res.status === 429) {
    const retryAfterSeconds = parseRetryAfter(res)
    throw new STTTokenError(
      data.error ?? 'Too many recording sessions. Please wait a moment and try again.',
      429,
      { retryAfterSeconds, fallback: data.fallback === 'text_mode' ? 'text_mode' : null },
    )
  }
  if (res.status === 503) {
    throw new STTTokenError('Voice recording is not available right now. Please use text mode.', 503)
  }
  if (!res.ok) {
    throw new STTTokenError(data.error ?? 'Could not start voice recording. Please try again.', res.status)
  }
  if (!data.token) {
    throw new STTTokenError('Invalid response from voice service.', 502)
  }
  return data
}

/** Min remaining TTL before a cached token may be reused (must outlive WS connect). */
const CACHE_MIN_REMAINING_MS = 35_000

type CachedSTTToken = {
  interviewId: string
  data: STTTokenResponse
  expiresAtMs: number
}

let cachedSTTToken: CachedSTTToken | null = null
/** In-flight prefetch/mint — kickoff awaits this instead of double-minting. */
const inFlightByInterview = new Map<string, Promise<STTTokenResponse>>()

export function putCachedSTTToken(interviewId: string, data: STTTokenResponse): void {
  const issued = Date.parse(data.issued_at)
  const expiresAtMs =
    (Number.isFinite(issued) ? issued : Date.now()) + data.expires_in_seconds * 1000
  cachedSTTToken = { interviewId, data, expiresAtMs }
}

/** Peek without consuming — used by tests / diagnostics. */
export function peekCachedSTTToken(interviewId: string): STTTokenResponse | null {
  if (!cachedSTTToken || cachedSTTToken.interviewId !== interviewId) return null
  if (cachedSTTToken.expiresAtMs - Date.now() < CACHE_MIN_REMAINING_MS) return null
  return cachedSTTToken.data
}

/**
 * Consume a still-valid cached token for this interview (one-shot).
 * Returns null when missing, expired, or lease mismatch on refresh.
 */
export function takeCachedSTTToken(
  interviewId: string,
  opts?: { refreshLeaseId?: string },
): STTTokenResponse | null {
  if (!cachedSTTToken || cachedSTTToken.interviewId !== interviewId) return null
  if (cachedSTTToken.expiresAtMs - Date.now() < CACHE_MIN_REMAINING_MS) {
    cachedSTTToken = null
    return null
  }
  if (
    opts?.refreshLeaseId &&
    cachedSTTToken.data.session_lease_id &&
    cachedSTTToken.data.session_lease_id !== opts.refreshLeaseId
  ) {
    return null
  }
  const data = cachedSTTToken.data
  cachedSTTToken = null
  return data
}

export function clearCachedSTTToken(interviewId?: string): void {
  if (!cachedSTTToken) return
  if (interviewId && cachedSTTToken.interviewId !== interviewId) return
  cachedSTTToken = null
}

/** @internal test helper */
export function _resetSTTTokenCacheForTests(): void {
  cachedSTTToken = null
  inFlightByInterview.clear()
}

/**
 * Fetches a short-lived Deepgram token from the server (TTL from stt-token-budget).
 */
export async function fetchSTTToken(interviewId: string): Promise<string> {
  const data = await fetchSTTTokenWithMeta(interviewId)
  return data.token
}

/** Returns expiry metadata for session refresh scheduling. */
export async function fetchSTTTokenWithMeta(
  interviewId: string,
  opts?: FetchSTTTokenOptions,
): Promise<STTTokenResponse> {
  const body: Record<string, string> = { interview_id: interviewId }
  if (opts?.refreshLeaseId) {
    body.refresh_lease_id = opts.refreshLeaseId
  }
  const res = await fetch('/api/stt/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await parseTokenResponse(res)
  putCachedSTTToken(interviewId, data)
  return data
}

export interface FetchSTTTokenWithRetryOptions extends FetchSTTTokenOptions {
  maxAttempts?: number
  onRetry?: (attempt: number, waitMs: number, error: STTTokenError) => void
  /**
   * When true, leave the fetched token in cache for a later take() instead of
   * consuming it immediately (hides token latency behind TTS playback).
   */
  prefetchOnly?: boolean
}

/**
 * Token fetch with exponential backoff on 429 / transient 502.
 * Honors Retry-After when present.
 * Reuses a still-valid cached token unless bypassCache is set.
 */
export async function fetchSTTTokenWithRetry(
  interviewId: string,
  opts?: FetchSTTTokenWithRetryOptions,
): Promise<STTTokenResponse> {
  // Join any in-flight mint (including prefetchOnly). Previously prefetchOnly
  // bypassed this and could stampede /api/stt/token during StrictMode / warmup.
  if (!opts?.bypassCache) {
    if (opts?.prefetchOnly) {
      const peeked = peekCachedSTTToken(interviewId)
      if (
        peeked &&
        (!opts.refreshLeaseId ||
          !peeked.session_lease_id ||
          peeked.session_lease_id === opts.refreshLeaseId)
      ) {
        return peeked
      }
    } else {
      const cached = takeCachedSTTToken(interviewId, {
        refreshLeaseId: opts?.refreshLeaseId,
      })
      if (cached) return cached
    }

    const inFlight = inFlightByInterview.get(interviewId)
    if (inFlight) {
      const data = await inFlight
      if (opts?.prefetchOnly) {
        const peeked = peekCachedSTTToken(interviewId)
        if (peeked) return peeked
        if (
          !opts.refreshLeaseId ||
          !data.session_lease_id ||
          data.session_lease_id === opts.refreshLeaseId
        ) {
          return data
        }
      } else {
        // Prefer consuming the just-finished prefetch from cache.
        const fromCache = takeCachedSTTToken(interviewId, {
          refreshLeaseId: opts?.refreshLeaseId,
        })
        if (fromCache) return fromCache
        if (
          !opts?.refreshLeaseId ||
          !data.session_lease_id ||
          data.session_lease_id === opts.refreshLeaseId
        ) {
          return data
        }
      }
    }
  }

  const maxAttempts = opts?.maxAttempts ?? 4
  let lastError: STTTokenError | null = null

  const run = async (): Promise<STTTokenResponse> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const data = await fetchSTTTokenWithMeta(interviewId, {
          refreshLeaseId: opts?.refreshLeaseId,
          bypassCache: opts?.bypassCache,
        })
        // fetchSTTTokenWithMeta already put() into cache. Prefetch leaves it for
        // kickoff; normal start consumes so a second caller cannot reuse a live key.
        if (!opts?.prefetchOnly) {
          takeCachedSTTToken(interviewId, { refreshLeaseId: opts?.refreshLeaseId })
        }
        return data
      } catch (err) {
        if (!(err instanceof STTTokenError)) {
          throw err
        }
        lastError = err
        const isQuotaFallback = err.fallback === 'text_mode'
        const isRetryable =
          !isQuotaFallback &&
          (err.isRateLimit || err.status === 502 || err.status >= 500)
        if (!isRetryable || attempt >= maxAttempts - 1) {
          throw err
        }
        const MAX_RETRY_WAIT_MS = 15_000
        const waitMs =
          err.retryAfterSeconds != null
            ? Math.min(err.retryAfterSeconds * 1000, MAX_RETRY_WAIT_MS)
            : Math.min(16_000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 400)
        opts?.onRetry?.(attempt + 1, waitMs, err)
        await new Promise((r) => setTimeout(r, waitMs))
      }
    }

    throw lastError ?? new STTTokenError('Could not start voice recording.', 502)
  }

  // Register the in-flight promise BEFORE starting async work so a synchronous
  // second caller (StrictMode / parallel prefetch) joins instead of double-minting.
  if (!opts?.bypassCache) {
    const raced = inFlightByInterview.get(interviewId)
    if (raced) {
      const data = await raced
      if (opts?.prefetchOnly) {
        const peeked = peekCachedSTTToken(interviewId)
        if (peeked) return peeked
        return data
      }
      const fromCache = takeCachedSTTToken(interviewId, {
        refreshLeaseId: opts?.refreshLeaseId,
      })
      if (fromCache) return fromCache
      return data
    }

    const pending = run()
    inFlightByInterview.set(interviewId, pending)
    try {
      return await pending
    } finally {
      if (inFlightByInterview.get(interviewId) === pending) {
        inFlightByInterview.delete(interviewId)
      }
    }
  }

  return run()
}

export function is429Error(err: unknown): boolean {
  return err instanceof STTTokenError && err.isRateLimit
}

/** Release server-side STT session lease (concurrency + usage accounting). */
export function releaseSTTSession(
  interviewId: string,
  sessionLeaseId: string,
  durationSeconds?: number,
  opts?: { beacon?: boolean },
): void {
  clearCachedSTTToken(interviewId)
  const payload = JSON.stringify({
    interview_id: interviewId,
    session_lease_id: sessionLeaseId,
    ...(durationSeconds != null ? { duration_seconds: durationSeconds } : {}),
  })

  if (opts?.beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(
      '/api/stt/release',
      new Blob([payload], { type: 'application/json' }),
    )
    return
  }

  void fetch('/api/stt/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* best-effort */
  })
}

export function tokenErrorMessage(err: unknown): string {
  if (err instanceof STTTokenError) {
    if (err.fallback === 'text_mode') {
      return err.message
    }
    if (err.isRateLimit) {
      // This is the terminal message shown after retries are exhausted (see
      // fetchSTTTokenWithRetry's bounded wait) — do not imply retries are
      // still happening, since they are not.
      return 'Voice service is busy right now. Please type your answer — you can try voice again on a later question.'
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Could not start voice recording.'
}
