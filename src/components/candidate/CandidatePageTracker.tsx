'use client';

import { useEffect, useRef } from 'react';
import { trackCandidateEvent } from '@/lib/analytics/candidate-events';

type CandidatePageEvent =
  | 'dashboard_viewed'
  | 'readiness_viewed'
  | 'roadmap_opened'
  | 'resume_workspace_viewed'
  | 'notifications_viewed';

export function CandidatePageTracker({
  event,
  extra,
}: {
  event: CandidatePageEvent;
  extra?: Record<string, string | number | boolean | undefined>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackCandidateEvent(event, extra);
  }, [event, extra]);

  return null;
}
