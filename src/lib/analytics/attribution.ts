/**
 * Unified marketing attribution — first-touch UTM capture and funnel enrichment.
 */

export const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];
export type AttributionData = Partial<Record<UtmKey, string>>;

const STORAGE_KEY = 'ie_attribution';
const SESSION_KEY = 'ie_attribution_session';
export const ATTRIBUTION_COOKIE_NAME = 'ie_attribution';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function parseAttributionFromSearchParams(
  searchParams: URLSearchParams,
): AttributionData {
  const data: AttributionData = {};

  for (const key of UTM_KEYS) {
    const value = searchParams.get(key)?.trim();
    if (value) data[key] = value;
  }

  return data;
}

export function hasAttribution(data: AttributionData): boolean {
  return UTM_KEYS.some((key) => Boolean(data[key]));
}

export function enrichPayloadWithAttribution<T extends Record<string, unknown>>(
  payload: T,
  attribution?: AttributionData,
): T {
  const source = attribution ?? readClientAttribution();
  if (!hasAttribution(source)) return payload;

  const enriched = { ...payload } as T & AttributionData;

  for (const key of UTM_KEYS) {
    const value = source[key];
    if (value && enriched[key] === undefined) {
      (enriched as AttributionData)[key] = value;
    }
  }

  return enriched;
}

export function attributionToGa4Params(
  attribution: AttributionData,
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
): AttributionData {
  if (!cookieHeader) return {};

  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ATTRIBUTION_COOKIE_NAME}=`));

  if (!match) return {};

  const rawValue = match.slice(ATTRIBUTION_COOKIE_NAME.length + 1);

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const data: AttributionData = {};
    for (const key of UTM_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        data[key] = value.trim();
      }
    }
    return data;
  } catch {
    return {};
  }
}

export function getAttributionFromRequest(request: Request): AttributionData {
  return parseAttributionFromCookieHeader(request.headers.get('cookie'));
}

function readClientAttribution(): AttributionData {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as AttributionData;
      if (hasAttribution(parsed)) return parsed;
    }
  } catch {
    /* private mode / parse error */
  }

  try {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
      const parsed = JSON.parse(session) as AttributionData;
      if (hasAttribution(parsed)) return parsed;
    }
  } catch {
    /* private mode / parse error */
  }

  return parseAttributionFromCookieHeader(document.cookie);
}

function writeAttributionCookie(data: AttributionData): void {
  if (typeof document === 'undefined' || !hasAttribution(data)) return;

  const value = encodeURIComponent(JSON.stringify(data));
  document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

/** Persist first-touch UTMs (localStorage + cookie) and latest session touch. */
export function persistAttribution(incoming: AttributionData): AttributionData {
  if (typeof window === 'undefined' || !hasAttribution(incoming)) {
    return readClientAttribution();
  }

  const existing = readClientAttribution();
  const firstTouch: AttributionData = { ...existing };

  for (const key of UTM_KEYS) {
    if (!firstTouch[key] && incoming[key]) {
      firstTouch[key] = incoming[key];
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(firstTouch));
  } catch {
    /* private mode */
  }

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(incoming));
  } catch {
    /* private mode */
  }

  writeAttributionCookie(firstTouch);
  return firstTouch;
}

/** Read URL/search params and persist when UTMs are present. */
export function captureAttributionFromSearchParams(
  searchParams: URLSearchParams,
): AttributionData {
  const incoming = parseAttributionFromSearchParams(searchParams);
  if (!hasAttribution(incoming)) {
    return readClientAttribution();
  }
  return persistAttribution(incoming);
}

export function getStoredAttribution(): AttributionData {
  return readClientAttribution();
}
