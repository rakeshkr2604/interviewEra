/**
 * Unified marketing attribution — first-touch UTM capture and funnel enrichment.
 *
 * Phase 1: canonical `Attribution` model, normalization, and explicit first/latest
 * touch helpers. Event enrichment still reads first-touch only (Phase 2).
 */

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

/** Maximum stored length per UTM value (trimmed, after control-char strip). */
export const ATTRIBUTION_MAX_VALUE_LENGTH = 128;

export type UtmKey = (typeof UTM_KEYS)[number];

/** Canonical attribution record — supported UTM keys only, normalized string values. */
export type Attribution = Partial<Record<UtmKey, string>>;

/** @deprecated Prefer `Attribution` — retained for existing imports. */
export type AttributionData = Attribution;

const STORAGE_KEY = 'ie_attribution';
const SESSION_KEY = 'ie_attribution_session';
export const ATTRIBUTION_COOKIE_NAME = 'ie_attribution';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const UTM_KEY_SET = new Set<string>(UTM_KEYS);

export type AttributionMergeMode = 'fill-empty' | 'overwrite';

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/g;

function isUtmKey(key: string): key is UtmKey {
  return UTM_KEY_SET.has(key);
}

function sanitizeAttributionValue(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;

  const trimmed = raw.replace(CONTROL_CHAR_PATTERN, '').trim();
  if (!trimmed) return undefined;

  if (trimmed.length <= ATTRIBUTION_MAX_VALUE_LENGTH) return trimmed;
  return trimmed.slice(0, ATTRIBUTION_MAX_VALUE_LENGTH);
}

/**
 * Normalize unknown/untrusted input into a canonical Attribution object.
 * Never throws; drops unsupported keys and invalid values.
 */
export function normalizeAttribution(input: unknown): Attribution {
  if (input == null) return {};

  if (input instanceof URLSearchParams) {
    const fromParams: Record<string, unknown> = {};
    for (const key of UTM_KEYS) {
      const value = input.get(key);
      if (value != null) fromParams[key] = value;
    }
    return normalizeAttribution(fromParams);
  }

  if (typeof input !== 'object') return {};

  const out: Attribution = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isUtmKey(key)) continue;
    const sanitized = sanitizeAttributionValue(value);
    if (sanitized) out[key] = sanitized;
  }
  return out;
}

/**
 * Deterministic merge of two attribution records.
 * - `fill-empty`: preserve existing values; incoming fills only empty keys (first-touch).
 * - `overwrite`: incoming wins when present; base fills gaps (latest-touch).
 */
export function mergeAttribution(
  base: unknown,
  incoming: unknown,
  mode: AttributionMergeMode = 'fill-empty',
): Attribution {
  const left = normalizeAttribution(base);
  const right = normalizeAttribution(incoming);
  const out: Attribution = { ...left };

  for (const key of UTM_KEYS) {
    const baseValue = left[key];
    const incomingValue = right[key];

    if (mode === 'fill-empty') {
      if (!baseValue && incomingValue) out[key] = incomingValue;
      continue;
    }

    if (incomingValue) {
      out[key] = incomingValue;
    } else if (baseValue) {
      out[key] = baseValue;
    }
  }

  return out;
}

export function parseAttributionFromSearchParams(
  searchParams: URLSearchParams,
): Attribution {
  return normalizeAttribution(searchParams);
}

export function hasAttribution(data: Attribution): boolean {
  return UTM_KEYS.some((key) => Boolean(data[key]));
}

export function enrichPayloadWithAttribution<T extends Record<string, unknown>>(
  payload: T,
  attribution?: Attribution,
): T {
  const source = attribution ?? readClientAttribution();
  if (!hasAttribution(source)) return payload;

  const enriched = { ...payload } as T & Attribution;

  for (const key of UTM_KEYS) {
    const value = source[key];
    if (value && enriched[key] === undefined) {
      (enriched as Attribution)[key] = value;
    }
  }

  return enriched;
}

export function attributionToGa4Params(
  attribution: Attribution,
): Record<string, string> {
  const ga: Record<string, string> = {};

  for (const key of UTM_KEYS) {
    const value = attribution[key];
    if (value) ga[key] = value;
  }

  return ga;
}

export function parseAttributionFromCookieHeader(
  cookieHeader: string | null | undefined,
): Attribution {
  if (!cookieHeader) return {};

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ATTRIBUTION_COOKIE_NAME}=`));

  if (!match) return {};

  const rawValue = match.slice(ATTRIBUTION_COOKIE_NAME.length + 1);

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as unknown;
    return normalizeAttribution(parsed);
  } catch {
    return {};
  }
}

export function getAttributionFromRequest(request: Request): Attribution {
  return parseAttributionFromCookieHeader(request.headers.get('cookie'));
}

/** Extract normalized UTM fields from an untrusted client record. */
export function pickAttributionFromRecord(record: Record<string, unknown>): Attribution {
  const slice: Record<string, unknown> = {};
  for (const key of UTM_KEYS) {
    if (key in record) slice[key] = record[key];
  }
  return normalizeAttribution(slice);
}

/**
 * Resolve attribution for durable analytics events.
 * Precedence: server cookie → valid client body fallback → none.
 */
export function resolveDurableEventAttribution(
  request: Request,
  clientRecord?: Record<string, unknown>,
): Attribution {
  const server = getAttributionFromRequest(request);
  if (hasAttribution(server)) return server;

  if (clientRecord) {
    const client = pickAttributionFromRecord(clientRecord);
    if (hasAttribution(client)) return client;
  }

  return {};
}

/** Flatten canonical attribution into durable event props (snake_case UTM keys). */
export function attributionToEventProps(attribution: Attribution): Record<string, string> {
  return attributionToGa4Params(attribution);
}

function readAttributionFromStorage(storage: Storage, key: string): Attribution {
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    return normalizeAttribution(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

/**
 * Resolve browser Storage without throwing when `window` is stubbed but
 * localStorage/sessionStorage are absent (Node vitest stubs).
 * `typeof localStorage` is safe even when the binding is undeclared.
 */
function getBrowserStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    if (kind === 'local') {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    }
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
}

/** First-touch attribution persisted in localStorage, falling back to the attribution cookie. */
export function getFirstTouch(): Attribution {
  const local = getBrowserStorage('local');
  if (local) {
    const fromLocal = readAttributionFromStorage(local, STORAGE_KEY);
    if (hasAttribution(fromLocal)) return fromLocal;
  }

  if (typeof document === 'undefined') return {};
  return parseAttributionFromCookieHeader(document.cookie);
}

/** Latest session attribution persisted in sessionStorage (not used for enrichment yet). */
export function getLatestTouch(): Attribution {
  const session = getBrowserStorage('session');
  if (!session) return {};
  return readAttributionFromStorage(session, SESSION_KEY);
}

/** Client read order preserved for enrichment: localStorage → sessionStorage → cookie. */
function readClientAttribution(): Attribution {
  const local = getBrowserStorage('local');
  if (local) {
    const fromLocal = readAttributionFromStorage(local, STORAGE_KEY);
    if (hasAttribution(fromLocal)) return fromLocal;
  }

  const session = getBrowserStorage('session');
  if (session) {
    const fromSession = readAttributionFromStorage(session, SESSION_KEY);
    if (hasAttribution(fromSession)) return fromSession;
  }

  if (typeof document === 'undefined') return {};
  return parseAttributionFromCookieHeader(document.cookie);
}

function writeAttributionCookie(data: Attribution): void {
  if (typeof document === 'undefined' || !hasAttribution(data)) return;

  const normalized = normalizeAttribution(data);
  const value = encodeURIComponent(JSON.stringify(normalized));
  document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** Persist first-touch UTMs (localStorage + cookie) and latest session touch. */
export function persistAttribution(incoming: Attribution): Attribution {
  if (typeof window === 'undefined') {
    return readClientAttribution();
  }

  const normalizedIncoming = normalizeAttribution(incoming);
  if (!hasAttribution(normalizedIncoming)) {
    return readClientAttribution();
  }

  // First-touch reads localStorage → cookie only; never sessionStorage/latest-touch.
  const firstTouch = mergeAttribution(getFirstTouch(), normalizedIncoming, 'fill-empty');

  const local = getBrowserStorage('local');
  if (local) {
    try {
      local.setItem(STORAGE_KEY, JSON.stringify(firstTouch));
    } catch {
      /* private mode */
    }
  }

  const session = getBrowserStorage('session');
  if (session) {
    try {
      session.setItem(SESSION_KEY, JSON.stringify(normalizedIncoming));
    } catch {
      /* private mode */
    }
  }

  writeAttributionCookie(firstTouch);
  return firstTouch;
}

/** Read URL/search params and persist when UTMs are present. */
export function captureAttributionFromSearchParams(
  searchParams: URLSearchParams,
): Attribution {
  const incoming = parseAttributionFromSearchParams(searchParams);
  if (!hasAttribution(incoming)) {
    return readClientAttribution();
  }
  return persistAttribution(incoming);
}

export function getStoredAttribution(): Attribution {
  return readClientAttribution();
}
