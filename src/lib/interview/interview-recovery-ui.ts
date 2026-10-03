/**
 * Candidate-facing labels/CTAs for unfinished V2.1 (and legacy) interviews.
 * Presentation only — does not change DB status semantics.
 */

import {
  isAbandonedContinueEligible,
  isResumableInterviewStatus,
} from '@/lib/interview/interview-status';

export type InterviewRecoveryBadge = 'In progress' | 'Incomplete' | 'Ended' | 'Completed';

export type InterviewRecoveryCta = 'Continue interview' | 'Resume interview' | 'View report';

export type InterviewRecoveryMode = 'continue' | 'resume' | 'report' | 'none';

export type InterviewRecoveryPresentation = {
  badge: InterviewRecoveryBadge;
  cta: InterviewRecoveryCta | null;
  mode: InterviewRecoveryMode;
};

export type InterviewRecoveryRow = {
  id: string;
  role: string;
  status: string;
  engine?: string | null;
  started_at?: string | null;
  credit_deducted?: boolean | null;
  abandoned_resume_used?: boolean | null;
  creditDeducted?: boolean | null;
  abandonedResumeUsed?: boolean | null;
};

function creditDeductedOf(row: InterviewRecoveryRow): boolean | null | undefined {
  return row.creditDeducted ?? row.credit_deducted;
}

function abandonedResumeUsedOf(row: InterviewRecoveryRow): boolean | null | undefined {
  return row.abandonedResumeUsed ?? row.abandoned_resume_used;
}

export function getInterviewRecoveryPresentation(opts: {
  status: string | null | undefined;
  abandonedResumeUsed?: boolean | null;
  creditDeducted?: boolean | null;
  hasReportHref?: boolean;
}): InterviewRecoveryPresentation {
  const status = opts.status ?? '';

  if (status === 'completed') {
    return {
      badge: 'Completed',
      cta: opts.hasReportHref === false ? null : 'View report',
      mode: opts.hasReportHref === false ? 'none' : 'report',
    };
  }

  if (isResumableInterviewStatus(status)) {
    return {
      badge: 'In progress',
      cta: 'Continue interview',
      mode: 'continue',
    };
  }

  if (
    isAbandonedContinueEligible({
      status,
      abandonedResumeUsed: opts.abandonedResumeUsed,
      creditDeducted: opts.creditDeducted,
    })
  ) {
    return {
      badge: 'Incomplete',
      cta: 'Resume interview',
      mode: 'resume',
    };
  }

  if (status === 'abandoned') {
    return { badge: 'Ended', cta: null, mode: 'none' };
  }

  return { badge: 'Ended', cta: null, mode: 'none' };
}

/**
 * Deterministic primary recovery target for hero CTA / notifications.
 * Ordering must already be newest-first (e.g. started_at desc).
 * Prefer an active session; otherwise the first one-continue-eligible abandoned row.
 */
export function selectPrimaryRecoveryInterview<T extends InterviewRecoveryRow>(
  rows: T[],
): { row: T; mode: 'continue' | 'resume' } | null {
  const active = rows.find((row) => isResumableInterviewStatus(row.status));
  if (active) {
    return { row: active, mode: 'continue' };
  }

  const abandonedEligible = rows.find((row) =>
    isAbandonedContinueEligible({
      status: row.status,
      abandonedResumeUsed: abandonedResumeUsedOf(row),
      creditDeducted: creditDeductedOf(row),
    }),
  );
  if (abandonedEligible) {
    return { row: abandonedEligible, mode: 'resume' };
  }

  return null;
}

export function selectAbandonedResumeEligibleInterview<T extends InterviewRecoveryRow>(
  rows: T[],
): T | null {
  return (
    rows.find((row) =>
      isAbandonedContinueEligible({
        status: row.status,
        abandonedResumeUsed: abandonedResumeUsedOf(row),
        creditDeducted: creditDeductedOf(row),
      }),
    ) ?? null
  );
}
