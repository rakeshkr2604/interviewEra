/**
 * Structured server-side timing spans for interview question prepare.
 * Greppable in Vercel logs: `[prepare] prepare_started|completed|failed`
 */

export interface PrepareSpanPayload {
  interview_id: string
  duration_ms?: number
  error?: string
  status?: number
  question_count?: number
}

function emit(event: 'prepare_started' | 'prepare_completed' | 'prepare_failed', payload: PrepareSpanPayload): void {
  const line = JSON.stringify({
    ...payload,
    ts: new Date().toISOString(),
  })
  if (event === 'prepare_failed') {
    console.warn(`[prepare] ${event}`, line)
  } else {
    console.info(`[prepare] ${event}`, line)
  }
}

export function logPrepareStarted(interviewId: string): number {
  emit('prepare_started', { interview_id: interviewId })
  return Date.now()
}

export function logPrepareCompleted(interviewId: string, startedAt: number, questionCount?: number): void {
  emit('prepare_completed', {
    interview_id: interviewId,
    duration_ms: Date.now() - startedAt,
    question_count: questionCount,
  })
}

export function logPrepareFailed(
  interviewId: string,
  startedAt: number | null,
  error: string,
  status?: number,
): void {
  emit('prepare_failed', {
    interview_id: interviewId,
    duration_ms: startedAt != null ? Date.now() - startedAt : undefined,
    error,
    status,
  })
}
