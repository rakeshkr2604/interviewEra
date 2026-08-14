/**
 * Directives for turns where `last_answer` is not a candidate answer.
 *
 * Several authority fallbacks (core entry bridge, follow-up cap fallback) and
 * the skip path deliberately emit an `is_question: false` turn and rely on the
 * client auto-advancing so the *next* /turn produces the question. That
 * contract only holds if the next request actually tells the model to ask.
 *
 * Without it the user message collapses to the ALREADY ASKED block alone —
 * `resolveFollowUpGenerationContext` blanks `last_answer_for_prompt` when the
 * previous turn was an acknowledgment and no usable candidate answer exists —
 * and the model answers a content-free prompt with more filler. That loops
 * until the client's consecutive-non-question ceiling trips and shows
 * "The interviewer produced an unexpected response."
 */

export type TurnContinuationReason = 'ack_continuation' | 'skipped_answer'

export type TurnContinuation = {
  reason: TurnContinuationReason
  /** Leading instruction line of the user message. */
  instruction: string
  /** Directive block appended after ALREADY ASKED. */
  directive: string
}

const NO_ANSWER_VALUES = new Set(['[SKIPPED]', '[TIMEOUT]'])

export function resolveTurnContinuation(opts: {
  requestPhase: string
  lastAnswer: string
  previousTurnWasAcknowledgment: boolean
  coreQuestionsAsked: number
  totalQuestions: number
  /** SCRIPT_M alternation target; null/undefined for single-type scripts. */
  nextCoreQuestionType?: 'technical' | 'behavioral' | null
}): TurnContinuation | null {
  if (opts.requestPhase !== 'core') return null

  const budgetSpent = opts.coreQuestionsAsked >= opts.totalQuestions
  const scriptM = opts.nextCoreQuestionType
    ? ` SCRIPT_M: question_type MUST be "${opts.nextCoreQuestionType}".`
    : ''

  const target = budgetSpent
    ? 'Every planned core question is done. Use phase "candidate_questions" and invite the candidate to ask you a question.'
    : `Ask a NEW core question that is not in ALREADY ASKED. Set is_question: true and is_follow_up: false.${scriptM}`

  if (opts.previousTurnWasAcknowledgment) {
    return {
      reason: 'ack_continuation',
      instruction: 'Continue the interview now.',
      directive:
        '\n\nTHE PREVIOUS TURN WAS AN ACKNOWLEDGMENT WITH NO QUESTION. last_answer is your own bridge line, not a candidate answer — do not react to it, do not acknowledge again, and do not emit another is_question: false turn. ' +
        target,
    }
  }

  if (NO_ANSWER_VALUES.has(opts.lastAnswer)) {
    return {
      reason: 'skipped_answer',
      instruction: 'Move on to the next question now.',
      directive:
        '\n\nTHE CANDIDATE GAVE NO ANSWER (skipped or timed out). There is nothing to acknowledge or follow up on, so do not emit an acknowledgment-only turn — one short bridge clause at most, then the question. ' +
        target,
    }
  }

  return null
}
