import { redirect } from 'next/navigation';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker';
import { RoadmapPageContent } from '@/components/candidate/RoadmapPageContent';
import { generatePersonalizedRoadmap } from '@/lib/candidate/roadmap';
import {
  getCachedAuthUser,
  getCachedCandidateSnapshot,
} from '@/lib/dashboard/request-cache';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata({
  title: 'Prep roadmap',
  description: 'Personalized interview prep roadmap from your resume and performance data.',
  path: '/roadmap',
});

export const dynamic = 'force-dynamic';

export default async function RoadmapPage() {
  const user = await getCachedAuthUser();
  if (!user) redirect('/login');

  const snapshot = await getCachedCandidateSnapshot(user.id);
  const roadmap = generatePersonalizedRoadmap(snapshot);

  return (
    <>
      <CandidatePageTracker event="roadmap_opened" extra={{ target_role: roadmap.targetRole }} />
      <DashboardPageHeader
        eyebrow="Plan"
        title="Personalized roadmap"
        subtitle="Recommended interviews, topics, and tools based on your weakest dimensions."
      />
      <RoadmapPageContent roadmap={roadmap} />
    </>
  );
}
