'use client';

import { useEffect } from 'react';
import { posthog } from '@/lib/analytics/posthog';
import type { PlanTier } from '@/types/app.types';

interface ReportViewTrackerProps {
  overallScore: number;
  userPlan: PlanTier;
  interviewId: string;
}

export function ReportViewTracker({ overallScore, userPlan, interviewId }: ReportViewTrackerProps) {
  useEffect(() => {
    posthog.capture('report_viewed', { overallScore, userPlan, interviewId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
