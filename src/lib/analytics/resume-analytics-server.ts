/**
 * Server resume analytics — durable product_events persistence.
 */

import { trackProductEventServer } from '@/lib/analytics/product-events-server';

export type ResumeDeletedServerPayload = {
  user_id: string;
  resume_id: string;
  source?: string;
};

export function trackResumeDeletedServer(payload: ResumeDeletedServerPayload): void {
  trackProductEventServer({
    event_name: 'resume_deleted',
    user_id: payload.user_id,
    resume_id: payload.resume_id,
    source: payload.source ?? 'api_resume_delete',
  });
}
