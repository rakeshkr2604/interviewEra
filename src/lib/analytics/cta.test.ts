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

  it('dedupes rapid duplicate clicks', () => {
    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.FOR_TEAMS,
      ctaText: 'For Teams',
      section: 'navbar',
    });
    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.FOR_TEAMS,
      ctaText: 'For Teams',
      section: 'navbar',
    });

    expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
  });
});
