import { describe, expect, it } from 'vitest'
import {
  applyTurnAuthorityOverrides,
  cannedCandidateQuestionsTurn,
  cannedCoreEntryTurn,
  countCandidateQuestionsExchanges,
  countCoreQuestions,
  countFollowUpsSinceLastCoreQuestion,
  countSelfIntroQuestions,
  displayQuestionNumberAfterTurn,
  isNoQuestionsAnswer,
  recentAcknowledgments,
  resolvePromptPhase,
  resolveTurnCap,
  shouldForceClosingBeforeLlm,
  type ScriptTurnRow,
} from './turn-authority'
import type { ScriptTurnOutput } from './turn-validator'

function row(
  partial: Partial<ScriptTurnRow> & { turn_index: number },
): ScriptTurnRow {
  return {
    phase: 'core',
    is_question: true,
    llm_output: { is_follow_up: false, speech: 'Q' },
    ...partial,
  }
}

const baseTurn = (over: Partial<ScriptTurnOutput> = {}): ScriptTurnOutput => ({
  speech: 'Tell me about X.',
  display_question: 'Tell me about X?',
  tip: null,
  timer_seconds: 90,
  reading_buffer_seconds: 3,
  auto_submit: false,
  allow_skip: true,
  show_auto_structure: true,
  phase: 'core',
  is_question: true,
  is_follow_up: false,
  question_difficulty: 'easy',
  interviewer_emotion: 'neutral',
  ...over,
})

describe('turn-authority counting', () => {
  it('counts only non-follow-up core questions', () => {
    const turns = [
      row({ turn_index: 1, phase: 'warmup', llm_output: { is_follow_up: false } }),
      row({ turn_index: 2, llm_output: { is_follow_up: false } }),
      row({ turn_index: 3, llm_output: { is_follow_up: true } }),
      row({ turn_index: 4, llm_output: { is_follow_up: false } }),
      row({ turn_index: 5, is_question: false, llm_output: { speech: 'Okay.', is_follow_up: false } }),
    ]
    expect(countCoreQuestions(turns)).toBe(2)
  })

  it('treats missing is_follow_up as false (legacy turns)', () => {
    const turns = [row({ turn_index: 1, llm_output: { speech: 'Old Q' } })]
    expect(countCoreQuestions(turns)).toBe(1)
    expect(countFollowUpsSinceLastCoreQuestion(turns)).toBe(0)
  })

  it('counts follow-ups only since last parent core question', () => {
    const turns = [
      row({ turn_index: 1, llm_output: { is_follow_up: false } }),
      row({ turn_index: 2, llm_output: { is_follow_up: true } }),
      row({ turn_index: 3, llm_output: { is_follow_up: true } }),
      row({ turn_index: 4, llm_output: { is_follow_up: false } }),
      row({ turn_index: 5, llm_output: { is_follow_up: true } }),
    ]
    expect(countFollowUpsSinceLastCoreQuestion(turns)).toBe(1)
  })

  it('lists recent acknowledgments most-recent-first', () => {
    const turns = [
      row({
        turn_index: 1,
        is_question: false,
        llm_output: { speech: 'Ack1', is_follow_up: false },
      }),
      row({ turn_index: 2, llm_output: { is_follow_up: false } }),
      row({
        turn_index: 3,
        is_question: false,
        llm_output: { speech: 'Ack2', is_follow_up: false },
      }),
      row({
        turn_index: 4,
        is_question: false,
        llm_output: { speech: 'Ack3', is_follow_up: false },
      }),
    ]
    expect(recentAcknowledgments(turns, 3)).toEqual(['Ack3', 'Ack2', 'Ack1'])
  })

  it('counts candidate_questions invites as exchanges', () => {
    const turns = [
      row({
        turn_index: 1,
        phase: 'candidate_questions',
        is_question: true,
        llm_output: { speech: 'Any questions?' },
      }),
      row({
        turn_index: 2,
        phase: 'candidate_questions',
        is_question: false,
        llm_output: { speech: 'Good question.' },
      }),
      row({
        turn_index: 3,
        phase: 'candidate_questions',
        is_question: true,
        llm_output: { speech: 'Anything else?' },
      }),
    ]
    expect(countCandidateQuestionsExchanges(turns)).toBe(2)
  })

  it('detects no-questions answers', () => {
    expect(isNoQuestionsAnswer('[SKIPPED]')).toBe(true)
    expect(isNoQuestionsAnswer('no')).toBe(true)
    expect(isNoQuestionsAnswer('What is the onboarding like?')).toBe(false)
    expect(shouldForceClosingBeforeLlm({
      requestPhase: 'candidate_questions',
      lastAnswer: '[SKIPPED]',
      candidateQuestionsExchanges: 0,
      lastTurnWasCqAnswer: false,
    })).toBe(true)
    expect(shouldForceClosingBeforeLlm({
      requestPhase: 'candidate_questions',
      lastAnswer: 'Tell me about the team.',
      candidateQuestionsExchanges: 1,
      lastTurnWasCqAnswer: false,
    })).toBe(false)
    expect(shouldForceClosingBeforeLlm({
      requestPhase: 'candidate_questions',
      lastAnswer: 'Thanks for explaining.',
      candidateQuestionsExchanges: 1,
      lastTurnWasCqAnswer: true,
    })).toBe(true)
  })
})

describe('turn-authority overrides', () => {
  const baseOpts = {
    followUpsThisQuestion: 0,
    followUpEnabled: true,
    candidateQuestionsExchanges: 0,
    requestPhase: 'core',
    lastAnswer: 'Here is my answer about the topic in enough detail.',
  }

  it('forces candidate_questions when core budget exhausted', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn(),
      coreQuestionsAsked: 4,
      totalQuestions: 4,
      ...baseOpts,
    })
    expect(result.phase).toBe('candidate_questions')
    expect(result.is_follow_up).toBe(false)
  })

  it('blocks follow-ups when disabled by recategorizing', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ is_follow_up: true }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
    })
    expect(result.phase).toBe('core')
    expect(result.is_follow_up).toBe(false)
  })

  it('blocks follow-ups when per-question cap reached', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ is_follow_up: true }),
      coreQuestionsAsked: 2,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 2,
    })
    expect(result.is_follow_up).toBe(false)
  })

  it('forces candidate_questions when follow-up over cap and budget spent', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ is_follow_up: true }),
      coreQuestionsAsked: 4,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 2,
    })
    expect(result).toEqual(cannedCandidateQuestionsTurn('neutral'))
  })

  it('forces closing when candidate_questions exchange cap is hit', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        phase: 'candidate_questions',
        is_question: true,
        timer_seconds: 60,
        auto_submit: true,
      }),
      coreQuestionsAsked: 4,
      totalQuestions: 4,
      ...baseOpts,
      candidateQuestionsExchanges: 1,
      requestPhase: 'candidate_questions',
      lastAnswer: 'What is the team culture like?',
    })
    expect(result.phase).toBe('closing')
  })

  it('forces closing when candidate declines questions', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        phase: 'candidate_questions',
        is_question: false,
        timer_seconds: 0,
        reading_buffer_seconds: 0,
      }),
      coreQuestionsAsked: 4,
      totalQuestions: 4,
      ...baseOpts,
      requestPhase: 'candidate_questions',
      lastAnswer: '[SKIPPED]',
    })
    expect(result.phase).toBe('closing')
  })

  it('increments display number only for new core questions', () => {
    expect(displayQuestionNumberAfterTurn(2, baseTurn())).toBe(3)
    expect(displayQuestionNumberAfterTurn(2, baseTurn({ is_follow_up: true }))).toBe(2)
    expect(displayQuestionNumberAfterTurn(2, baseTurn({ is_question: false, timer_seconds: 0, reading_buffer_seconds: 0 }))).toBe(2)
  })

  it('resolves prompt phase when budget spent', () => {
    expect(resolvePromptPhase('core', 4, 4)).toBe('candidate_questions')
    expect(resolvePromptPhase('core', 3, 4)).toBe('core')
    expect(resolvePromptPhase('warmup', 4, 4)).toBe('warmup')
    expect(
      resolvePromptPhase('warmup', 0, 4, {
        warmupQuestionsAsked: 2,
        selfIntroEnabled: false,
      }),
    ).toBe('core')
    expect(
      resolvePromptPhase('warmup', 0, 4, {
        warmupQuestionsAsked: 2,
        selfIntroEnabled: true,
      }),
    ).toBe('self_intro')
    expect(
      resolvePromptPhase('candidate_questions', 4, 4, {
        candidateQuestionsExchanges: 1,
        lastTurnWasCqAnswer: true,
      }),
    ).toBe('closing')
    expect(
      resolvePromptPhase('candidate_questions', 4, 4, {
        candidateQuestionsExchanges: 1,
        lastTurnWasCqAnswer: false,
      }),
    ).toBe('candidate_questions')
  })

  it('forces leave warmup after MAX_WARMUP_QUESTIONS invites', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        phase: 'warmup',
        speech: 'Another warmup invite?',
        display_question: 'Still warming up?',
        timer_seconds: 30,
        reading_buffer_seconds: 2,
      }),
      coreQuestionsAsked: 0,
      totalQuestions: 4,
      followUpsThisQuestion: 0,
      followUpEnabled: false,
      candidateQuestionsExchanges: 0,
      requestPhase: 'warmup',
      lastAnswer: 'Ready.',
      warmupQuestionsAsked: 2,
      selfIntroEnabled: false,
    })
    expect(result.phase).toBe('core')
    expect(result.is_question).toBe(false)
  })

  it('forces leave self_intro after MAX_SELF_INTRO_QUESTIONS invites', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        phase: 'self_intro',
        speech: 'Tell me more about yourself again?',
        display_question: 'Another intro?',
        timer_seconds: 120,
        reading_buffer_seconds: 4,
      }),
      coreQuestionsAsked: 0,
      totalQuestions: 4,
      followUpsThisQuestion: 0,
      followUpEnabled: false,
      candidateQuestionsExchanges: 0,
      requestPhase: 'self_intro',
      lastAnswer: 'I am a fresher with React projects.',
      selfIntroEnabled: true,
      selfIntroQuestionsAsked: 1,
      selfIntroTurns: 1,
    })
    expect(result).toEqual(cannedCoreEntryTurn('neutral'))
  })

  it('forces leave self_intro after question+bridge (MAX_SELF_INTRO_TURNS)', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        phase: 'self_intro',
        speech: 'Still on intro…',
        is_question: false,
        timer_seconds: 0,
        reading_buffer_seconds: 0,
      }),
      coreQuestionsAsked: 0,
      totalQuestions: 4,
      followUpsThisQuestion: 0,
      followUpEnabled: false,
      candidateQuestionsExchanges: 0,
      requestPhase: 'self_intro',
      lastAnswer: 'Got it — especially your portal project.',
      selfIntroEnabled: true,
      selfIntroQuestionsAsked: 1,
      selfIntroTurns: 2,
    })
    expect(result.phase).toBe('core')
  })

  it('allows the optional self_intro bridge after the single invite', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        phase: 'self_intro',
        speech: 'Got it — especially your campus portal. Let’s dig in.',
        display_question: null,
        is_question: false,
        timer_seconds: 0,
        reading_buffer_seconds: 0,
      }),
      coreQuestionsAsked: 0,
      totalQuestions: 4,
      followUpsThisQuestion: 0,
      followUpEnabled: false,
      candidateQuestionsExchanges: 0,
      requestPhase: 'self_intro',
      lastAnswer: 'I built a campus portal in React.',
      selfIntroEnabled: true,
      selfIntroQuestionsAsked: 1,
      selfIntroTurns: 1,
    })
    expect(result.phase).toBe('self_intro')
    expect(result.is_question).toBe(false)
  })

  it('clamps phase regression (core request must not become warmup)', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        phase: 'warmup',
        speech: 'How are you?',
        display_question: null,
        timer_seconds: 10,
        reading_buffer_seconds: 2,
        auto_submit: true,
      }),
      coreQuestionsAsked: 2,
      totalQuestions: 4,
      followUpsThisQuestion: 0,
      followUpEnabled: false,
      candidateQuestionsExchanges: 0,
      requestPhase: 'core',
      lastAnswer: 'Here is my technical answer with enough detail.',
    })
    expect(result.phase).toBe('core')
  })

  it('resolves prompt phase out of self_intro after bridge', () => {
    expect(
      resolvePromptPhase('self_intro', 0, 4, {
        lastTurnWasSelfIntroBridge: true,
        selfIntroTurns: 2,
        selfIntroEnabled: true,
      }),
    ).toBe('core')
    expect(
      resolvePromptPhase('self_intro', 0, 4, {
        lastTurnWasSelfIntroBridge: false,
        selfIntroTurns: 1,
        selfIntroQuestionsAsked: 1,
        selfIntroEnabled: true,
      }),
    ).toBe('self_intro')
  })

  it('counts self_intro questions', () => {
    const turns = [
      row({ turn_index: 1, phase: 'warmup', is_question: true }),
      row({ turn_index: 2, phase: 'self_intro', is_question: true }),
      row({ turn_index: 3, phase: 'self_intro', is_question: false }),
    ]
    expect(countSelfIntroQuestions(turns)).toBe(1)
  })

  it('resolves turn caps by difficulty', () => {
    expect(resolveTurnCap('easy')).toBe(15)
    expect(resolveTurnCap('hard')).toBe(25)
    expect(resolveTurnCap('unknown')).toBe(20)
  })
})
