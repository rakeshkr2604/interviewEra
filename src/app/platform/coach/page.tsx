import type { Metadata } from 'next';
import { CoachManagementDashboard } from '@/components/platform/CoachManagementDashboard';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privatePageMetadata({
  title: 'AI Interview Coach Access',
  description: 'Controlled access & operational management for AI Interview Coach.',
  path: '/platform/coach',
});

export default function PlatformCoachPage() {
  return <CoachManagementDashboard />;
}
