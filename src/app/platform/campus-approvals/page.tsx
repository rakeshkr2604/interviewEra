import type { Metadata } from 'next';
import { CampusApprovalsDashboard } from '@/components/platform/CampusApprovalsDashboard';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privatePageMetadata({
  title: 'Campus Approvals',
  description: 'Founder review queue for campus organization access.',
  path: '/platform/campus-approvals',
});

export default function CampusApprovalsPage() {
  return <CampusApprovalsDashboard />;
}
