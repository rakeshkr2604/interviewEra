/**
 * Single source of truth for "genuinely active" vs stale interviews.
 * The 45-minute window must match migration 096 (`INTERVAL '45 minutes'`).
 */

export const ACTIVE_INTERVIEW_STALE_AFTER_MS = 45 * 60 * 1000;

export const ACTIVE_INTERVIEW_CONFLICT_MESSAGE = 'Another interview is already active';
export const ACTIVE_INTERVIEW_UNIQUE_INDEX = 'uq_interviews_one_active_per_user';
export const ACTIVE_INTERVIEW_USER_MESSAGE = 'You already have an active interview.';

export class ActiveInterviewExistsError extends Error {
  readonly code = 'active_interview' as const;

  constructor(
    public readonly interviewId: string,
    public readonly status?: string,
    public readonly engine?: string,
    public readonly startedAt?: string | null,
  ) {
    super(ACTIVE_INTERVIEW_USER_MESSAGE);
    this.name = 'ActiveInterviewExistsError';
  }
}

export function activeInterviewResumePath(
  engine: string | null | undefined,
  interviewId: string | undefined,
): string {
  if (!interviewId || interviewId === 'unknown') return '/dashboard';
  // v1 session UI retired — non-v2.1 engines resume to dashboard
  return engine === 'v2.1'
    ? `/interview/script/${interviewId}`
    : '/dashboard';
}

export function activeInterviewAgeMs(startedAt: string | null | undefined): number | null {
  if (!startedAt) return null;
  const ts = Date.parse(startedAt);
  if (!Number.isFinite(ts)) return null;
  return Date.now() - ts;
}

type RpcErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseConflictDetail(details: string | undefined): {
  interview_id?: string;
  status?: string;
  engine?: string;
  started_at?: string | null;
} | null {
  if (!details) return null;
  try {
    return JSON.parse(details) as {
      interview_id?: string;
      status?: string;
      engine?: string;
      started_at?: string | null;
    };
  } catch {
    return null;
  }
}

function rpcConflictText(error: RpcErrorLike): string {
  return [error.message, error.details, error.hint, error.code].filter(Boolean).join('\n');
}

export function isActiveInterviewConflictError(error: RpcErrorLike): boolean {
  const text = rpcConflictText(error);
  if (text.includes(ACTIVE_INTERVIEW_CONFLICT_MESSAGE)) return true;
  return error.code === '23505' && text.includes(ACTIVE_INTERVIEW_UNIQUE_INDEX);
}

function unknownErrorText(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const o = err as RpcErrorLike & { name?: string };
    return rpcConflictText(o);
  }
  return '';
}

/**
 * Maps any thrown start-path failure that is actually the one-active-interview
 * business conflict. Used by route catch blocks so a bundler `instanceof` miss
 * or a wrapped RPC error cannot become HTTP 500.
 */
export function asActiveInterviewConflict(err: unknown): ActiveInterviewExistsError | null {
  if (err instanceof ActiveInterviewExistsError) return err;

  if (err && typeof err === 'object' && 'code' in err) {
    const candidate = err as {
      code?: unknown;
      interviewId?: unknown;
      status?: unknown;
      engine?: unknown;
      startedAt?: unknown;
    };
    if (
      candidate.code === 'active_interview' &&
      typeof candidate.interviewId === 'string'
    ) {
      return new ActiveInterviewExistsError(
        candidate.interviewId,
        typeof candidate.status === 'string' ? candidate.status : undefined,
        typeof candidate.engine === 'string' ? candidate.engine : undefined,
        typeof candidate.startedAt === 'string' || candidate.startedAt === null
          ? candidate.startedAt
          : undefined,
      );
    }
  }

  const text = unknownErrorText(err);
  if (
    !text.includes(ACTIVE_INTERVIEW_CONFLICT_MESSAGE) &&
    !text.includes(ACTIVE_INTERVIEW_UNIQUE_INDEX)
  ) {
    return null;
  }

  if (err && typeof err === 'object') {
    return activeInterviewConflictFromRpc(err as RpcErrorLike);
  }
  return activeInterviewConflictFromRpc({ message: text });
}

export function userFacingInterviewStartError(
  status: number,
  error: string | undefined,
): string {
  if (status === 402 || error === 'no_credits') {
    return 'No credits remaining. Please upgrade your plan.';
  }
  if (status === 409 && error === 'active_interview') {
    return ACTIVE_INTERVIEW_USER_MESSAGE;
  }
  if (
    !error ||
    error === 'active_interview' ||
    error === 'Internal server error' ||
    error.includes(ACTIVE_INTERVIEW_CONFLICT_MESSAGE) ||
    error.includes('Interview creation and credit deduction failed')
  ) {
    return 'Failed to start interview. Please try again.';
  }
  return error;
}

export function activeInterviewConflictFromRpc(error: RpcErrorLike): ActiveInterviewExistsError {
  const detail = parseConflictDetail(error.details);
  const hintId = error.hint && UUID_RE.test(error.hint) ? error.hint : undefined;
  const interviewId = detail?.interview_id && UUID_RE.test(detail.interview_id)
    ? detail.interview_id
    : hintId ?? 'unknown';

  return new ActiveInterviewExistsError(
    interviewId,
    detail?.status,
    detail?.engine,
    detail?.started_at,
  );
}

export function activeInterviewConflictBody(err: ActiveInterviewExistsError): {
  error: 'active_interview';
  message: string;
  interviewId?: string;
  status?: string;
  resumeUrl: string;
} {
  const interviewId = err.interviewId === 'unknown' ? undefined : err.interviewId;
  return {
    error: 'active_interview',
    message: err.message,
    ...(interviewId ? { interviewId } : {}),
    ...(err.status ? { status: err.status } : {}),
    resumeUrl: activeInterviewResumePath(err.engine, err.interviewId),
  };
}
