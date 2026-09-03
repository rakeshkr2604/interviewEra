import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ATTRIBUTION_MAX_VALUE_LENGTH,
  ATTRIBUTION_COOKIE_NAME,
  captureAttributionFromSearchParams,
  enrichPayloadWithAttribution,
  getFirstTouch,
  getLatestTouch,
  getStoredAttribution,
  hasAttribution,
  mergeAttribution,
  normalizeAttribution,
  parseAttributionFromCookieHeader,
  parseAttributionFromSearchParams,
  persistAttribution,
  resolveDurableEventAttribution,
  UTM_KEYS,
} from '@/lib/analytics/attribution';

function mockBrowserStorage() {
  const stores: Record<'local' | 'session', Record<string, string>> = {
    local: {},
    session: {},
  };

  const makeStorage = (kind: 'local' | 'session'): Storage =>
    ({
      getItem(key: string) {
        return stores[kind][key] ?? null;
      },
      setItem(key: string, value: string) {
        stores[kind][key] = value;
      },
      removeItem(key: string) {
        delete stores[kind][key];
      },
      clear() {
        stores[kind] = {};
      },
      key(index: number) {
        return Object.keys(stores[kind])[index] ?? null;
      },
      get length() {
        return Object.keys(stores[kind]).length;
      },
    }) as Storage;

  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', makeStorage('local'));
  vi.stubGlobal('sessionStorage', makeStorage('session'));
  vi.stubGlobal('document', { cookie: '' });

  return stores;
}

describe('normalizeAttribution', () => {
  it('normalizes valid attribution keys and trims values', () => {
    expect(
      normalizeAttribution({
        utm_source: '  creator  ',
        utm_medium: 'social',
        utm_campaign: 'launch',
        utm_content: 'banner',
        utm_term: 'mock interview',
      }),
    ).toEqual({
      utm_source: 'creator',
      utm_medium: 'social',
      utm_campaign: 'launch',
      utm_content: 'banner',
      utm_term: 'mock interview',
    });
  });

  it('keeps supported keys only', () => {
    expect(
      normalizeAttribution({
        utm_source: 'creator',
        gclid: 'ignored',
        referrer: 'ignored',
        utm_invalid: 'ignored',
      }),
    ).toEqual({ utm_source: 'creator' });
  });

  it('enforces maximum length by truncating', () => {
    const long = 'a'.repeat(ATTRIBUTION_MAX_VALUE_LENGTH + 40);
    const normalized = normalizeAttribution({ utm_source: long });
    expect(normalized.utm_source).toHaveLength(ATTRIBUTION_MAX_VALUE_LENGTH);
    expect(normalized.utm_source).toBe('a'.repeat(ATTRIBUTION_MAX_VALUE_LENGTH));
  });

  it('returns empty object for malformed, empty, or null input without throwing', () => {
    expect(normalizeAttribution(null)).toEqual({});
    expect(normalizeAttribution(undefined)).toEqual({});
    expect(normalizeAttribution('')).toEqual({});
    expect(normalizeAttribution(42)).toEqual({});
    expect(normalizeAttribution([])).toEqual({});
    expect(normalizeAttribution({})).toEqual({});
    expect(normalizeAttribution({ utm_source: '   ' })).toEqual({});
    expect(normalizeAttribution({ utm_source: 123 })).toEqual({});
  });

  it('strips control characters and rejects empty results', () => {
    expect(normalizeAttribution({ utm_source: 'good\nsource\t' })).toEqual({
      utm_source: 'goodsource',
    });
    expect(normalizeAttribution({ utm_source: '\u0000\u0007' })).toEqual({});
  });

  it('normalizes URLSearchParams input', () => {
    const params = new URLSearchParams('utm_source=youtube&utm_medium=video&noise=1');
    expect(normalizeAttribution(params)).toEqual({
      utm_source: 'youtube',
      utm_medium: 'video',
    });
  });

  it('handles malicious oversized payloads safely', () => {
    const payload: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      payload[key] = `${key}-${'x'.repeat(500)}`;
    }
    const normalized = normalizeAttribution(payload);
    for (const key of UTM_KEYS) {
      expect(normalized[key]).toHaveLength(ATTRIBUTION_MAX_VALUE_LENGTH);
    }
  });
});

describe('mergeAttribution', () => {
  it('fill-empty preserves existing first-touch values', () => {
    expect(
      mergeAttribution(
        { utm_source: 'first', utm_medium: 'email' },
        { utm_source: 'second', utm_campaign: 'spring' },
        'fill-empty',
      ),
    ).toEqual({
      utm_source: 'first',
      utm_medium: 'email',
      utm_campaign: 'spring',
    });
  });

  it('overwrite lets incoming replace existing values (latest-touch semantics)', () => {
    expect(
      mergeAttribution(
        { utm_source: 'first', utm_medium: 'email' },
        { utm_source: 'latest', utm_campaign: 'spring' },
        'overwrite',
      ),
    ).toEqual({
      utm_source: 'latest',
      utm_medium: 'email',
      utm_campaign: 'spring',
    });
  });

  it('normalizes untrusted merge inputs', () => {
    expect(
      mergeAttribution(
        { utm_source: '  first  ', junk: 'x' },
        { utm_source: 'second', utm_medium: 99 },
        'fill-empty',
      ),
    ).toEqual({ utm_source: 'first' });
  });
});

describe('parseAttributionFromSearchParams', () => {
  it('parses and normalizes search params', () => {
    const params = new URLSearchParams('utm_source=  tiktok &utm_campaign=creator');
    expect(parseAttributionFromSearchParams(params)).toEqual({
      utm_source: 'tiktok',
      utm_campaign: 'creator',
    });
  });
});

describe('parseAttributionFromCookieHeader', () => {
  it('parses encoded cookie JSON via normalization', () => {
    const payload = encodeURIComponent(JSON.stringify({ utm_source: ' creator ' }));
    const cookie = `${ATTRIBUTION_COOKIE_NAME}=${payload}`;
    expect(parseAttributionFromCookieHeader(cookie)).toEqual({ utm_source: 'creator' });
  });

  it('returns empty object for malformed cookie values', () => {
    expect(parseAttributionFromCookieHeader(`${ATTRIBUTION_COOKIE_NAME}=not-json`)).toEqual({});
    expect(parseAttributionFromCookieHeader(undefined)).toEqual({});
  });
});

describe('first-touch and latest-touch persistence', () => {
  beforeEach(() => {
    mockBrowserStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persistAttribution keeps first-touch immutable across later UTMs', () => {
    persistAttribution({ utm_source: 'creator-a', utm_medium: 'youtube' });
    const second = persistAttribution({ utm_source: 'creator-b', utm_campaign: 'new' });

    expect(second).toEqual({
      utm_source: 'creator-a',
      utm_medium: 'youtube',
      utm_campaign: 'new',
    });
    expect(getFirstTouch()).toEqual(second);
    expect(getLatestTouch()).toEqual({
      utm_source: 'creator-b',
      utm_campaign: 'new',
    });
  });

  it('getLatestTouch updates independently from first-touch', () => {
    persistAttribution({ utm_source: 'first' });
    persistAttribution({ utm_source: 'latest', utm_medium: 'paid' });

    expect(getFirstTouch()).toEqual({ utm_source: 'first', utm_medium: 'paid' });
    expect(getLatestTouch()).toEqual({ utm_source: 'latest', utm_medium: 'paid' });
  });

  it('getStoredAttribution preserves legacy read order for enrichment', () => {
    sessionStorage.setItem(
      'ie_attribution_session',
      JSON.stringify({ utm_source: 'session-latest' }),
    );
    expect(getStoredAttribution()).toEqual({ utm_source: 'session-latest' });

    localStorage.setItem(
      'ie_attribution',
      JSON.stringify({ utm_source: 'first-touch' }),
    );
    expect(getStoredAttribution()).toEqual({ utm_source: 'first-touch' });
  });

  it('captureAttributionFromSearchParams persists normalized values', () => {
    const params = new URLSearchParams('utm_source=  creator  &utm_medium=social');
    expect(captureAttributionFromSearchParams(params)).toEqual({
      utm_source: 'creator',
      utm_medium: 'social',
    });
    expect(getFirstTouch()).toEqual({
      utm_source: 'creator',
      utm_medium: 'social',
    });
  });

  it('does not inherit sessionStorage when persisting first-touch', () => {
    sessionStorage.setItem(
      'ie_attribution_session',
      JSON.stringify({ utm_source: 'session-only', utm_medium: 'newest' }),
    );

    const firstTouch = persistAttribution({
      utm_source: 'incoming',
      utm_campaign: 'spring',
    });

    expect(firstTouch).toEqual({
      utm_source: 'incoming',
      utm_campaign: 'spring',
    });
    expect(getFirstTouch()).toEqual(firstTouch);
    expect(getLatestTouch()).toEqual({
      utm_source: 'incoming',
      utm_campaign: 'spring',
    });
    expect(localStorage.getItem('ie_attribution')).toBe(JSON.stringify(firstTouch));
  });

  it('merges incoming into existing first-touch without reading sessionStorage', () => {
    localStorage.setItem(
      'ie_attribution',
      JSON.stringify({ utm_source: 'stored-first' }),
    );
    sessionStorage.setItem(
      'ie_attribution_session',
      JSON.stringify({ utm_source: 'session-latest', utm_medium: 'paid' }),
    );

    const firstTouch = persistAttribution({ utm_medium: 'email' });

    expect(firstTouch).toEqual({
      utm_source: 'stored-first',
      utm_medium: 'email',
    });
    expect(getLatestTouch()).toEqual({ utm_medium: 'email' });
  });
});

describe('resolveDurableEventAttribution', () => {
  function requestWithCookie(
    cookie: string | undefined,
    body?: Record<string, unknown>,
  ): Request {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cookie) headers.cookie = cookie;
    return new Request('http://localhost/test', {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  it('prefers server cookie over conflicting client attribution', () => {
    const payload = encodeURIComponent(JSON.stringify({ utm_source: 'server' }));
    const req = requestWithCookie(`${ATTRIBUTION_COOKIE_NAME}=${payload}`, {
      utm_source: 'client',
      utm_medium: 'social',
    });
    expect(resolveDurableEventAttribution(req, { utm_source: 'client' })).toEqual({
      utm_source: 'server',
    });
  });

  it('falls back to client attribution when cookie is empty', () => {
    const req = requestWithCookie(undefined, {
      utm_source: 'client',
      utm_campaign: 'launch',
    });
    expect(
      resolveDurableEventAttribution(req, { utm_source: 'client', utm_campaign: 'launch' }),
    ).toEqual({
      utm_source: 'client',
      utm_campaign: 'launch',
    });
  });

  it('returns empty attribution for malformed cookie without throwing', () => {
    const req = requestWithCookie(`${ATTRIBUTION_COOKIE_NAME}=not-json`);
    expect(resolveDurableEventAttribution(req)).toEqual({});
  });
});

describe('existing caller compatibility', () => {
  it('hasAttribution detects normalized records', () => {
    expect(hasAttribution({ utm_source: 'creator' })).toBe(true);
    expect(hasAttribution({})).toBe(false);
  });

  it('enrichPayloadWithAttribution still fills missing keys only', () => {
    const enriched = enrichPayloadWithAttribution(
      { plan: 'starter' },
      { utm_source: 'creator', utm_medium: 'social' },
    );
    expect(enriched).toEqual({
      plan: 'starter',
      utm_source: 'creator',
      utm_medium: 'social',
    });
    expect(
      enrichPayloadWithAttribution(
        { plan: 'starter', utm_source: 'existing' },
        { utm_source: 'ignored', utm_campaign: 'launch' },
      ),
    ).toEqual({
      plan: 'starter',
      utm_source: 'existing',
      utm_campaign: 'launch',
    });
  });
});
