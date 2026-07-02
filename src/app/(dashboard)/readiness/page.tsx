import { redirect } from 'next/navigation';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker';
import { ReadinessPageContent } from '@/components/candidate/ReadinessPageContent';
import { loadCandidateSnapshot } from '@/lib/candidate/load-snapshot';
import { computeReadinessScore } from '@/lib/candidate/readiness-score';
import { generatePersonalizedRoadmap } from '@/lib/candidate/roadmap';
import { createClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata({
  title: 'Readiness',
  description: 'Your interview readiness score across resume, performance, and consistency.',
  path: '/readiness',
});

export const dynamic = 'force-dynamic';

export default async function ReadinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const snapshot = await loadCandidateSnapshot(user.id);
  const readiness = computeReadinessScore(snapshot);
  const roadmap = generatePersonalizedRoadmap(snapshot);

  return (
    <>
      <CandidatePageTracker event="readiness_viewed" extra={{ overall_score: readiness.overall }} />
      <DashboardPageHeader
        eyebrow="Insights"
        title="Readiness score"
        subtitle="Production score from your resume, interview reports, and practice consistency."
      />
      <ReadinessPageContent readiness={readiness} roadmap={roadmap} />
    </>
  );
}
