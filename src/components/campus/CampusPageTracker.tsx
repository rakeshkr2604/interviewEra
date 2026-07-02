'use client';

import { useEffect, useRef } from 'react';
import { trackCampusEventClient } from '@/lib/analytics/campus-events';

type CampusPageEvent = 'campus_workspace_viewed';

export function CampusPageTracker({
  event,
  extra,
}: {
  event: CampusPageEvent;
  extra?: Record<string, string | number | boolean | undefined>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackCampusEventClient(event, extra);
  }, [event, extra]);

  return null;
}
