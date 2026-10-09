import { activeInterviewResumePath } from '@/lib/interview/active-interview-policy';
import type { CandidateNotification, CandidateSnapshot } from './types';

/**
 * Derived in-app notifications (not durable). Each unfinished interview uses a
 * stable `id` so repeated dashboard/notifications loads do not stack duplicates.
 *
 * Persistence of read/unread is intentionally not implemented here — the product
 * derives the feed from live candidate state. Report-ready items use real
 * `generatedAt` timestamps and engine-correct hrefs.
 */
export function buildCandidateNotifications(snapshot: CandidateSnapshot): CandidateNotification[] {
  const items: CandidateNotification[] = [];
  // Stable timestamp for derived items without their own event time.
  const derivedAt =
    snapshot.progress?.updated_at ??
    snapshot.latestResume?.createdAt ??
    '1970-01-01T00:00:00.000Z';

  if (snapshot.inProgressInterviewId) {
    items.push({
      id: `interview-${snapshot.inProgressInterviewId}`,
      type: 'interview_reminder',
      title: 'Interview in progress',
      body: snapshot.inProgressInterviewRole
        ? `Your ${snapshot.inProgressInterviewRole} session is still open — continue where you left off.`
        : 'You have an interview session waiting to be completed.',
      href: activeInterviewResumePath(
        snapshot.inProgressInterviewEngine,
        snapshot.inProgressInterviewId,
      ),
      createdAt: derivedAt,
      read: false,
      ctaLabel: 'Continue interview',
    });
  } else if (snapshot.abandonedResumeInterviewId) {
    // One recovery notification for the primary abandoned-eligible session only.
    items.push({
      id: `interview-abandoned-${snapshot.abandonedResumeInterviewId}`,
      type: 'interview_reminder',
      title: 'Your interview is still available',
      body: 'You can continue where you left off.',
      href: null,
      createdAt: derivedAt,
      read: false,
      resumeInterviewId: snapshot.abandonedResumeInterviewId,
      ctaLabel: 'Resume interview',
    });
  }

  if (snapshot.latestResume) {
    const { status, id, parsed } = snapshot.latestResume;
    if (status === 'parsed' && parsed) {
      items.push({
        id: `resume-parsed-${id}`,
        type: 'resume_parsed',
        title: 'Resume parsed successfully',
        body: `Skills and experience extracted for ${parsed.target_role || 'your target role'}.`,
        href: '/resume',
        createdAt: snapshot.latestResume.createdAt,
        read: true,
      });
    } else if (status === 'failed') {
      items.push({
        id: `resume-failed-${id}`,
        type: 'resume_parsed',
        title: 'Resume parsing failed',
        body: 'Re-upload a text-based PDF or .txt file from the resume workspace.',
        href: '/resume',
        createdAt: snapshot.latestResume.createdAt,
        read: false,
      });
    } else if (status === 'parsing' || status === 'uploading') {
      items.push({
        id: `resume-pending-${id}`,
        type: 'resume_parsed',
        title: 'Resume processing',
        body: 'Your upload is being parsed — refresh shortly.',
        href: '/resume',
        createdAt: snapshot.latestResume.createdAt,
        read: false,
      });
    }
  }

  const reportRefs =
    snapshot.recentReports?.length > 0
      ? snapshot.recentReports
      : snapshot.recentReportIds.map((reportId) => ({
          id: reportId,
          interviewId: reportId,
          engine: 'v1' as const,
          generatedAt: null as string | null,
          href: `/report/${reportId}`,
        }));

  for (const report of reportRefs.slice(0, 2)) {
    items.push({
      id: `report-${report.id}`,
      type: 'report_ready',
      title: 'Interview report ready',
      body: 'Review scores, strengths, and AI recommendations.',
      href: report.href,
      createdAt: report.generatedAt ?? derivedAt,
      read: false,
    });
  }

  if (snapshot.collegeEnrollmentAccepted) {
    items.push({
      id: 'campus-invite-accepted',
      type: 'invite_accepted',
      title: 'Campus workspace connected',
      body: snapshot.collegeName
        ? `You are enrolled at ${snapshot.collegeName}.`
        : 'Your campus admin can now track your placement progress.',
      href: '/college/dashboard',
      createdAt: derivedAt,
      read: true,
    });
  }

  const streak = snapshot.progress?.current_streak ?? 0;
  if (streak >= 3) {
    items.push({
      id: `streak-${streak}`,
      type: 'practice_streak',
      title: `${streak}-day practice streak`,
      body: streak >= 7
        ? 'Strong consistency — keep quality sessions going.'
        : 'Great momentum — one more session tomorrow extends your streak.',
      href: '/dashboard',
      createdAt: derivedAt,
      read: streak < 7,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(notifications: CandidateNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}
