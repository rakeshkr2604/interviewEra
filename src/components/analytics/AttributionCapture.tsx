'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { captureAttributionFromSearchParams } from '@/lib/analytics/attribution';

/**
 * Captures UTM parameters from the URL on landing and navigation,
 * persisting first-touch attribution for downstream funnel events.
 */
export function AttributionCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttributionFromSearchParams(searchParams);
  }, [searchParams]);

  return null;
}
