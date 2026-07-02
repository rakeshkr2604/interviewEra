/**
 * Interview lifecycle analytics — server + client emitters.
 */

import { trackProductEvent, trackProductEventClient } from '@/lib/analytics/product-events';
import type { ProductEventName } from '@/lib/analytics/product-events';

export type InterviewLifecycleEvent =
  | 'interview_created'
  | 'interview_started'
  | 'interview_resumed'
  | 'question_generated'
  | 'answer_recorded'
  | 'followup_generated'
  | 'report_generated'
  | 'interview_completed'
  | 'interview_abandoned'
  | 'interview_recovered';

const LIFECYCLE_EVENTS = new Set<InterviewLifecycleEvent>([
  'interview_created',
  'interview_started',
  'interview_resumed',
  'question_generated',
  'answer_recorded',
  'followup_generated',
  'report_generated',
  'interview_completed',
  'interview_abandoned',
  'interview_recovered',
]);

export function isInterviewLifecycleEvent(name: string): name is InterviewLifecycleEvent {
  return LIFECYCLE_EVENTS.has(name as InterviewLifecycleEvent);
}

/** Server-side structured log (grep `[product-event]`). */
export function trackInterviewEvent(
  event: InterviewLifecycleEvent,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  trackProductEvent({
    event_name: event as ProductEventName,
    ...props,
  });
}

/** Client-side beacon + custom event dispatch. */
export function trackInterviewEventClient(
  event: InterviewLifecycleEvent,
  props?: Record<string, string | number | boolean | undefined>,
): void {
  trackProductEventClient(event as ProductEventName, props);
}
