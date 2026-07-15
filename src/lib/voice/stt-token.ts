export interface STTTokenResponse {
  token: string;
  expires_in_seconds: number;
  interview_id: string;
  issued_at: string;
  session_lease_id?: string;
  quota_remaining_s?: number;
  quota_warning?: string;
  fallback?: 'text_mode';
}

export interface FetchSTTTokenOptions {
  refreshLeaseId?: string;
}

export class STTTokenError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  readonly fallback: 'text_mode' | null;
  readonly isRateLimit: boolean;

  constructor(
    message: string,
    status: number,
    opts?: { retryAfterSeconds?: number | null; fallback?: 'text_mode' | null },
  ) {
    super(message);
    this.name = 'STTTokenError';
    this.status = status;
    this.retryAfterSeconds = opts?.retryAfterSeconds ?? null;
    this.fallback = opts?.fallback ?? null;
    this.isRateLimit = status === 429;
  }
}

function parseRetryAfter(res: Response): number | null {
  const raw = res.headers.get('Retry-After');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.ceil(n) : null;
}

async function parseTokenResponse(res: Response): Promise<STTTokenResponse> {
  const data = (await res.json()) as STTTokenResponse & {
    error?: string;
    fallback?: 'text_mode';
  };

  if (res.status === 401) {
    throw new STTTokenError('Please sign in to use voice recording.', 401);
  }
  if (res.status === 403) {
    throw new STTTokenError('Voice recording is only available during an active interview.', 403);
  }
  if (res.status === 429) {
    const retryAfterSeconds = parseRetryAfter(res);
    throw new STTTokenError(
      data.error ?? 'Too many recording sessions. Please wait a moment and try again.',
      429,
      { retryAfterSeconds, fallback: data.fallback === 'text_mode' ? 'text_mode' : null },
    );
  }
  if (res.status === 503) {
    throw new STTTokenError('Voice recording is not available right now. Please use text mode.', 503);
  }
  if (!res.ok) {
    throw new STTTokenError(data.error ?? 'Could not start voice recording. Please try again.', res.status);
  }
  if (!data.token) {
    throw new STTTokenError('Invalid response from voice service.', 502);
  }
  return data;
}

/**
 * Fetches a short-lived (120 s) Deepgram token from the server.
 */
export async function fetchSTTToken(interviewId: string): Promise<string> {
  const data = await fetchSTTTokenWithMeta(interviewId);
  return data.token;
}

/** Returns expiry metadata for session refresh scheduling. */
export async function fetchSTTTokenWithMeta(
  interviewId: string,
  opts?: FetchSTTTokenOptions,
): Promise<STTTokenResponse> {
  const body: Record<string, string> = { interview_id: interviewId };
  if (opts?.refreshLeaseId) {
    body.refresh_lease_id = opts.refreshLeaseId;
  }
  const res = await fetch('/api/stt/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseTokenResponse(res);
}

export interface FetchSTTTokenWithRetryOptions extends FetchSTTTokenOptions {
  maxAttempts?: number;
  onRetry?: (attempt: number, waitMs: number, error: STTTokenError) => void;
}

/**
 * Token fetch with exponential backoff on 429 / transient 502.
 * Honors Retry-After when present.
 */
export async function fetchSTTTokenWithRetry(
  interviewId: string,
  opts?: FetchSTTTokenWithRetryOptions,
): Promise<STTTokenResponse> {
  const maxAttempts = opts?.maxAttempts ?? 4;
  let lastError: STTTokenError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fetchSTTTokenWithMeta(interviewId, {
        refreshLeaseId: opts?.refreshLeaseId,
      });
    } catch (err) {
      if (!(err instanceof STTTokenError)) {
        throw err;
      }
      lastError = err;
      const isQuotaFallback = err.fallback === 'text_mode';
      const isRetryable =
        !isQuotaFallback &&
        (err.isRateLimit || err.status === 502 || err.status >= 500);
      if (!isRetryable || attempt >= maxAttempts - 1) {
        throw err;
      }
      // Cap the wait even when the server reports a long retryAfterSeconds (abuse-prevention
      // windows can be tens of minutes). Blocking the UI on "Connecting microphone…" for that
      // long is worse than giving up after a bounded wait and falling back to text mode —
      // the candidate can always retry voice manually once the real window has passed.
      const MAX_RETRY_WAIT_MS = 15_000;
      const waitMs =
        err.retryAfterSeconds != null
          ? Math.min(err.retryAfterSeconds * 1000, MAX_RETRY_WAIT_MS)
          : Math.min(16_000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 400);
      opts?.onRetry?.(attempt + 1, waitMs, err);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  throw lastError ?? new STTTokenError('Could not start voice recording.', 502);
}

export function is429Error(err: unknown): boolean {
  return err instanceof STTTokenError && err.isRateLimit;
}

/** Release server-side STT session lease (concurrency + usage accounting). */
export function releaseSTTSession(
  interviewId: string,
  sessionLeaseId: string,
  durationSeconds?: number,
  opts?: { beacon?: boolean },
): void {
  const payload = JSON.stringify({
    interview_id: interviewId,
    session_lease_id: sessionLeaseId,
    ...(durationSeconds != null ? { duration_seconds: durationSeconds } : {}),
  });

  if (opts?.beacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    navigator.sendBeacon(
      '/api/stt/release',
      new Blob([payload], { type: 'application/json' }),
    );
    return;
  }

  void fetch('/api/stt/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* best-effort */
  });
}

export function tokenErrorMessage(err: unknown): string {
  if (err instanceof STTTokenError) {
    if (err.fallback === 'text_mode') {
      return err.message;
    }
    if (err.isRateLimit) {
      // This is the terminal message shown after retries are exhausted (see
      // fetchSTTTokenWithRetry's bounded wait) — do not imply retries are
      // still happening, since they are not.
      return 'Voice service is busy right now. Please type your answer — you can try voice again on a later question.';
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Could not start voice recording.';
}
