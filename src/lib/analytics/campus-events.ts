/**
 * Campus workspace analytics — server + client emitters.
 */

import { trackEvent } from '@/lib/analytics/gtag';
import {
  trackProductEvent,
  trackProductEventClient,
  type ProductEventName,
} from '@/lib/analytics/product-events';
import { standardizeAnalyticsProps } from '@/lib/analytics/schema';

export type CampusEventName =
  | 'campus_workspace_viewed'
  | 'campus_workspace_created'
  | 'campus_student_invite_sent'
  | 'campus_csv_import_completed';

const CAMPUS_EVENTS = new Set<CampusEventName>([
  'campus_workspace_viewed',
  'campus_workspace_created',
  'campus_student_invite_sent',
  'campus_csv_import_completed',
]);

export function isCampusEvent(name: string): name is CampusEventName {
  return CAMPUS_EVENTS.has(name as CampusEventName);
}

/** Server-side structured log (grep `[product-event]`). */
export function trackCampusEvent(
  event: CampusEventName,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  trackProductEvent({
    event_name: event as ProductEventName,
    ...props,
  });
}

/** Client-side beacon + GA4. */
export function trackCampusEventClient(
  event: CampusEventName,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return;

  const standardized = standardizeAnalyticsProps(event, props ?? {});
  trackProductEventClient(event as ProductEventName, props);
  trackEvent(event, standardized);
}
