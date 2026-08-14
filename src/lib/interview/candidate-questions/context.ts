import {
  candidateQuestionAction,
  type ScriptTurnRow,
} from '@/lib/ai/scripts/turn-authority'
import {
  clampFollowUpContextText,
  isUsableCandidateAnswer,
} from '@/lib/ai/scripts/follow-up-context'

const MAX_CQ_LINE_CHARS = 280
const MAX_CQ_CONTEXT_CHARS = 1_200

function speechFromTurn(turn: ScriptTurnRow): string {
  const output = turn.llm_output
  if (typeof output !== 'object' || output === null || Array.isArray(output)) return ''
  const speech = (output as Record<string, unknown>).speech
  return typeof speech === 'string' ? speech.trim() : ''
}

/**
 * Reconstruct the bounded CQ conversation so a clarification response like
 * "the stack" still has the original candidate question and prior answer.
 * No extra LLM call. Core parent_question is intentionally unused.
 */
export function buildCandidateQuestionConversation(
  turns: ScriptTurnRow[],
  latestCandidateUtterance?: string,
): string {
  const lines: string[] = []

  for (const turn of turns) {
    if (turn.phase !== 'candidate_questions') continue
    const action = candidateQuestionAction(turn.llm_output)
    const speech = speechFromTurn(turn)
    if (
      (action === 'answer' || action === 'follow_up') &&
      speech
    ) {
      lines.push(
        `Interviewer: ${clampFollowUpContextText(speech, MAX_CQ_LINE_CHARS)}`,
      )
    }
    if (isUsableCandidateAnswer(turn.answer_text)) {
      lines.push(
        `Candidate: ${clampFollowUpContextText(turn.answer_text!.trim(), MAX_CQ_LINE_CHARS)}`,
      )
    }
  }

  const hasCqTurns = turns.some((turn) => turn.phase === 'candidate_questions')

  if (hasCqTurns && isUsableCandidateAnswer(latestCandidateUtterance)) {
    const latest = clampFollowUpContextText(
      latestCandidateUtterance!.trim(),
      MAX_CQ_LINE_CHARS,
    )
    if (!lines.some((line) => line === `Candidate: ${latest}`)) {
      lines.push(`Candidate: ${latest}`)
    }
  }

  if (lines.length === 0) return '[NONE]'
  return clampFollowUpContextText(lines.join(' | '), MAX_CQ_CONTEXT_CHARS)
}
