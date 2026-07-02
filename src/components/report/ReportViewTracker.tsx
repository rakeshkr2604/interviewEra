'use client';

import { useEffect, useRef } from 'react';
import type { PlanTier } from '@/types/app.types';
import { trackCandidateEvent } from '@/lib/analytics/candidate-events';

interface ReportViewTrackerProps {
  overallScore: number;
  userPlan: PlanTier;
  interviewId: string;
  reportId: string;
}

export function ReportViewTracker({
  overallScore,
  userPlan,
  interviewId,
  reportId,
}: ReportViewTrackerProps) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackCandidateEvent('report_viewed', {
      interview_id: interviewId,
      report_id: reportId,
      overall_score: overallScore,
      plan_tier: userPlan,
    });
  }, [overallScore, userPlan, interviewId, reportId]);

  return null;
}
