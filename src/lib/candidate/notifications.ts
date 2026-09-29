import { activeInterviewResumePath } from '@/lib/interview/active-interview-policy';
import type { CandidateNotification, CandidateSnapshot } from './types';

export function buildCandidateNotifications(snapshot: CandidateSnapshot): CandidateNotification[] {
  const items: CandidateNotification[] = [];
  const now = new Date().toISOString();

  if (snapshot.inProgressInterviewId) {
    items.push({
      id: `interview-${snapshot.inProgressInterviewId}`,
      type: 'interview_reminder',
      title: 'Resume your mock interview',
      body: snapshot.inProgressInterviewRole
        ? `Your ${snapshot.inProgressInterviewRole} session is still in progress.`
        : 'You have an interview session waiting to be completed.',
      href: activeInterviewResumePath(
        snapshot.inProgressInterviewEngine,
        snapshot.inProgressInterviewId,
      ),
      createdAt: now,
      read: false,
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

  for (const reportId of snapshot.recentReportIds.slice(0, 2)) {
    items.push({
      id: `report-${reportId}`,
      type: 'report_ready',
      title: 'Interview report ready',
      body: 'Review scores, strengths, and AI recommendations.',
      href: `/report/${reportId}`,
      createdAt: now,
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
      href: '/college/join',
      createdAt: now,
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
      createdAt: now,
      read: streak < 7,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(notifications: CandidateNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}
