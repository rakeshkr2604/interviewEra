/**
 * Client helpers for SCRIPT_H answer-score request lifecycle.
 * Keeps scoring off the critical interview path and avoids duplicate LLM work.
 */

export type AnswerScoreRequestBody = {
  interviewId: string
  turnIndex: number
  transcript: string
  displayQuestion: string
  targetRole: string
  questionType?: 'technical' | 'behavioral'
  sttMinConfidence?: number
}

/**
 * Score is only needed on the feedback step. Prefetching it while auto_structure
 * runs on step 1 races the same OpenRouter model under a tighter 13s budget and
 * was the dominant cause of answer_score 504s in QA.
 */
export function shouldPrefetchAnswerScoreOnReviewOpen(): boolean {
  return false
}

/**
 * When the candidate Approves without editing, coaching is already warm from
 * step-1 auto_structure — only answer-score still needs to start.
 * When they edited (or accepted STT fixes), both must re-run.
 */
export function answerScoreNeededOnApprove(opts: {
  approvedTranscript: string
  originalTranscript: string
}): 'score_only' | 'score_and_coaching' {
  if (opts.approvedTranscript.trim() !== opts.originalTranscript.trim()) {
    return 'score_and_coaching'
  }
  return 'score_only'
}

export function buildAnswerScoreRequestBody(
  args: AnswerScoreRequestBody,
): AnswerScoreRequestBody {
  return {
    interviewId: args.interviewId,
    turnIndex: args.turnIndex,
    transcript: args.transcript,
    displayQuestion: args.displayQuestion,
    targetRole: args.targetRole,
    ...(args.questionType ? { questionType: args.questionType } : {}),
    ...(args.sttMinConfidence !== undefined
      ? { sttMinConfidence: args.sttMinConfidence }
      : {}),
  }
}

/** Wait this long for score-v1.6 before overlapping /turn prefetch. */
export const ANSWER_SCORE_PREFETCH_WAIT_MS = 6_000

/**
 * Approve used to fire /answer-score and /turn in parallel, so the turn LLM
 * never saw the score. Wait until score settles (success or failure) or this
 * timeout, then start next-turn prefetch. Continue still overlaps leftover
 * /turn latency.
 */
export async function waitForScoreThenPrefetch(opts: {
  scorePromise: Promise<unknown>
  timeoutMs?: number
}): Promise<'score' | 'timeout'> {
  const timeoutMs = opts.timeoutMs ?? ANSWER_SCORE_PREFETCH_WAIT_MS
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const settled = opts.scorePromise.then(
    () => 'score' as const,
    () => 'score' as const,
  )
  const timedOut = new Promise<'timeout'>((resolve) => {
    timeoutId = setTimeout(() => resolve('timeout'), timeoutMs)
  })
  try {
    return await Promise.race([settled, timedOut])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}
