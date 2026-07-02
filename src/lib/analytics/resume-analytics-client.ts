/**
 * Client-only resume analytics — safe for Client Components.
 */

import { trackEvent } from '@/lib/analytics/gtag';
import { trackProductEventClient } from '@/lib/analytics/product-events';
import { standardizeAnalyticsProps } from '@/lib/analytics/schema';

export type ResumeDeletedClientPayload = {
  user_id: string;
  resume_id: string;
  source?: string;
};

export function trackResumeDeletedClient(payload: ResumeDeletedClientPayload): void {
  if (typeof window === 'undefined') return;

  const standardized = standardizeAnalyticsProps('resume_deleted', {
    user_id: payload.user_id,
    resume_id: payload.resume_id,
    source: payload.source ?? 'resume_workspace',
  });

  trackProductEventClient('resume_deleted', {
    user_id: payload.user_id,
    resume_id: payload.resume_id,
    source: payload.source ?? 'resume_workspace',
  });
  trackEvent('resume_deleted', standardized);
}
