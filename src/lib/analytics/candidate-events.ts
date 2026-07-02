/**
 * Candidate workspace analytics — wraps product-events with stable names.
 */

import { trackEvent } from '@/lib/analytics/gtag';
import { trackProductEventClient } from '@/lib/analytics/product-events';
import { standardizeAnalyticsProps } from '@/lib/analytics/schema';

export type CandidateEventName =
  | 'dashboard_viewed'
  | 'resume_uploaded'
  | 'report_opened'
  | 'report_viewed'
  | 'roadmap_opened'
  | 'recommendation_clicked'
  | 'interview_resumed'
  | 'readiness_viewed'
  | 'resume_workspace_viewed'
  | 'notifications_viewed';

export function trackCandidateEvent(
  eventName: CandidateEventName,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return;

  const standardized = standardizeAnalyticsProps(eventName, props ?? {});
  trackProductEventClient(eventName as Parameters<typeof trackProductEventClient>[0], props);
  trackEvent(eventName, standardized);

  // Legacy GA4 alias — preserves funnels that still listen for report_opened.
  if (eventName === 'report_viewed') {
    trackEvent('report_opened', standardized);
  }
}
