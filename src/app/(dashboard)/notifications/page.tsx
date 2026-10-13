import { redirect } from 'next/navigation';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker';
import { NotificationsFeed } from '@/components/candidate/NotificationsFeed';
import { buildCandidateNotifications } from '@/lib/candidate/notifications';
import {
  getCachedAuthUser,
  getCachedCandidateSnapshot,
} from '@/lib/dashboard/request-cache';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata({
  title: 'Notifications',
  description: 'Interview reminders, report alerts, and practice streak updates.',
  path: '/notifications',
});

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getCachedAuthUser();
  if (!user) redirect('/login');

  const snapshot = await getCachedCandidateSnapshot(user.id);
  const notifications = buildCandidateNotifications(snapshot);

  return (
    <>
      <CandidatePageTracker event="notifications_viewed" />
      <DashboardPageHeader
        eyebrow="Activity"
        title="Notifications"
        subtitle="Reminders and updates from your practice studio."
      />
      <NotificationsFeed notifications={notifications} />
    </>
  );
}
