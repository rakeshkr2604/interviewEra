import { describe, expect, it } from 'vitest'
import {
  applyTurnAuthorityOverrides,
  cannedCandidateQuestionsTurn,
  isNoQuestionsAnswer,
  MAX_CANDIDATE_QUESTION_EXCHANGES,
  shouldForceClosingBeforeLlm,
} from './turn-authority'
import type { ScriptTurnOutput } from './turn-validator'

/**
 * Legacy CQ authority coverage. The current lifecycle gives a first decline
 * one guidance turn and closes only after a second decline.
 */
describe('Phase 1b — candidate_questions exit authority', () => {
  const baseTurn = (over: Partial<ScriptTurnOutput> = {}): ScriptTurnOutput => ({
    speech: 'Any questions for me?',
    display_question: 'Do you have any questions for me?',
    tip: null,
    timer_seconds: 60,
    reading_buffer_seconds: 3,
    auto_submit: true,
    allow_skip: true,
    show_auto_structure: false,
    phase: 'candidate_questions',
    is_question: true,
    is_follow_up: false,
    question_difficulty: null,
    interviewer_emotion: 'neutral',
    ...over,
  })

  const opts = {
    coreQuestionsAsked: 4,
    totalQuestions: 4,
    followUpsThisQuestion: 0,
    followUpEnabled: true,
    requestPhase: 'candidate_questions' as const,
    lastAnswer: 'What does success look like in the first 90 days?',
  }

  it('overrides an LLM re-invite with a safe CQ answer fallback', () => {
    const llmInvite = baseTurn({
      speech: 'Anything else you want to ask?',
      is_question: true,
      candidate_question_action: 'invite',
    })
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: llmInvite,
      candidateQuestionsExchanges: MAX_CANDIDATE_QUESTION_EXCHANGES,
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.is_question).toBe(false)
    expect(result.candidate_question_action).toBe('answer')
  })

  it('still allows an answer turn under the final invite (is_question=false)', () => {
    const llmAnswer = baseTurn({
      speech: 'Great question — the team values ownership.',
      display_question: null,
      is_question: false,
      timer_seconds: 0,
      reading_buffer_seconds: 0,
      auto_submit: false,
      allow_skip: false,
    })
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: llmAnswer,
      candidateQuestionsExchanges: MAX_CANDIDATE_QUESTION_EXCHANGES,
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.is_question).toBe(false)
  })

  it('does not let a model re-invite after a skipped candidate response', () => {
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: cannedCandidateQuestionsTurn(),
      candidateQuestionsExchanges: 0,
      lastAnswer: '[SKIPPED]',
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.candidate_question_action).toBe('answer')
  })

  it('does not let a model re-invite after a timed-out candidate response', () => {
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: cannedCandidateQuestionsTurn(),
      candidateQuestionsExchanges: 1,
      lastAnswer: '[TIMEOUT]',
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.candidate_question_action).toBe('answer')
  })

  it('does not let a model re-invite on short no-questions answers', () => {
    expect(isNoQuestionsAnswer('no')).toBe(true)
    expect(isNoQuestionsAnswer('no questions')).toBe(true)
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: cannedCandidateQuestionsTurn(),
      candidateQuestionsExchanges: 0,
      lastAnswer: 'no questions',
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.candidate_question_action).toBe('answer')
  })

  it('shouldForceClosingBeforeLlm: second decline and completed-answer paths', () => {
    expect(
      shouldForceClosingBeforeLlm({
        requestPhase: 'candidate_questions',
        lastAnswer: '[SKIPPED]',
        candidateQuestionsExchanges: 0,
        lastTurnWasCqAnswer: false,
        candidateQuestionGuidanceTurns: 0,
      }),
    ).toBe(false)

    expect(
      shouldForceClosingBeforeLlm({
        requestPhase: 'candidate_questions',
        lastAnswer: '[SKIPPED]',
        candidateQuestionsExchanges: 1,
        lastTurnWasCqAnswer: false,
        candidateQuestionGuidanceTurns: 1,
      }),
    ).toBe(true)

    expect(
      shouldForceClosingBeforeLlm({
        requestPhase: 'candidate_questions',
        lastAnswer: 'Thanks for explaining.',
        candidateQuestionsExchanges: MAX_CANDIDATE_QUESTION_EXCHANGES,
        lastTurnWasCqAnswer: true,
      }),
    ).toBe(true)

    // Still under the final invite — candidate just asked; do not short-circuit.
    expect(
      shouldForceClosingBeforeLlm({
        requestPhase: 'candidate_questions',
        lastAnswer: 'How big is the team?',
        candidateQuestionsExchanges: MAX_CANDIDATE_QUESTION_EXCHANGES,
        lastTurnWasCqAnswer: false,
      }),
    ).toBe(false)
  })
})
