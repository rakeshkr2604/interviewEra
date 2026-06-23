import { trackEvent } from '@/lib/analytics/gtag';
import type { CommunityAnalyticsContext, CommunityAnalyticsEvent } from './types';

type CommunityEventPayload = CommunityAnalyticsContext &
  Record<string, string | number | boolean | undefined>;

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getReferralSource(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('utm_source') ??
      params.get('ref') ??
      document.referrer?.split('/')[2] ??
      undefined
    );
  } catch {
    return undefined;
  }
}

export function buildCommunityContext(
  partial: Pick<CommunityAnalyticsContext, 'placement' | 'platform'> &
    Partial<CommunityAnalyticsContext> &
    Record<string, string | number | boolean | undefined>,
): CommunityEventPayload {
  return {
    route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    device: getDeviceType(),
    referral_source: getReferralSource(),
    ...partial,
  };
}

export function trackCommunityEvent(
  event: CommunityAnalyticsEvent,
  params: CommunityEventPayload,
): void {
  trackEvent(event, {
    event_category: 'community',
    ...params,
  });
}

export function trackCommunityInteraction(
  event: CommunityAnalyticsEvent,
  params: Pick<CommunityAnalyticsContext, 'placement' | 'platform'> &
    Partial<CommunityAnalyticsContext> &
    Record<string, string | number | boolean | undefined>,
): void {
  trackCommunityEvent(event, buildCommunityContext(params));
}

export function trackCommunityView(
  placement: string,
  extra?: Record<string, string | number | boolean | undefined>,
): void {
  trackCommunityInteraction('community_banner_view', {
    platform: 'all',
    placement,
    ...extra,
  });
}

export function trackCommunityClick(
  event: CommunityAnalyticsEvent,
  platform: string,
  placement: string,
  extra?: Partial<CommunityAnalyticsContext>,
): void {
  trackCommunityInteraction(event, { platform, placement, ...extra });
}

/** Fired when user clicks through to an external join link */
export function trackCommunityJoin(platform: string, placement: string): void {
  trackCommunityInteraction('community_join_click', { platform, placement });
  trackCommunityInteraction('platform_click', { platform, placement });
  trackCommunityInteraction('community_conversion', { platform, placement });
}
