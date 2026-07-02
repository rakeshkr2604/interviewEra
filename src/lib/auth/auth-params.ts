/**
 * Auth V2 — centralized query-param parsing and open-redirect guards.
 * Consumers migrate incrementally; legacy inline checks remain until wired.
 */

const DEFAULT_POST_AUTH_PATH = '/dashboard';

/**
 * Same-origin relative path safe for post-auth redirects.
 * Blocks protocol-relative (`//`) and scheme injection (`javascript:`).
 */
export function isSafePath(path: string | null | undefined): path is string {
  if (!path || typeof path !== 'string') return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) return false;
  if (trimmed.startsWith('//')) return false;
  if (trimmed.includes(':')) return false;
  return true;
}

/**
 * Returns a validated redirect path or the default dashboard route.
 */
export function sanitizeNext(
  raw: string | null | undefined,
  fallback: string = DEFAULT_POST_AUTH_PATH,
): string {
  return isSafePath(raw) ? raw : fallback;
}

export type SessionRedirectReason = 'session_expired' | 'session_required';

export interface ParsedAuthParams {
  next?: string;
  email?: string;
  reason?: SessionRedirectReason;
}

function parseSessionReason(raw: string | null): SessionRedirectReason | undefined {
  if (raw === 'session_expired' || raw === 'session_required') return raw;
  return undefined;
}

/**
 * Parse auth-related search params from a URLSearchParams instance.
 * `intent` is parsed in auth-intent.ts (P0-2).
 */
export function parseAuthParams(params: URLSearchParams): ParsedAuthParams {
  const result: ParsedAuthParams = {};

  const rawNext = params.get('next')?.trim();
  if (isSafePath(rawNext)) {
    result.next = rawNext;
  }

  const rawEmail = params.get('email')?.trim();
  if (rawEmail && rawEmail.length > 0) {
    result.email = rawEmail;
  }

  const reason = parseSessionReason(params.get('reason'));
  if (reason) {
    result.reason = reason;
  }

  return result;
}
