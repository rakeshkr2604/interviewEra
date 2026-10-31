import { activeInterviewResumePath } from '@/lib/interview/active-interview-policy';
import type { CandidateNotification, CandidateSnapshot, RecentReportRef } from './types';
import type { ProgressInterviewRow } from '@/app/(dashboard)/dashboard/dashboard-types';

/**
 * Derived in-app notifications (not durable). Each unfinished interview uses a
 * stable `id` so repeated dashboard/notifications loads do not stack duplicates.
 *
 * Pass `progressInterviews` (50 most recent completed) to build accurate report
 * notifications — without it the snapshot's 20-most-recent-any-status interviews
 * are used which may have no completed reports.
 */
export function buildCandidateNotifications(
  snapshot: CandidateSnapshot,
  progressInterviews?: ProgressInterviewRow[],
): CandidateNotification[] {
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

  // Build report refs: prefer progressInterviews (50 most recent completed) over the
  // snapshot which only covers 20 most-recent-any-status and may have no scored reports.
  const scoreByRef = new Map<string, number | null>();
  let reportRefs: RecentReportRef[];
  if (progressInterviews && progressInterviews.length > 0) {
    const refs: RecentReportRef[] = [];
    for (const i of progressInterviews) {
      if (i.engine === 'v2.1') {
        const sirs = Array.isArray(i.script_interview_reports) ? i.script_interview_reports : [];
        for (const r of sirs) {
          if (r.status === 'ready' || r.status === 'partial') {
            const refId = `${i.id}-v2`;
            refs.push({
              id: refId,
              interviewId: i.id,
              engine: 'v2.1',
              generatedAt: r.generated_at ?? null,
              href: `/report/script/${i.id}`,
            });
            scoreByRef.set(refId, r.overall != null ? Number(r.overall) : null);
          }
        }
      } else {
        const reps = Array.isArray(i.reports) ? i.reports : [];
        for (const r of reps) {
          if (r.overall_score != null || r.generated_at) {
            const refId = r.id;
            refs.push({
              id: refId,
              interviewId: i.id,
              engine: 'v1',
              generatedAt: r.generated_at ?? null,
              href: `/report/${r.id}`,
            });
            scoreByRef.set(refId, r.overall_score != null ? Number(r.overall_score) : null);
          }
        }
      }
    }
    refs.sort((a, b) => (b.generatedAt ?? '').localeCompare(a.generatedAt ?? ''));
    reportRefs = refs.slice(0, 5);
  } else {
    reportRefs =
      snapshot.recentReports?.length > 0
        ? snapshot.recentReports
        : snapshot.recentReportIds.map((reportId) => ({
            id: reportId,
            interviewId: reportId,
            engine: 'v1' as const,
            generatedAt: null as string | null,
            href: `/report/${reportId}`,
          }));
  }

  for (const report of reportRefs.slice(0, 5)) {
    const score = scoreByRef.get(report.id);
    const body =
      score != null
        ? `Scored ${score.toFixed(1)}/10 — review strengths, gaps, and AI coaching.`
        : 'Review scores, strengths, and AI coaching recommendations.';
    items.push({
      id: `report-${report.id}`,
      type: 'report_ready',
      title: 'Interview report ready',
      body,
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
