import { describe, expect, it } from 'vitest'
import {
  applyTurnAuthorityOverrides,
  cannedRequiredFollowUpTurn,
  probeIsRequired,
  type ScriptTurnOutput,
} from './turn-authority'
import { getScript } from './script-loader'

/**
 * The product rule, verbatim:
 *   core answer weak            → follow-up 1
 *   core answer strong          → next core, no follow-up
 *   follow-up 1 answer weak     → follow-up 2
 *   follow-up 1 answer strong   → next core
 *   after follow-up 2           → next core, weak or strong
 *
 * `answer_probe_needed = false` was already enforced. `true` was only
 * permissive, so a weak answer could still be waved through — that is the
 * half this suite locks down.
 */

const gate = {
  requestPhase: 'core',
  followUpEnabled: true,
  hasValidParentCoreQuestion: true,
  lastAnswer: 'We just used a library for it.',
  maxFollowUpsPerQuestion: 2,
}

describe('adaptive follow-up rule — when a probe is mandatory', () => {
  it('requires follow-up 1 after a weak core answer', () => {
    expect(
      probeIsRequired({ ...gate, followUpsThisQuestion: 0, answerProbeNeeded: true }),
    ).toBe(true)
  })

  it('requires follow-up 2 after a weak follow-up 1 answer', () => {
    expect(
      probeIsRequired({ ...gate, followUpsThisQuestion: 1, answerProbeNeeded: true }),
    ).toBe(true)
  })

  it('requires nothing after a strong answer', () => {
    expect(
      probeIsRequired({ ...gate, followUpsThisQuestion: 0, answerProbeNeeded: false }),
    ).toBe(false)
    expect(
      probeIsRequired({ ...gate, followUpsThisQuestion: 1, answerProbeNeeded: false }),
    ).toBe(false)
  })

  it('requires nothing once both follow-ups are spent, weak or not', () => {
    expect(
      probeIsRequired({ ...gate, followUpsThisQuestion: 2, answerProbeNeeded: true }),
    ).toBe(false)
  })

  it('stays permissive when the score is missing or failed', () => {
    expect(
      probeIsRequired({ ...gate, followUpsThisQuestion: 0, answerProbeNeeded: 'unknown' }),
    ).toBe(false)
    expect(
      probeIsRequired({ ...gate, followUpsThisQuestion: 0, answerProbeNeeded: undefined }),
    ).toBe(false)
  })

  it('never fires with follow-ups off, outside core, on a skip, or with no parent', () => {
    const required = { ...gate, followUpsThisQuestion: 0, answerProbeNeeded: true as const }
    expect(probeIsRequired({ ...required, followUpEnabled: false })).toBe(false)
    expect(probeIsRequired({ ...required, requestPhase: 'candidate_questions' })).toBe(false)
    expect(probeIsRequired({ ...required, lastAnswer: '[SKIPPED]' })).toBe(false)
    expect(probeIsRequired({ ...required, lastAnswer: '[TIMEOUT]' })).toBe(false)
    expect(probeIsRequired({ ...required, hasValidParentCoreQuestion: false })).toBe(false)
  })
})

describe('adaptive follow-up rule — authority backstop', () => {
  const newCoreQuestion: ScriptTurnOutput = {
    speech: 'Tell me about a time you disagreed with a teammate.',
    display_question: 'Tell me about a time you disagreed with a teammate.',
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

  const authorityBase = {
    coreQuestionsAsked: 2,
    totalQuestions: 4,
    followUpEnabled: true,
    candidateQuestionsExchanges: 0,
    requestPhase: 'core',
    lastAnswer: 'We just used a library for it.',
    hasValidParentCoreQuestion: true,
    parentQuestion: 'How did you handle caching?',
    lastCandidateAnswer: 'We just used a library for it.',
    scriptType: 'SCRIPT_H' as const,
  }

  it('blocks a jump to the next core question while a probe is owed', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: newCoreQuestion,
      followUpsThisQuestion: 0,
      answerProbeNeeded: true,
    })

    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(true)
    expect(result.phase).toBe('core')
    expect(result.speech).toBe(
      cannedRequiredFollowUpTurn({ questionType: 'behavioral' }).speech,
    )
  })

  it('blocks a jump out of core while a probe is owed', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: { ...newCoreQuestion, phase: 'candidate_questions', is_question: false },
      followUpsThisQuestion: 1,
      answerProbeNeeded: true,
    })

    expect(result.phase).toBe('core')
    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(true)
    expect(result.speech).toBe(
      cannedRequiredFollowUpTurn({ questionType: 'behavioral' }).speech,
    )
  })

  it('leaves a valid follow-up alone', () => {
    const followUp: ScriptTurnOutput = {
      ...newCoreQuestion,
      speech: 'What specifically did you configure in that library?',
      display_question: 'What specifically did you configure in that library?',
      is_follow_up: true,
    }

    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: followUp,
      followUpsThisQuestion: 0,
      answerProbeNeeded: true,
    })

    expect(result.is_follow_up).toBe(true)
    expect(result.is_question).toBe(true)
  })

  it('replaces an invalid owed follow-up with a question, never an acknowledgment', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: {
        ...newCoreQuestion,
        speech: authorityBase.parentQuestion,
        display_question: authorityBase.parentQuestion,
        is_follow_up: true,
      },
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'behavioral',
      followUpsThisQuestion: 0,
      answerProbeNeeded: true,
    })

    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(true)
    expect(result.question_type).toBe('behavioral')
    expect(result.display_question).toBeTruthy()
  })

  it('lets the model move on when the answer scored strong', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: newCoreQuestion,
      followUpsThisQuestion: 0,
      answerProbeNeeded: false,
    })

    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(false)
  })

  it('lets the model move on once both follow-ups are spent', () => {
    const result = applyTurnAuthorityOverrides({
      ...authorityBase,
      turn: newCoreQuestion,
      followUpsThisQuestion: 2,
      answerProbeNeeded: true,
    })

    expect(result.is_follow_up).toBe(false)
  })

  it.each(['SCRIPT_H', 'SCRIPT_T', 'SCRIPT_M'] as const)(
    '%s replaces a second consecutive core acknowledgment with a question',
    (scriptType) => {
      const ack: ScriptTurnOutput = {
        ...newCoreQuestion,
        speech: "Thanks. Let's keep going.",
        display_question: null,
        is_question: false,
        is_follow_up: false,
        timer_seconds: 0,
        reading_buffer_seconds: 0,
        show_auto_structure: false,
      }

      const first = applyTurnAuthorityOverrides({
        ...authorityBase,
        turn: ack,
        scriptType,
        followUpsThisQuestion: 0,
        answerProbeNeeded: false,
        previousTurnWasAcknowledgment: false,
      })
      expect(first.is_question).toBe(false)

      const second = applyTurnAuthorityOverrides({
        ...authorityBase,
        turn: ack,
        scriptType,
        followUpsThisQuestion: 0,
        answerProbeNeeded: false,
        previousTurnWasAcknowledgment: true,
        lastAnswer: first.speech,
      })
      expect(second.is_question).toBe(true)
      expect(second.display_question).toBeTruthy()
    },
  )

  it.each([
    ['SCRIPT_H', 'behavioral'],
    ['SCRIPT_T', 'technical'],
    ['SCRIPT_M', 'technical'],
  ] as const)(
    '%s fallback is immediately answerable and preserves the parent type',
    (scriptType, parentQuestionType) => {
      const result = applyTurnAuthorityOverrides({
        ...authorityBase,
        turn: newCoreQuestion,
        scriptType,
        parentQuestionType,
        followUpsThisQuestion: 0,
        answerProbeNeeded: true,
      })

      expect(result.is_question).toBe(true)
      expect(result.is_follow_up).toBe(true)
      expect(result.question_type).toBe(parentQuestionType)
      expect(result.display_question).toBeTruthy()
    },
  )
})

describe('adaptive follow-up rule — prompt contract', () => {
  it.each(['SCRIPT_H', 'SCRIPT_T', 'SCRIPT_M'] as const)(
    '%s states the probe is required, not optional',
    (script) => {
      const text = getScript(script)
      expect(text).toContain('the follow-up is REQUIRED')
      expect(text).toContain('maximum, not always 2')
      expect(text).not.toContain('**optional and adaptive**')
      expect(text).not.toContain('MANDATORY before every next question')
      expect(text).toContain('optional prefix')
    },
  )
})
