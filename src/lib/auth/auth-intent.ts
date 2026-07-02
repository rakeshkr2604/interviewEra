/**
 * Auth V2 — signup/login intent query param (`?intent=`).
 */

export const AUTH_INTENTS = ['candidate', 'college', 'business'] as const;

export type AuthIntent = (typeof AUTH_INTENTS)[number];

export const DEFAULT_AUTH_INTENT: AuthIntent = 'candidate';

export function isAuthIntent(value: string | null | undefined): value is AuthIntent {
  if (!value) return false;
  return (AUTH_INTENTS as readonly string[]).includes(value);
}

export function parseAuthIntent(raw: string | null | undefined): AuthIntent {
  const trimmed = raw?.trim();
  return isAuthIntent(trimmed) ? trimmed : DEFAULT_AUTH_INTENT;
}

/**
 * Read intent from URL search params; defaults to candidate.
 */
export function parseIntentFromSearchParams(params: URLSearchParams): AuthIntent {
  return parseAuthIntent(params.get('intent'));
}
