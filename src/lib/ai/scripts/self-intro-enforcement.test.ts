import { describe, expect, it } from 'vitest'
import {
  applyTurnAuthorityOverrides,
  cannedSelfIntroTurn,
  MAX_WARMUP_QUESTIONS,
} from './turn-authority'
import { getScript } from './script-loader'
import type { ScriptTurnOutput } from './turn-validator'

/**
 * Regression: with the intro toggle on, an interview went warmup → core Q1 and
 * never asked for a self-introduction. The warmup and self_intro exits both
 * key off the phase the *model* emitted, so a straight jump to core was never
 * checked. Observed in SCRIPT_T; all three scripts shared the gap.
 */

const SCRIPTS = ['SCRIPT_T', 'SCRIPT_H', 'SCRIPT_M'] as const

const coreQuestion: ScriptTurnOutput = {
  speech: 'Explain how you would design a rate limiter.',
  display_question: 'Explain how you would design a rate limiter.',
  tip: null,
  timer_seconds: 120,
  reading_buffer_seconds: 4,
  auto_submit: false,
  allow_skip: true,
  show_auto_structure: true,
  phase: 'core',
  is_question: true,
  is_follow_up: false,
  question_difficulty: 'medium',
  interviewer_emotion: 'neutral',
}

const base = {
  coreQuestionsAsked: 0,
  totalQuestions: 4,
  followUpsThisQuestion: 0,
  followUpEnabled: true,
  candidateQuestionsExchanges: 0,
  requestPhase: 'warmup',
  lastAnswer: "Doing well, thanks — I'm ready.",
  warmupQuestionsAsked: MAX_WARMUP_QUESTIONS,
  warmupTurns: MAX_WARMUP_QUESTIONS,
  selfIntroEnabled: true,
  selfIntroQuestionsAsked: 0,
  selfIntroTurns: 0,
}

describe.each(SCRIPTS)('%s self_intro is not skippable', (scriptType) => {
  const opts = { ...base, scriptType }

  it('replaces a core question that jumped past the intro', () => {
    const result = applyTurnAuthorityOverrides({ ...opts, turn: coreQuestion })

    expect(result.phase).toBe('self_intro')
    expect(result.is_question).toBe(true)
    expect(result.display_question).toBe(cannedSelfIntroTurn().display_question)
  })

  it('replaces a jump all the way to candidate_questions or closing', () => {
    for (const phase of ['candidate_questions', 'closing'] as const) {
      const result = applyTurnAuthorityOverrides({
        ...opts,
        turn: { ...coreQuestion, phase },
      })
      expect(result.phase).toBe('self_intro')
    }
  })

  it('still converts an emitted warmup turn into the intro', () => {
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: { ...coreQuestion, phase: 'warmup' },
    })

    expect(result.phase).toBe('self_intro')
  })

  it('leaves a correct self_intro turn alone', () => {
    const result = applyTurnAuthorityOverrides({ ...opts, turn: cannedSelfIntroTurn() })

    expect(result.phase).toBe('self_intro')
    expect(result.is_question).toBe(true)
  })

  it('does nothing when the candidate turned the intro off', () => {
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: coreQuestion,
      selfIntroEnabled: false,
    })

    expect(result.phase).toBe('core')
    expect(result.is_question).toBe(true)
  })

  it('does nothing once the intro has already been asked', () => {
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: coreQuestion,
      requestPhase: 'self_intro',
      selfIntroQuestionsAsked: 1,
      selfIntroTurns: 1,
    })

    expect(result.phase).toBe('core')
    expect(result.is_question).toBe(true)
  })

  it('never regresses an interview already in core', () => {
    const result = applyTurnAuthorityOverrides({
      ...opts,
      turn: coreQuestion,
      requestPhase: 'core',
      coreQuestionsAsked: 1,
    })

    expect(result.phase).toBe('core')
  })

  it('prompt forbids skipping the intro', () => {
    expect(getScript(scriptType)).toContain(
      'NEVER skip self_intro when self_intro_enabled = true',
    )
  })
})
