import { activeInterviewResumePath } from '@/lib/interview/active-interview-policy';
import { isAbandonedContinueEligible } from '@/lib/interview/interview-status';

export type InterviewResumeResponse = {
  ok: true;
  interviewId: string;
  resumeUrl: string;
  reason?: string;
};

export type InterviewResumeFailure = {
  ok: false;
  error: string;
  message: string;
  interviewId?: string;
  resumeUrl?: string;
  status: number;
};

export async function requestInterviewResume(
  interviewId: string,
): Promise<InterviewResumeResponse | InterviewResumeFailure> {
  const res = await fetch(`/api/interview/${interviewId}/resume`, {
    method: 'POST',
    credentials: 'include',
  });
  const body = (await res.json().catch(() => null)) as {
    error?: string;
    message?: string;
    interviewId?: string;
    resumeUrl?: string;
    reason?: string;
  } | null;

  if (res.ok && body?.interviewId && body.resumeUrl) {
    return {
      ok: true,
      interviewId: body.interviewId,
      resumeUrl: body.resumeUrl,
      reason: body.reason,
    };
  }

  return {
    ok: false,
    error: body?.error ?? 'resume_failed',
    message:
      body?.message ??
      (res.status === 409
        ? 'You already have an active interview.'
        : 'Could not continue this interview.'),
    interviewId: body?.interviewId,
    resumeUrl: body?.resumeUrl,
    status: res.status,
  };
}

export function resumePathForInterview(opts: {
  id: string;
  engine?: string | null;
}): string {
  return activeInterviewResumePath(opts.engine, opts.id);
}

export function needsResumeReopen(opts: {
  status: string | null | undefined;
  abandonedResumeUsed?: boolean | null;
  creditDeducted?: boolean | null;
}): boolean {
  return isAbandonedContinueEligible(opts);
}
