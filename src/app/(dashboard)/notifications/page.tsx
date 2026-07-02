import { redirect } from 'next/navigation';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker';
import { NotificationsFeed } from '@/components/candidate/NotificationsFeed';
import { buildCandidateNotifications } from '@/lib/candidate/notifications';
import { loadCandidateSnapshot } from '@/lib/candidate/load-snapshot';
import { createClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata({
  title: 'Notifications',
  description: 'Interview reminders, report alerts, and practice streak updates.',
  path: '/notifications',
});

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const snapshot = await loadCandidateSnapshot(user.id);
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
