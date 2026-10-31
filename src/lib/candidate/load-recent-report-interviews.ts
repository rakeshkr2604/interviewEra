import { cache } from 'react';
import { getCachedSupabase } from '@/lib/dashboard/request-cache';
import type { ProgressInterviewRow } from '@/app/(dashboard)/dashboard/dashboard-types';

/** Notifications only surface the last week — older report alerts are noise. */
const NOTIFICATION_WINDOW_DAYS = 7;

/**
 * Completed interviews from the last week, joined with whichever report engine
 * produced them. Deliberately narrower than the dashboard loader: the feed needs
 * recent report alerts, not the 60-day window the progress charts run on.
 *
 * One query, plus a second only when v2.1 sessions are present (their reports
 * live in a separate table and cannot be inlined on the same select).
 */
export const loadRecentReportInterviews = cache(async function loadRecentReportInterviews(
  userId: string,
): Promise<ProgressInterviewRow[]> {
  const supabase = await getCachedSupabase();
  const windowStart = new Date(
    Date.now() - NOTIFICATION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data } = await supabase
    .from('interviews')
    .select('id, started_at, completed_at, engine, reports(id, overall_score, generated_at)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('started_at', windowStart)
    .order('started_at', { ascending: false })
    .limit(20);

  const interviews = (data ?? []) as ProgressInterviewRow[];
  const v2Ids = interviews.filter((i) => i.engine === 'v2.1').map((i) => i.id);
  if (v2Ids.length === 0) return interviews;

  const { data: scriptReports } = await supabase
    .from('script_interview_reports')
    .select('interview_id, overall, status, generated_at')
    .in('interview_id', v2Ids)
    .in('status', ['ready', 'partial']);

  const byInterview = new Map<string, NonNullable<ProgressInterviewRow['script_interview_reports']>>();
  for (const report of scriptReports ?? []) {
    const list = byInterview.get(report.interview_id as string) ?? [];
    list.push({
      overall: report.overall as number | null,
      status: report.status as string,
      generated_at: report.generated_at as string | null,
    });
    byInterview.set(report.interview_id as string, list);
  }

  return interviews.map((interview) =>
    interview.engine === 'v2.1'
      ? { ...interview, script_interview_reports: byInterview.get(interview.id) ?? [] }
      : interview,
  );
});
