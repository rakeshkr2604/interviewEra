/**
 * Conversation engine contract — the orchestrator's seam to the backend
 * (answer scoring + next-question/complete). The real HTTP-backed adapter is
 * built in Milestone 6; the orchestrator depends only on this interface so it
 * stays unit-testable and transport-agnostic (Clean Architecture boundary).
 *
 * The two methods map 1:1 onto the FSM's two post-answer states:
 *   processing_answer  → `scoreAnswer`   → SCORED
 *   generating_response→ `resolveNextTurn`→ RESPONSE_READY | INTERVIEW_DONE
 */
import type { TurnContext } from '@/lib/voice/core/ids'

export interface ScoreAnswerInput {
  ctx: TurnContext
  answerText: string
}

/** Opaque, UI-facing score payload for the just-submitted answer. */
export interface ScoredAnswer {
  overallScore: number | null
  feedbackText?: string
  /** Anything the report/UI needs; kept open to avoid premature coupling. */
  raw?: unknown
}

export interface ResolveNextTurnInput {
  ctx: TurnContext
  lastScore: ScoredAnswer
}

export interface NextQuestion {
  text: string
  questionIndex: number
  isFollowUp: boolean
}

export interface NextTurnResult {
  done: boolean
  reportId?: string | null
  question?: NextQuestion
}

export interface ConversationEngine {
  /** Score the candidate's answer for the current turn. */
  scoreAnswer(input: ScoreAnswerInput): Promise<ScoredAnswer>
  /** Decide whether the interview continues and, if so, the next question. */
  resolveNextTurn(input: ResolveNextTurnInput): Promise<NextTurnResult>
}
