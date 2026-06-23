import type { Metadata } from 'next';
import { generateMetadata } from '@/lib/seo/metadata';
import { CommunityHubPage } from '@/components/community/CommunityHubPage';

export const metadata: Metadata = generateMetadata({
  title: 'Community',
  description:
    'Join the InterviewEra community for daily job alerts, interview tips, placement updates, resume resources, and peer support.',
  path: '/community',
});

export default function CommunityPage() {
  return <CommunityHubPage />;
}
