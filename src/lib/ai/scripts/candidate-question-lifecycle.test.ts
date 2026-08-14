import { describe, expect, it } from 'vitest'
import {
  applyTurnAuthorityOverrides,
  cannedCandidateQuestionsTurn,
  countCandidateQuestionFollowUps,
  countCandidateQuestionGuidanceTurns,
  countCandidateQuestionsExchanges,
  isNoQuestionsAnswer,
  MAX_CANDIDATE_QUESTION_FOLLOW_UPS,
  shouldForceClosingBeforeLlm,
  shouldShowCandidateQuestionGuidance,
  type ScriptTurnRow,
} from './turn-authority'
import { validateTurnOutput, type ScriptTurnOutput } from './turn-validator'

const answerTurn = (
  overrides: Partial<ScriptTurnOutput> = {},
): ScriptTurnOutput => ({
  speech: 'The team generally works on customer-facing product improvements.',
  display_question: null,
  tip: null,
  timer_seconds: 0,
  reading_buffer_seconds: 0,
  auto_submit: false,
  allow_skip: false,
  show_auto_structure: false,
  phase: 'candidate_questions',
  is_question: false,
  is_follow_up: false,
  candidate_question_action: 'answer',
  question_difficulty: null,
  interviewer_emotion: 'neutral',
  ...overrides,
})

const authorityBase = {
  coreQuestionsAsked: 4,
  totalQuestions: 4,
  followUpsThisQuestion: 2,
  followUpEnabled: true,
  candidateQuestionsExchanges: 1,
  requestPhase: 'candidate_questions',
  lastAnswer: 'What kind of projects does the team work on?',
}

function row(
  turn_index: number,
  turn: ScriptTurnOutput,
): ScriptTurnRow {
  return {
    turn_index,
    phase: turn.phase,
    is_question: turn.is_question,
    llm_output: turn,
  }
}

describe('candidate-question lifecycle', () => {
  it('validator preserves the dedicated CQ action', () => {
    expect(
      validateTurnOutput(
        answerTurn({ candidate_question_action: 'follow_up' }),
        'SCRIPT_H',
      ).candidate_question_action,
    ).toBe('follow_up')
    expect(() =>
      validateTurnOutput(
        {
          ...answerTurn(),
          candidate_question_action: 'core_follow_up',
        },
        'SCRIPT_H',
      ),
    ).toThrow(/candidate_question_action/)
  })

  it('counts invite, guidance, and CQ follow-ups independently', () => {
    const turns = [
      row(1, cannedCandidateQuestionsTurn()),
      row(
        2,
        answerTurn({
          is_question: true,
          candidate_question_action: 'guidance',
          display_question: 'Ask one question or say finish.',
          timer_seconds: 60,
          reading_buffer_seconds: 3,
          auto_submit: true,
          allow_skip: true,
        }),
      ),
      row(
        3,
        answerTurn({
          is_question: true,
          candidate_question_action: 'follow_up',
          display_question: 'Do you mean the stack or the work?',
          timer_seconds: 60,
          reading_buffer_seconds: 3,
          auto_submit: true,
          allow_skip: true,
        }),
      ),
    ]

    expect(countCandidateQuestionsExchanges(turns)).toBe(1)
    expect(countCandidateQuestionGuidanceTurns(turns)).toBe(1)
    expect(countCandidateQuestionFollowUps(turns)).toBe(1)
  })

  it('forces the explicit CQ invite before any closing after final core', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      requestPhase: 'core',
      candidateQuestionsExchanges: 0,
      turn: answerTurn({
        phase: 'closing',
        speech: 'Thanks for your time.',
        candidate_question_action: undefined,
      }),
    })
    expect(result).toEqual(cannedCandidateQuestionsTurn('neutral'))
  })

  it('allows a direct answer without consuming a CQ follow-up', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: answerTurn(),
      candidateQuestionFollowUps: 0,
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.is_question).toBe(false)
    expect(result.is_follow_up).toBe(false)
    expect(result.candidate_question_action).toBe('answer')
  })

  it('does not let the model close without answering a real candidate question', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: answerTurn({
        speech: 'Thanks for your time.',
        phase: 'closing',
        candidate_question_action: undefined,
      }),
      candidateQuestionFollowUps: 0,
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.candidate_question_action).toBe('answer')
    expect(result.is_question).toBe(false)
  })

  it('allows a genuine clarification below the dedicated cap', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: answerTurn({
        speech: 'I can answer that. Do you mean the backend stack or backend ownership?',
        display_question: 'Do you mean the backend stack or backend ownership?',
        timer_seconds: 60,
        reading_buffer_seconds: 3,
        auto_submit: true,
        allow_skip: true,
        is_question: true,
        is_follow_up: false,
        candidate_question_action: 'follow_up',
      }),
      candidateQuestionFollowUps: 1,
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(false)
    expect(result.candidate_question_action).toBe('follow_up')
  })

  it('rejects CQ-FU3 without consuming core follow-up state', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: answerTurn({
        speech:
          'Backend ownership usually depends on team boundaries. Which service did you mean?',
        display_question: 'Which service did you mean?',
        timer_seconds: 60,
        reading_buffer_seconds: 3,
        auto_submit: true,
        allow_skip: true,
        is_question: true,
        is_follow_up: false,
        candidate_question_action: 'follow_up',
      }),
      candidateQuestionFollowUps: MAX_CANDIDATE_QUESTION_FOLLOW_UPS,
    })
    expect(result.is_question).toBe(false)
    expect(result.is_follow_up).toBe(false)
    expect(result.candidate_question_action).toBe('answer')
    expect(result.speech).toBe('Backend ownership usually depends on team boundaries.')
  })

  it('shows guidance once, then closes on another decline', () => {
    expect(
      shouldShowCandidateQuestionGuidance({
        requestPhase: 'candidate_questions',
        lastAnswer: "I don't have any questions right now.",
        candidateQuestionsExchanges: 1,
        candidateQuestionGuidanceTurns: 0,
      }),
    ).toBe(true)
    expect(
      shouldForceClosingBeforeLlm({
        requestPhase: 'candidate_questions',
        lastAnswer: "I'm good.",
        candidateQuestionsExchanges: 1,
        candidateQuestionGuidanceTurns: 1,
        lastTurnWasCqAnswer: false,
      }),
    ).toBe(true)
  })

  it('recognizes finish intent but not real candidate questions', () => {
    for (const answer of [
      'No thanks.',
      "I don't have any questions.",
      'No questions right now.',
      "I'm good.",
      'Nothing from my side.',
      "I'd like to finish.",
    ]) {
      expect(isNoQuestionsAnswer(answer)).toBe(true)
    }
    expect(isNoQuestionsAnswer('What kind of projects does the team work on?')).toBe(false)
    expect(isNoQuestionsAnswer('What about the backend?')).toBe(false)
  })
})
