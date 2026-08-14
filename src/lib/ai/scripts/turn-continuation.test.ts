import { describe, expect, it } from 'vitest'
import { resolveFollowUpGenerationContext } from './follow-up-context'
import { resolveTurnContinuation } from './turn-continuation'
import type { ScriptTurnRow } from './turn-authority'

const base = {
  requestPhase: 'core',
  lastAnswer: 'I led the migration and cut deploy time in half.',
  previousTurnWasAcknowledgment: false,
  coreQuestionsAsked: 1,
  totalQuestions: 4,
}

describe('turn continuation directives', () => {
  it('stays out of the way for a normal candidate answer', () => {
    expect(resolveTurnContinuation(base)).toBeNull()
  })

  it('tells the model to ask after an acknowledgment-only turn', () => {
    const continuation = resolveTurnContinuation({
      ...base,
      lastAnswer: "Thanks. Let's keep going.",
      previousTurnWasAcknowledgment: true,
    })

    expect(continuation?.reason).toBe('ack_continuation')
    expect(continuation?.directive).toContain('do not acknowledge again')
    expect(continuation?.directive).toContain('is_question: true')
  })

  it('tells the model to ask after a skip instead of acknowledging', () => {
    const continuation = resolveTurnContinuation({ ...base, lastAnswer: '[SKIPPED]' })

    expect(continuation?.reason).toBe('skipped_answer')
    expect(continuation?.directive).toContain('do not emit an acknowledgment-only turn')
    expect(continuation?.directive).toContain('is_question: true')
  })

  it('treats a timeout like a skip', () => {
    expect(resolveTurnContinuation({ ...base, lastAnswer: '[TIMEOUT]' })?.reason).toBe(
      'skipped_answer',
    )
  })

  it('points at candidate_questions instead of a new core once the budget is spent', () => {
    const continuation = resolveTurnContinuation({
      ...base,
      lastAnswer: '[SKIPPED]',
      coreQuestionsAsked: 4,
      totalQuestions: 4,
    })

    expect(continuation?.directive).toContain('candidate_questions')
    expect(continuation?.directive).not.toContain('NEW core question')
  })

  it('carries the SCRIPT_M alternation target', () => {
    const continuation = resolveTurnContinuation({
      ...base,
      previousTurnWasAcknowledgment: true,
      nextCoreQuestionType: 'behavioral',
    })

    expect(continuation?.directive).toContain('question_type MUST be "behavioral"')
  })

  it('does not fire outside core', () => {
    expect(
      resolveTurnContinuation({
        ...base,
        requestPhase: 'candidate_questions',
        lastAnswer: '[SKIPPED]',
      }),
    ).toBeNull()
  })
})

/**
 * Regression for the observed loop: skip → ack → ack → ack → client shows
 * "The interviewer produced an unexpected response." The second request in
 * that chain had no instruction at all, because the ack path blanks
 * last_answer_for_prompt when the skipped parent has no usable answer.
 */
describe('skip → acknowledgment loop', () => {
  const coreQuestion: ScriptTurnRow = {
    turn_index: 3,
    phase: 'core',
    is_question: true,
    question_type: 'behavioral',
    llm_output: {
      speech: 'Tell me about a time you handled a tight deadline.',
      display_question: 'Tell me about a time you handled a tight deadline.',
      is_question: true,
      is_follow_up: false,
    },
    answer_text: '[SKIPPED]',
  } as unknown as ScriptTurnRow

  const ackTurn: ScriptTurnRow = {
    turn_index: 4,
    phase: 'core',
    is_question: false,
    question_type: null,
    llm_output: {
      speech: "Thanks. Let's keep going.",
      display_question: null,
      is_question: false,
      is_follow_up: false,
    },
    answer_text: null,
  } as unknown as ScriptTurnRow

  it('leaves the prompt content-free without a continuation directive', () => {
    const ctx = resolveFollowUpGenerationContext({
      turns: [coreQuestion, ackTurn],
      lastAnswer: "Thanks. Let's keep going.",
      requestPhase: 'core',
    })

    expect(ctx.previous_turn_was_acknowledgment).toBe(true)
    expect(ctx.last_answer_for_prompt).toBe('')
  })

  it('supplies the missing instruction so the next turn is a question', () => {
    const ctx = resolveFollowUpGenerationContext({
      turns: [coreQuestion, ackTurn],
      lastAnswer: "Thanks. Let's keep going.",
      requestPhase: 'core',
    })

    const continuation = resolveTurnContinuation({
      requestPhase: 'core',
      lastAnswer: "Thanks. Let's keep going.",
      previousTurnWasAcknowledgment: ctx.previous_turn_was_acknowledgment,
      coreQuestionsAsked: 1,
      totalQuestions: 4,
    })

    expect(continuation).not.toBeNull()
    const userMessage = `${continuation!.instruction}${continuation!.directive}`
    expect(userMessage.trim().length).toBeGreaterThan(0)
    expect(userMessage).toContain('is_question: true')
  })
})
