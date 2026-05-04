'use client';

import type { PlanTier } from '@/types/app.types';

interface ReportViewTrackerProps {
  overallScore: number;
  userPlan: PlanTier;
  interviewId: string;
}

/** Placeholder for future Vercel / server analytics (PostHog removed for MVP). */
export function ReportViewTracker(props: ReportViewTrackerProps) {
  void props;
  return null;
}
