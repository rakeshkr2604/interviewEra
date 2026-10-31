import { redirect } from 'next/navigation';
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker';
import { ReadinessPageContent } from '@/components/candidate/ReadinessPageContent';
import { computeReadinessScore } from '@/lib/candidate/readiness-score';
import type { ReadinessHistoryReport } from '@/lib/candidate/readiness-trend';
import {
  getCachedAuthUser,
  getCachedCandidateSnapshot,
  getCachedSupabase,
} from '@/lib/dashboard/request-cache';
import { fetchRecentCompletedInterviewIds } from '@/lib/candidate/completed-interviews';
import { mergeAnalyticsReports } from '@/lib/candidate/analytics-reports';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata({
  title: 'Readiness',
  description: 'Your interview readiness score across resume, performance, and consistency.',
  path: '/readiness',
});

export const dynamic = 'force-dynamic';

export default async function ReadinessPage() {
  const user = await getCachedAuthUser();
  if (!user) redirect('/login');

  const supabase = await getCachedSupabase();

  const [snapshot, completedInterviewIds] = await Promise.all([
    getCachedCandidateSnapshot(user.id),
    // Scoped to this user only — fetchRecentCompletedInterviewIds filters
    // interviews.user_id = userId before anything below ever runs.
    fetchRecentCompletedInterviewIds(supabase, user.id, 20),
  ]);

  const readiness = computeReadinessScore(snapshot);

  const [{ data: v1Reports }, { data: scriptReports }] =
    completedInterviewIds.length > 0
      ? await Promise.all([
          supabase
            .from('reports')
            .select('overall_score, radar_data, generated_at, interview_id')
            .in('interview_id', completedInterviewIds)
            .order('generated_at', { ascending: false })
            .limit(20),
          supabase
            .from('script_interview_reports')
            .select('overall, dimension_averages, generated_at, interview_id, status')
            .in('interview_id', completedInterviewIds)
            .in('status', ['ready', 'partial'])
            .order('generated_at', { ascending: false })
            .limit(20),
        ])
      : [{ data: [] }, { data: [] }];

  // `interview_id` on both queries above is itself drawn from
  // completedInterviewIds (user-scoped), so these reports can only ever
  // belong to this candidate.
  const orderedReports = mergeAnalyticsReports(
    (v1Reports ?? []) as Parameters<typeof mergeAnalyticsReports>[0],
    (scriptReports ?? []) as Parameters<typeof mergeAnalyticsReports>[1],
    20,
  );

  const reportHistory: ReadinessHistoryReport[] = orderedReports.map((r) => ({
    generatedAt: r.generatedAt,
    overallScore: r.overallScore,
    communicationClarity: r.dimensions.communication_clarity ?? null,
    technicalDepth: r.dimensions.technical_depth ?? null,
    answerStructure: r.dimensions.answer_structure ?? null,
    confidence: r.dimensions.confidence ?? null,
    relevance: r.dimensions.relevance ?? null,
  }));

  const resumeCategory = readiness.categories.find((c) => c.key === 'resume_quality');
  const consistencyCategory = readiness.categories.find((c) => c.key === 'consistency');

  return (
    <>
      <CandidatePageTracker event="readiness_viewed" extra={{ overall_score: readiness.overall }} />
      <ReadinessPageContent
        improvementTrend={readiness.improvementTrend}
        trendLabel={readiness.trendLabel}
        reportHistory={reportHistory}
        resumeScore={resumeCategory?.score ?? 0}
        resumeSummary={resumeCategory?.summary ?? ''}
        consistencyScore={consistencyCategory?.score ?? 0}
        consistencySummary={consistencyCategory?.summary ?? ''}
      />
    </>
  );
}
