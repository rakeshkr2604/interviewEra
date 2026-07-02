import 'server-only';

import {
  trackProductEvent,
  type ProductEventName,
  type ProductEventPayload,
} from '@/lib/analytics/product-events';
import { persistProductEventAsync } from '@/lib/analytics/product-events-store';

/** Server-only: log + durable store. */
export function trackProductEventServer(payload: ProductEventPayload): void {
  trackProductEvent(payload);
  const eventName = payload.event_name ?? payload.event;
  if (!eventName) return;
  const { event: _e, event_name: _en, ...rest } = payload;
  persistProductEventAsync(eventName, rest);
}

export function persistProductEventServer(
  eventName: ProductEventName,
  props: Record<string, string | number | boolean | undefined> = {},
): void {
  persistProductEventAsync(eventName, props);
}
