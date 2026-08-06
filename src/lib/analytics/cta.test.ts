import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackLandingCtaClicked } from './cta';
import { CTA_KEYS } from './cta-keys';

describe('trackLandingCtaClicked', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('window', {
      location: { pathname: '/' },
      dispatchEvent: vi.fn(),
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('dispatches landing_cta_clicked with snake_case cta_key', () => {
    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.START_FREE_INTERVIEW,
      ctaText: 'Start Free',
      section: 'hero',
    });

    const dispatch = window.dispatchEvent as ReturnType<typeof vi.fn>;
    expect(dispatch).toHaveBeenCalledTimes(1);
    const event = dispatch.mock.calls[0]?.[0] as CustomEvent;
    expect(event.type).toBe('ie-product-event');
    expect(event.detail.event_name).toBe('landing_cta_clicked');
    expect(event.detail.cta_key).toBe('start_free_interview');
  });

  it('beacons durable CTA click to /api/analytics/cta-click', () => {
    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.TOOL_CTA,
      ctaText: 'Start practicing free',
      section: 'tool_cta',
      page: '/tools/ats-checker/results',
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/cta-click',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
      }),
    );
    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body)) as Record<string, string>;
    expect(body.cta_key).toBe('tool_cta');
    expect(body.page).toBe('/tools/ats-checker/results');
  });

  it('dedupes rapid duplicate clicks', () => {
    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.SIGN_UP,
      ctaText: 'Sign up',
      section: 'navbar',
    });
    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.SIGN_UP,
      ctaText: 'Sign up',
      section: 'navbar',
    });

    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
