import { afterEach, describe, expect, it, vi } from 'vitest';
import { markAnalyticsDedupeKey, resetAnalyticsDedupeForTests } from '@/lib/analytics/dedupe';
import { normalizePagePath } from '@/lib/analytics/page-view';

vi.mock('@/lib/analytics/gtag', () => ({
  pageview: vi.fn(),
  trackEvent: vi.fn(),
  isGaEnabled: true,
}));

vi.mock('@/lib/analytics/product-events', () => ({
  trackProductEventClient: vi.fn(),
}));

import { trackDurablePageView } from '@/lib/analytics/page-view';
import { pageview, trackEvent } from '@/lib/analytics/gtag';
import { trackProductEventClient } from '@/lib/analytics/product-events';

describe('normalizePagePath', () => {
  it('ensures leading slash', () => {
    expect(normalizePagePath('pricing')).toBe('/pricing');
    expect(normalizePagePath('/campus')).toBe('/campus');
  });
});

describe('markAnalyticsDedupeKey', () => {
  afterEach(() => {
    resetAnalyticsDedupeForTests();
  });

  it('allows first fire and blocks duplicate in same session', () => {
    expect(markAnalyticsDedupeKey('test:', '/a')).toBe(true);
    expect(markAnalyticsDedupeKey('test:', '/a')).toBe(false);
  });
});

describe('trackDurablePageView', () => {
  afterEach(() => {
    resetAnalyticsDedupeForTests();
    vi.clearAllMocks();
  });

  it('fires GA4 + product event once and beacons persist endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('sessionStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
    });

    expect(trackDurablePageView('/pricing')).toBe(true);
    expect(trackDurablePageView('/pricing')).toBe(false);
    expect(pageview).toHaveBeenCalledWith('/pricing');
    expect(trackEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({ page_path: '/pricing' }));
    expect(trackProductEventClient).toHaveBeenCalledWith('page_view', expect.objectContaining({ page_path: '/pricing' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('persists landing UTMs on the first durable page_view beacon before cookie exists', () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
    });
    vi.stubGlobal('sessionStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
    });

    trackDurablePageView(
      '/some-page?utm_source=x&utm_medium=y&utm_campaign=z',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      path: '/some-page?utm_source=x&utm_medium=y&utm_campaign=z',
      utm_source: 'x',
      utm_medium: 'y',
      utm_campaign: 'z',
    });
    expect(document.cookie).toContain('ie_attribution');
  });
});
