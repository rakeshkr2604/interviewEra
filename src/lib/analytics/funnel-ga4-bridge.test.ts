import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAnalyticsDedupeForTests } from '@/lib/analytics/dedupe';

const trackFunnelEvent = vi.fn();

vi.mock('@/lib/analytics/funnel', () => ({
  trackFunnelEvent: (...args: unknown[]) => trackFunnelEvent(...args),
}));

import {
  trackPlanSelected,
  trackPricingPageViewedOnce,
  trackPromotionViewedOnce,
} from '@/lib/analytics/funnel-ga4-bridge';

describe('conversion funnel GA4 bridge', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {});
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
  });

  afterEach(() => {
    resetAnalyticsDedupeForTests();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('deduplicates pricing_page_viewed within a browser session', () => {
    trackPricingPageViewedOnce('/pricing', false);
    trackPricingPageViewedOnce('/pricing', false);

    expect(trackFunnelEvent).toHaveBeenCalledTimes(1);
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'pricing_page_viewed',
      expect.objectContaining({ sourcePage: '/pricing', authenticated: false }),
    );
  });

  it('fires plan_selected for each explicit choice', () => {
    trackPlanSelected({
      plan: 'starter',
      sourcePage: '/pricing',
      source: 'pricing_grid',
    });

    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'plan_selected',
      expect.objectContaining({ plan: 'starter', sourcePage: '/pricing' }),
    );
  });

  it('fires promotion_viewed only for an active, real discount', () => {
    const base = {
      plan: 'pro' as const,
      sourcePage: '/pricing' as const,
      campaignCodeId: 'campaign-1',
      discountPaise: 10000,
      finalAmountPaise: 39900,
    };
    trackPromotionViewedOnce({ ...base, isActive: false });
    trackPromotionViewedOnce({ ...base, isActive: true });
    trackPromotionViewedOnce({ ...base, isActive: true });

    expect(trackFunnelEvent).toHaveBeenCalledTimes(1);
    expect(trackFunnelEvent).toHaveBeenCalledWith(
      'promotion_viewed',
      expect.objectContaining({
        plan: 'pro',
        campaignCodeId: 'campaign-1',
        discountPaise: 10000,
      }),
    );
  });
});
