import { describe, expect, it } from 'vitest'
import {
  applyTurnAuthorityOverrides,
  cannedCandidateQuestionsTurn,
  cannedCoreEntryTurn,
  cannedMoveOnTurn,
  cannedNextCoreQuestionTurn,
  cannedParentRedirectTurn,
  countCandidateQuestionsExchanges,
  countCoreQuestions,
  countFollowUpsSinceLastCoreQuestion,
  countSelfIntroQuestions,
  displayQuestionNumberAfterTurn,
  existingNextTurnIndexAfterAnswer,
  bootResumeTurnIndex,
  isNoQuestionsAnswer,
  MAX_WARMUP_QUESTIONS,
  recentAcknowledgments,
  resolvePromptPhase,
  resolveTurnCap,
  resolveTurnCapExhaustion,
  shouldForceClosingBeforeLlm,
  shouldForceCoreEntryBeforeLlm,
  type ScriptTurnRow,
} from './turn-authority'
import type { ScriptTurnOutput } from './turn-validator'
import { speechCarriesExactDisplayQuestion } from './speech-display-question'

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
      candidateQuestionGuidanceTurns: 0,
    })).toBe(false)
    expect(shouldForceClosingBeforeLlm({
      requestPhase: 'candidate_questions',
      lastAnswer: '[SKIPPED]',
      candidateQuestionsExchanges: 1,
      lastTurnWasCqAnswer: false,
      candidateQuestionGuidanceTurns: 1,
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

  it('forces allow_skip false when session skip budget is exhausted', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ allow_skip: true }),
      coreQuestionsAsked: 1,
      totalQuestions: 6,
      ...baseOpts,
      skipsUsed: 2,
      maxSkips: 2,
    })
    expect(result.allow_skip).toBe(false)
  })

  it('keeps allow_skip when skip budget remains', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ allow_skip: true }),
      coreQuestionsAsked: 1,
      totalQuestions: 6,
      ...baseOpts,
      skipsUsed: 1,
      maxSkips: 2,
    })
    expect(result.allow_skip).toBe(true)
  })

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

  it('allows a follow-up on the last planned question without consuming budget', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ is_follow_up: true }),
      coreQuestionsAsked: 4,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
    })
    expect(result.phase).toBe('core')
    expect(result.is_follow_up).toBe(true)
    expect(displayQuestionNumberAfterTurn(4, result)).toBe(4)
  })

  it('answerProbeNeeded false strips a follow-up mid-interview', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: 'What did you personally do in that disagreement?',
        speech: 'What did you personally do in that disagreement?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      answerProbeNeeded: false,
      scriptType: 'SCRIPT_H',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.is_follow_up).toBe(false)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('answerProbeNeeded false on the last core forces candidate_questions', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ is_follow_up: true }),
      coreQuestionsAsked: 4,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      answerProbeNeeded: false,
    })
    expect(result).toEqual(cannedCandidateQuestionsTurn('neutral'))
  })

  it('answerProbeNeeded true still allows an under-cap follow-up', () => {
    const display = 'What did you personally do in that disagreement?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: display,
        speech: display,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      answerProbeNeeded: true,
      scriptType: 'SCRIPT_H',
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.display_question).toBe(display)
  })

  it('answerProbeNeeded false on SCRIPT_M escalates to the next alternate core', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: 'What happens when stack memory is exhausted?',
        speech: 'What happens when stack memory is exhausted?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      answerProbeNeeded: false,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      lastQuestionType: 'technical',
      parentQuestion: 'What is the difference between stack memory and heap memory?',
      alreadyAskedQuestions: ['What is the difference between stack memory and heap memory?'],
    })
    expect(result.is_follow_up).toBe(false)
    expect(result.is_question).toBe(true)
    expect(result.question_type).toBe('behavioral')
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
  })

  it('Adaptive OFF: H follow-up wording is discarded, not promoted to a core', () => {
    const fu = 'Can you elaborate on your answer with more detail?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_question: true,
        is_follow_up: true,
        display_question: fu,
        speech: `I appreciate the honesty there. ${fu}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_H',
      parentQuestion: 'Tell me about yourself — your background, what you enjoy working on, and what\'s brought you to practice for Software Engineer today.',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.is_follow_up).toBe(false)
    expect(result.is_question).toBe(false)
    expect(result.display_question).toBeNull()
    expect(result.speech).not.toContain('elaborate')
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('Adaptive OFF: T follow-up wording is discarded, not promoted to a core', () => {
    const fu = 'Can you explain exactly how the stack and heap manage memory differently, especially regarding their allocation and lifetime?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: fu,
        speech: `I see where you're going. ${fu}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_T',
      parentQuestion:
        'Most engineers know process vs thread definitions. Give me a concrete scenario where using a thread instead of a process would be the wrong choice — and why.',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.display_question).toBeNull()
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('Adaptive OFF: H FU-shaped core with is_follow_up false is discarded', () => {
    const fu = 'Can you elaborate on your answer with more detail?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: false,
        is_question: true,
        display_question: fu,
        speech: fu,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_H',
      parentQuestion:
        'Tell me about a disagreement with a teammate. What was the situation, what did you specifically do, and what was the outcome?',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech).not.toContain('elaborate')
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('Adaptive OFF: H ack speech containing a question is replaced with move-on', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: false,
        is_question: false,
        display_question: null,
        speech: 'Good approach. How did you communicate that?',
        timer_seconds: 0,
        reading_buffer_seconds: 0,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_H',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech.includes('?')).toBe(false)
  })

  it('Adaptive OFF: T answer-hijack core is not promoted', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: false,
        is_question: true,
        display_question: 'What is the difference between stack memory and heap memory?',
        speech: 'What is the difference between stack memory and heap memory?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_T',
      parentQuestion:
        'Two sorting algorithms both have O(n log n) time complexity. Can one still be meaningfully faster than the other in practice?',
      lastCandidateAnswer:
        'Stack is for local variables and heap is for objects I think. Stack is faster. That is all I know.',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech.toLowerCase()).not.toContain('stack')
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('Adaptive OFF: planned core that overlaps the parent topic is not rejected', () => {
    const display = 'How would you optimize React rendering performance?'
    for (const scriptType of ['SCRIPT_H', 'SCRIPT_T', 'SCRIPT_M'] as const) {
      const result = applyTurnAuthorityOverrides({
        turn: baseTurn({
          is_follow_up: false,
          is_question: true,
          display_question: display,
          speech: display,
          question_type: scriptType === 'SCRIPT_M' ? 'technical' : null,
        }),
        coreQuestionsAsked: 1,
        totalQuestions: 4,
        ...baseOpts,
        followUpEnabled: false,
        hasValidParentCoreQuestion: true,
        scriptType,
        parentQuestionType: scriptType === 'SCRIPT_M' ? 'technical' : null,
        parentQuestion: 'Tell me about your React experience.',
        lastCandidateAnswer: 'I have used React on a campus portal and some hooks.',
      })
      expect(result.is_follow_up).toBe(false)
      expect(result.is_question).toBe(true)
      expect(result.display_question).toBe(display)
      expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
    }
  })

  it('Adaptive OFF: T/M FU-shaped is_follow_up false and ack-with-question are move-on', () => {
    for (const scriptType of ['SCRIPT_T', 'SCRIPT_M'] as const) {
      const elaborate = applyTurnAuthorityOverrides({
        turn: baseTurn({
          is_follow_up: false,
          display_question: 'Can you elaborate on your answer with more detail?',
          speech: 'Can you elaborate on your answer with more detail?',
        }),
        coreQuestionsAsked: 1,
        totalQuestions: 4,
        ...baseOpts,
        followUpEnabled: false,
        hasValidParentCoreQuestion: true,
        scriptType,
        parentQuestionType: scriptType === 'SCRIPT_M' ? 'technical' : null,
        parentQuestion: 'What is the difference between stack memory and heap memory?',
      })
      expect(elaborate).toEqual(cannedMoveOnTurn('neutral'))

      const hiddenQ = applyTurnAuthorityOverrides({
        turn: baseTurn({
          is_follow_up: false,
          is_question: false,
          display_question: null,
          speech: 'Good approach. How did you communicate that?',
          timer_seconds: 0,
          reading_buffer_seconds: 0,
        }),
        coreQuestionsAsked: 1,
        totalQuestions: 4,
        ...baseOpts,
        followUpEnabled: false,
        hasValidParentCoreQuestion: true,
        scriptType,
        parentQuestionType: scriptType === 'SCRIPT_M' ? 'technical' : null,
      })
      expect(hiddenQ).toEqual(cannedMoveOnTurn('neutral'))
      expect(hiddenQ.speech.includes('?')).toBe(false)
    }
  })

  it('Adaptive OFF: M follow-up is move-on; consecutive OFF FU after move-on is next alternate core', () => {
    const fu = 'Can you explain what happens when the stack or heap runs out of space during program execution?'
    const first = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: fu,
        speech: fu,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      lastQuestionType: 'technical',
      parentQuestion: 'What is the difference between stack memory and heap memory?',
    })
    expect(first).toEqual(cannedMoveOnTurn('neutral'))
    expect(displayQuestionNumberAfterTurn(1, first)).toBe(1)

    const second = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: fu,
        speech: fu,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
      lastAnswer: cannedMoveOnTurn().speech,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      lastQuestionType: 'technical',
      parentQuestion: 'What is the difference between stack memory and heap memory?',
      alreadyAskedQuestions: ['What is the difference between stack memory and heap memory?'],
    })
    expect(second.is_follow_up).toBe(false)
    expect(second.is_question).toBe(true)
    expect(second.question_type).toBe('behavioral')
    expect(second.display_question).not.toBe(fu)
    expect(displayQuestionNumberAfterTurn(1, second)).toBe(2)
  })

  it('blocks follow-ups when per-question cap reached without promoting them to core', () => {
    const fu = baseTurn({
      is_follow_up: true,
      display_question: 'What happens when stack memory is exhausted?',
      speech: 'What happens when stack memory is exhausted?',
    })
    const result = applyTurnAuthorityOverrides({
      turn: fu,
      coreQuestionsAsked: 2,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 2,
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.is_follow_up).toBe(false)
    expect(result.is_question).toBe(false)
    expect(result.display_question).toBeNull()
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('cannedParentRedirectTurn restates the parent as a follow-up (must not be used for hijack)', () => {
    const parent = 'What is the difference between stack memory and heap memory?'
    const redirect = cannedParentRedirectTurn(parent)
    expect(redirect.is_follow_up).toBe(true)
    expect(redirect.display_question).toBe(parent)
    expect(redirect.speech).toContain(parent)
  })

  it('SCRIPT_T: unrelated GraphQL follow-up after sorting parent is move-on, not a parent-copy FU', () => {
    const parent =
      'Two sorting algorithms both have O(n log n) time complexity. Can one still be meaningfully faster than the other in practice?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question:
          'What trade-off would you consider before choosing GraphQL over REST in a production application?',
        speech:
          'Makes sense. What trade-off would you consider before choosing GraphQL over REST in a production application?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_T',
      parentQuestion: parent,
      lastCandidateAnswer:
        'REST uses endpoints and GraphQL lets you request the data you need. GraphQL is more flexible.',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech.includes('GraphQL')).toBe(false)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('SCRIPT_M: GraphQL follow-up after stack/heap parent is move-on, not a parent-copy FU', () => {
    const parent = 'What is the difference between stack memory and heap memory?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question:
          'What trade-off would you consider before choosing GraphQL over REST in a production application?',
        speech:
          'Good technical reasoning. One more on that. What trade-off would you consider before choosing GraphQL over REST in a production application?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
      lastCandidateAnswer:
        'REST uses endpoints and GraphQL lets you request the data you need. GraphQL is more flexible.',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech.includes('GraphQL')).toBe(false)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('SCRIPT_H: same-topic contribution follow-up still allowed', () => {
    const display =
      'What did you personally do in that disagreement, not what the team did?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: display,
        speech: `Thanks for sharing that. ${display}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_H',
      parentQuestion:
        'Tell me about a time you disagreed with a classmate or project teammate about approach. What was the situation, what did you specifically do, and what was the outcome?',
      lastCandidateAnswer:
        'I had a difficult project at work and there were some problems, so I worked with my team and eventually completed it successfully.',
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.display_question).toBe(display)
  })

  it('SCRIPT_M: technical parent + behavioral-looking follow-up is move-on', () => {
    const parent = 'What is the difference between stack memory and heap memory?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: 'Was this entirely your decision?',
        speech: 'I follow the logic. Was this entirely your decision?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech.toLowerCase()).not.toContain('your decision')
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('SCRIPT_M: behavioral parent + technical-looking follow-up is move-on', () => {
    const parent = 'Tell me about a time you disagreed with a teammate.'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'behavioral',
        display_question: 'What is the time complexity of that approach?',
        speech: 'What is the time complexity of that approach?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'behavioral',
      parentQuestion: parent,
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech.toLowerCase()).not.toContain('time complexity')
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('SCRIPT_M: valid technical follow-up stays technical', () => {
    const display =
      'What happens when stack memory is exhausted, and how does that differ from running out of heap memory?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: display,
        speech: `One more on that. ${display}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: 'What is the difference between stack memory and heap memory?',
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.question_type).toBe('technical')
    expect(result.display_question).toBe(display)
  })

  it('SCRIPT_M: parent-verbatim follow-up is rejected without consuming the FU slot or question count', () => {
    const parent =
      'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.'
    const rejected = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: parent,
        speech: `Good. ${parent}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 0,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
    })
    expect(rejected).toEqual(cannedMoveOnTurn('neutral'))
    expect(rejected.is_follow_up).toBe(false)
    expect(rejected.is_question).toBe(false)
    expect(displayQuestionNumberAfterTurn(1, rejected)).toBe(1)

    const deeper =
      'What happens when the stack overflows, and how is that different from heap exhaustion?'
    const accepted = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: deeper,
        speech: `One more on that. ${deeper}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 0,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
    })
    expect(accepted.is_follow_up).toBe(true)
    expect(accepted.question_type).toBe('technical')
    expect(accepted.display_question).toBe(deeper)
    expect(displayQuestionNumberAfterTurn(1, accepted)).toBe(1)
    expect(speechCarriesExactDisplayQuestion(accepted.speech, deeper)).toBe(true)
  })

  it('SCRIPT_M: FU2 that restates FU1 is rejected without spending the second slot', () => {
    const parent =
      'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.'
    const fu1 =
      'What happens when the stack overflows, and how is that different from heap exhaustion?'
    const rejected = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: fu1,
        speech: fu1,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 1,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
      lastFollowUpQuestion: fu1,
    })
    expect(rejected).toEqual(cannedMoveOnTurn('neutral'))
    expect(rejected.is_follow_up).toBe(false)
    expect(displayQuestionNumberAfterTurn(1, rejected)).toBe(1)

    const fu2 =
      'Can you explain what happens when the stack memory is exhausted, and how that differs from heap memory exhaustion?'
    const accepted = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: fu2,
        speech: `Stay with me on this. ${fu2}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 1,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
      lastFollowUpQuestion: fu1,
    })
    expect(accepted.is_follow_up).toBe(true)
    expect(accepted.display_question).toBe(fu2)
    expect(displayQuestionNumberAfterTurn(1, accepted)).toBe(1)
    expect(speechCarriesExactDisplayQuestion(accepted.speech, fu2)).toBe(true)
  })

  it('SCRIPT_M: two distinct follow-ups stay follow-ups and cap at 2', () => {
    const parent =
      'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.'
    const fu1 =
      'What happens when the stack overflows, and how is that different from heap exhaustion?'
    const fu2 =
      'Give an example of when you would allocate on the heap rather than the stack, and why.'
    const first = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: fu1,
        speech: fu1,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 0,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
    })
    expect(first.is_follow_up).toBe(true)
    expect(displayQuestionNumberAfterTurn(1, first)).toBe(1)

    const second = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: fu2,
        speech: fu2,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 1,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
      lastFollowUpQuestion: fu1,
    })
    expect(second.is_follow_up).toBe(true)
    expect(displayQuestionNumberAfterTurn(1, second)).toBe(1)

    const over = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: 'One more on stack vs heap allocation trade-offs?',
        speech: 'One more on stack vs heap allocation trade-offs?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 2,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      lastQuestionType: 'technical',
      parentQuestion: parent,
      lastFollowUpQuestion: fu2,
      alreadyAskedQuestions: [parent, fu1, fu2],
    })
    expect(over.is_follow_up).toBe(false)
    expect(over.is_question).toBe(true)
    expect(over.question_type).toBe('behavioral')
    expect(over.display_question).not.toBe(parent)
    expect(over.display_question).not.toBe(fu1)
    expect(over.display_question).not.toBe(fu2)
    expect(displayQuestionNumberAfterTurn(1, over)).toBe(2)
  })

  it('SCRIPT_M: behavioral core → valid FU1 → valid FU2 → technical core', () => {
    const parent =
      'Tell me about a time you disagreed with a teammate. What was the situation, what did you specifically do, and what was the outcome?'
    const fu1 = 'What did you personally do in that disagreement, not the team?'
    const fu2 = 'What changed afterward, and how did you know the outcome stuck?'
    const first = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'behavioral',
        display_question: fu1,
        speech: fu1,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 0,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'behavioral',
      parentQuestion: parent,
    })
    expect(first.is_follow_up).toBe(true)
    expect(first.question_type).toBe('behavioral')
    expect(displayQuestionNumberAfterTurn(1, first)).toBe(1)

    const second = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'behavioral',
        display_question: fu2,
        speech: fu2,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 1,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'behavioral',
      parentQuestion: parent,
      lastFollowUpQuestion: fu1,
    })
    expect(second.is_follow_up).toBe(true)
    expect(second.question_type).toBe('behavioral')
    expect(displayQuestionNumberAfterTurn(1, second)).toBe(1)

    const over = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'behavioral',
        display_question: 'One more on how you handled that teammate conflict?',
        speech: 'One more on how you handled that teammate conflict?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 2,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'behavioral',
      lastQuestionType: 'behavioral',
      parentQuestion: parent,
      lastFollowUpQuestion: fu2,
      alreadyAskedQuestions: [parent, fu1, fu2],
    })
    expect(over.is_follow_up).toBe(false)
    expect(over.is_question).toBe(true)
    expect(over.question_type).toBe('technical')
    expect(over.display_question).not.toBe(parent)
    expect(over.display_question).not.toBe(fu1)
    expect(over.display_question).not.toBe(fu2)
    expect(displayQuestionNumberAfterTurn(1, over)).toBe(2)
  })

  it('SCRIPT_M: under-cap invalid after move-on escalates to the next core (no move-on loop)', () => {
    const parent =
      'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: parent,
        speech: parent,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 1,
      lastAnswer: cannedMoveOnTurn().speech,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      lastQuestionType: 'technical',
      parentQuestion: parent,
      alreadyAskedQuestions: [parent],
    })
    expect(result.is_follow_up).toBe(false)
    expect(result.is_question).toBe(true)
    expect(result.question_type).toBe('behavioral')
    expect(result.display_question).not.toBe(parent)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
  })

  it('SCRIPT_M: valid FU2 after a rejected generation is accepted', () => {
    const parent =
      'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.'
    const fu1 =
      'What happens when the stack overflows, and how is that different from heap exhaustion?'
    const fu2 =
      'Give an example of when you would allocate on the heap rather than the stack, and why.'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: fu2,
        speech: `Stay with me on this. ${fu2}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 1,
      lastAnswer: cannedMoveOnTurn().speech,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      lastQuestionType: 'technical',
      parentQuestion: parent,
      lastFollowUpQuestion: fu1,
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.question_type).toBe('technical')
    expect(result.display_question).toBe(fu2)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('SCRIPT_H: parent-same follow-up is unchanged', () => {
    const parent =
      'Tell me about a time you disagreed with a classmate or project teammate about approach. What was the situation, what did you specifically do, and what was the outcome?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: parent,
        speech: `Thanks for sharing that. ${parent}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_H',
      parentQuestion: parent,
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.display_question).toBe(parent)
    expect(speechCarriesExactDisplayQuestion(result.speech, parent)).toBe(true)
  })

  it('SCRIPT_T: same-topic follow-up still accepted; parent restatement still accepted', () => {
    const parent =
      'Two sorting algorithms both have O(n log n) time complexity. Can one still be meaningfully faster than the other in practice? Why or why not?'
    const deeper =
      'Why might one O(n log n) sorting algorithm still be faster than another in practice?'
    const valid = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: deeper,
        speech: `Stay with me. ${deeper}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_T',
      parentQuestion: parent,
      lastCandidateAnswer: 'I would just use a simple loop I guess and print the numbers.',
    })
    expect(valid.is_follow_up).toBe(true)
    expect(valid.display_question).toBe(deeper)

    const restated = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: parent,
        speech: parent,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_T',
      parentQuestion: parent,
      lastCandidateAnswer: 'I would just use a simple loop I guess and print the numbers.',
    })
    expect(restated.is_follow_up).toBe(true)
    expect(restated.display_question).toBe(parent)
  })

  it('SCRIPT_M cap: parent/FU1/FU2 cannot become the next core — next is new alternate type', () => {
    const parent = 'What is the difference between stack memory and heap memory?'
    const fu1 =
      'Can you explain the main differences between stack memory and heap memory in terms of their structure and typical usage?'
    const fu2 =
      'What trade-off would you consider before choosing GraphQL over REST in a production application?'
    const asked = [parent, fu1, fu2]
    for (const dup of [parent, fu1, fu2]) {
      const result = applyTurnAuthorityOverrides({
        turn: baseTurn({
          is_follow_up: true,
          question_type: 'technical',
          display_question: dup,
          speech: dup,
        }),
        coreQuestionsAsked: 1,
        totalQuestions: 4,
        ...baseOpts,
        followUpsThisQuestion: 2,
        lastAnswer: cannedMoveOnTurn().speech,
        lastFollowUpQuestion: fu2,
        parentQuestion: parent,
        parentQuestionType: 'technical',
        lastQuestionType: 'technical',
        alreadyAskedQuestions: asked,
        scriptType: 'SCRIPT_M',
      })
      expect(result.is_follow_up).toBe(false)
      expect(result.is_question).toBe(true)
      expect(result.question_type).toBe('behavioral')
      expect(result.display_question).not.toBe(parent)
      expect(result.display_question).not.toBe(fu1)
      expect(result.display_question).not.toBe(fu2)
      expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
    }
  })

  it('SCRIPT_M cap: a new behavioral question flagged as FU becomes the next core', () => {
    const display =
      "Tell me about a time you had to deliver something under a tight deadline when you didn't have all the information you needed. What did you do and what was the outcome?"
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'behavioral',
        display_question: display,
        speech: `Let's switch direction. ${display}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 2,
      parentQuestion: 'What is the difference between stack memory and heap memory?',
      parentQuestionType: 'technical',
      lastQuestionType: 'technical',
      alreadyAskedQuestions: ['What is the difference between stack memory and heap memory?'],
      scriptType: 'SCRIPT_M',
    })
    expect(result.is_follow_up).toBe(false)
    expect(result.question_type).toBe('behavioral')
    expect(result.display_question).toBe(display)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
  })

  it('H/T cap + move-on + duplicate FU escalates to a new core instead of stacking a second move-on', () => {
    // lastAnswer already being a move-on means a *second* cannedMoveOnTurn
    // here would stack two consecutive non-question acks in a row, which
    // trips the client's consecutive-ack recovery guard ("The interviewer
    // produced an unexpected response.") — see turn-authority.ts
    // escalateAfterMoveOn. The fallback must be a real, unasked core
    // question, not another ack and not a restatement of the parent.
    const fu = 'What did you personally do in that disagreement, not what the team did?'
    const parent =
      'Tell me about a time you disagreed with a classmate or project teammate about approach.'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: fu,
        speech: fu,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 2,
      lastAnswer: cannedMoveOnTurn().speech,
      lastFollowUpQuestion: fu,
      parentQuestion: parent,
      alreadyAskedQuestions: [parent, fu],
      scriptType: 'SCRIPT_H',
    })
    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(false)
    expect(result.display_question).not.toBeNull()
    expect(result.display_question).not.toBe(parent)
    expect(result.display_question).not.toBe(fu)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
  })

  it('H/T answerProbeNeeded-false + already moved on escalates instead of a second move-on', () => {
    const fu = 'What did you personally do in that disagreement?'
    const parent = 'Tell me about a time you disagreed with a classmate or project teammate about approach.'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: fu,
        speech: fu,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      answerProbeNeeded: false,
      lastAnswer: cannedMoveOnTurn().speech,
      lastFollowUpQuestion: fu,
      parentQuestion: parent,
      alreadyAskedQuestions: [parent, fu],
      scriptType: 'SCRIPT_H',
    })
    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(false)
    expect(result.display_question).not.toBeNull()
    expect(result.display_question).not.toBe(parent)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
  })

  it('H/T no valid parent + already moved on escalates instead of a second move-on', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: 'Some stray follow-up text.',
        speech: 'Some stray follow-up text.',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: false,
      lastAnswer: cannedMoveOnTurn().speech,
      scriptType: 'SCRIPT_T',
    })
    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(false)
    expect(result.display_question).not.toBeNull()
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
  })

  it('Adaptive OFF + already moved on escalates instead of a second move-on', () => {
    const fu = 'Can you elaborate on your answer with more detail?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_question: true,
        is_follow_up: true,
        display_question: fu,
        speech: `I appreciate the honesty there. ${fu}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      followUpEnabled: false,
      hasValidParentCoreQuestion: true,
      lastAnswer: cannedMoveOnTurn().speech,
      scriptType: 'SCRIPT_H',
      parentQuestion: 'Tell me about yourself — your background, what you enjoy working on, and what\'s brought you to practice for Software Engineer today.',
    })
    expect(result.is_question).toBe(true)
    expect(result.is_follow_up).toBe(false)
    expect(result.display_question).not.toBeNull()
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(2)
  })

  it('cap + already moved on strips FU flag to break ack loop', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        display_question: 'A brand new core question about system design?',
        speech: 'A brand new core question about system design?',
      }),
      coreQuestionsAsked: 2,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 2,
      lastAnswer: cannedMoveOnTurn().speech,
    })
    expect(result.is_follow_up).toBe(false)
    expect(result.is_question).toBe(true)
    expect(result.display_question).toBe('A brand new core question about system design?')
  })

  it('shouldForceCoreEntryBeforeLlm after the single warmup invite when self_intro is off', () => {
    expect(
      shouldForceCoreEntryBeforeLlm({
        requestPhase: 'warmup',
        warmupQuestionsAsked: 1,
        warmupTurns: 1,
        selfIntroEnabled: false,
      }),
    ).toBe(true)
    // Boot turn itself must still be generated.
    expect(
      shouldForceCoreEntryBeforeLlm({
        requestPhase: 'warmup',
        warmupQuestionsAsked: 0,
        warmupTurns: 0,
        selfIntroEnabled: false,
      }),
    ).toBe(false)
    expect(
      shouldForceCoreEntryBeforeLlm({
        requestPhase: 'warmup',
        warmupQuestionsAsked: 1,
        warmupTurns: 1,
        selfIntroEnabled: true,
      }),
    ).toBe(false)
  })

  it('allows a second follow-up when count is 1 and enabled', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ is_follow_up: true }),
      coreQuestionsAsked: 2,
      totalQuestions: 4,
      ...baseOpts,
      followUpsThisQuestion: 1,
      hasValidParentCoreQuestion: true,
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.phase).toBe('core')
  })

  it('strips follow-ups in non-core phases', () => {
    for (const phase of ['warmup', 'self_intro', 'candidate_questions', 'closing'] as const) {
      const result = applyTurnAuthorityOverrides({
        turn: baseTurn({
          is_follow_up: true,
          phase,
          timer_seconds: phase === 'closing' ? 0 : 10,
          reading_buffer_seconds: phase === 'closing' ? 0 : 2,
        }),
        coreQuestionsAsked: 0,
        totalQuestions: 4,
        ...baseOpts,
        requestPhase: phase,
        hasValidParentCoreQuestion: true,
      })
      expect(result.is_follow_up).toBe(false)
    }
  })

  it('strips follow-ups when no valid parent question/answer', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ is_follow_up: true }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: false,
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.is_follow_up).toBe(false)
    expect(result.is_question).toBe(false)
  })

  it('strips follow-ups on skip and timeout', () => {
    for (const lastAnswer of ['[SKIPPED]', '[TIMEOUT]']) {
      const result = applyTurnAuthorityOverrides({
        turn: baseTurn({ is_follow_up: true }),
        coreQuestionsAsked: 1,
        totalQuestions: 4,
        ...baseOpts,
        lastAnswer,
        hasValidParentCoreQuestion: true,
      })
      expect(result).toEqual(cannedMoveOnTurn('neutral'))
      expect(result.is_follow_up).toBe(false)
    }
  })

  it('SCRIPT_M: same-topic GraphQL follow-up is accepted after an off-topic stack/heap answer', () => {
    const parent =
      'What trade-off would you consider before choosing GraphQL over REST in a production application?'
    const display =
      'What production cost would you accept for GraphQL’s flexibility versus REST?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: display,
        speech: `One more on that. ${display}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
      lastCandidateAnswer: 'Stack is for local variables and heap is for objects I think. Stack is faster. That is all I know.',
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.question_type).toBe('technical')
    expect(result.display_question).toBe(display)
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('SCRIPT_M: parent restated with a speech bridge is still a duplicate', () => {
    const parent =
      'What trade-off would you consider before choosing GraphQL over REST in a production application?'
    const rejected = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: parent,
        speech: `Good technical reasoning. One more on that. ${parent}`,
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: `Good technical reasoning. One more on that. ${parent}`,
    })
    expect(rejected).toEqual(cannedMoveOnTurn('neutral'))
    expect(displayQuestionNumberAfterTurn(1, rejected)).toBe(1)
  })

  it('SCRIPT_M: anaphoric GraphQL follow-up after a stack/heap parent is move-on', () => {
    const parent =
      'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question: 'Can you explain the N+1 problem associated with GraphQL in more detail?',
        speech: 'Can you explain the N+1 problem associated with GraphQL in more detail?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
      lastCandidateAnswer:
        'REST vs GraphQL: REST maps resources to URLs; GraphQL lets the client ask for a graph. Trade-off: GraphQL shifts cost to the server (N+1, authz per field) while REST is simpler to cache at the CDN.',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech.toLowerCase()).not.toContain('graphql')
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('SCRIPT_M: hashmap/p99 follow-up after a GraphQL parent is move-on, not a parent-copy FU', () => {
    const parent =
      'What trade-off would you consider before choosing GraphQL over REST in a production application?'
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        is_follow_up: true,
        question_type: 'technical',
        display_question:
          'How did you monitor and verify the p99 latency improvements after deploying your hashmap solution?',
        speech:
          'How did you monitor and verify the p99 latency improvements after deploying your hashmap solution?',
      }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      scriptType: 'SCRIPT_M',
      parentQuestionType: 'technical',
      parentQuestion: parent,
      lastCandidateAnswer:
        'The problem was slow list lookups on large inputs. I used a hash map so average lookup is O(1). The trade-off versus a sorted array is extra memory and worse cache locality, but throughput mattered more. Ultimately p99 latency dropped and the endpoint stayed stable.',
    })
    expect(result).toEqual(cannedMoveOnTurn('neutral'))
    expect(result.speech.toLowerCase()).not.toContain('hashmap')
    expect(displayQuestionNumberAfterTurn(1, result)).toBe(1)
  })

  it('copies SCRIPT_M parent question_type onto a follow-up when omitted', () => {
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({ is_follow_up: true, question_type: null }),
      coreQuestionsAsked: 1,
      totalQuestions: 4,
      ...baseOpts,
      hasValidParentCoreQuestion: true,
      parentQuestionType: 'behavioral',
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.question_type).toBe('behavioral')
  })

  it('keeps a flagged follow-up from incrementing the main question number', () => {
    const turn = baseTurn({ is_follow_up: true })
    expect(displayQuestionNumberAfterTurn(2, turn)).toBe(2)
    expect(displayQuestionNumberAfterTurn(2, baseTurn({ is_follow_up: false }))).toBe(3)
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

  it('treats an unmarked CQ question as a dedicated CQ follow-up', () => {
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
    expect(result.phase).toBe('candidate_questions')
    expect(result.is_follow_up).toBe(false)
    expect(result.candidate_question_action).toBe('follow_up')
  })

  it('leaves first candidate decline for route-owned guidance', () => {
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
    expect(result.phase).toBe('candidate_questions')
    expect(result.candidate_question_action).toBe('answer')
  })

  it('increments display number only for new core questions', () => {
    expect(displayQuestionNumberAfterTurn(2, baseTurn())).toBe(3)
    expect(displayQuestionNumberAfterTurn(2, baseTurn({ is_follow_up: true }))).toBe(2)
    expect(displayQuestionNumberAfterTurn(2, baseTurn({ is_question: false, timer_seconds: 0, reading_buffer_seconds: 0 }))).toBe(2)
  })

  it('resolves prompt phase when budget spent', () => {
    expect(resolvePromptPhase('core', 4, 4)).toBe('candidate_questions')
    expect(resolvePromptPhase('core', 3, 4)).toBe('core')
    expect(
      resolvePromptPhase('core', 4, 4, {
        followUpEnabled: true,
        followUpsThisQuestion: 0,
        maxFollowUpsPerQuestion: 2,
        hasValidParentCoreQuestion: true,
      }),
    ).toBe('core')
    expect(
      resolvePromptPhase('core', 4, 4, {
        followUpEnabled: true,
        followUpsThisQuestion: 2,
        maxFollowUpsPerQuestion: 2,
        hasValidParentCoreQuestion: true,
      }),
    ).toBe('candidate_questions')
    expect(
      resolvePromptPhase('core', 4, 4, {
        followUpEnabled: true,
        followUpsThisQuestion: 0,
        maxFollowUpsPerQuestion: 2,
        hasValidParentCoreQuestion: true,
        answerProbeNeeded: false,
      }),
    ).toBe('candidate_questions')
    expect(resolvePromptPhase('warmup', 4, 4)).toBe('warmup')
    expect(
      resolvePromptPhase('warmup', 0, 4, {
        warmupQuestionsAsked: 1,
        selfIntroEnabled: false,
      }),
    ).toBe('core')
    expect(
      resolvePromptPhase('warmup', 0, 4, {
        warmupQuestionsAsked: 1,
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

  it('warmup is exactly one turn: the scripted "Ready?" second invite is discarded', () => {
    expect(MAX_WARMUP_QUESTIONS).toBe(1)

    const secondWarmup = baseTurn({
      phase: 'warmup',
      speech: "That's great. Today we have 4 questions. Ready?",
      display_question: null,
      timer_seconds: 10,
      reading_buffer_seconds: 2,
      auto_submit: true,
      show_auto_structure: false,
    })
    const warmupSpentOpts = {
      coreQuestionsAsked: 0,
      totalQuestions: 4,
      followUpsThisQuestion: 0,
      followUpEnabled: false,
      candidateQuestionsExchanges: 0,
      requestPhase: 'warmup',
      lastAnswer: 'I am doing well, thanks.',
      warmupQuestionsAsked: 1,
      warmupTurns: 1,
    }

    const withSelfIntro = applyTurnAuthorityOverrides({
      ...warmupSpentOpts,
      turn: secondWarmup,
      selfIntroEnabled: true,
    })
    expect(withSelfIntro.phase).toBe('self_intro')
    expect(withSelfIntro.is_question).toBe(true)
    expect(withSelfIntro.speech).not.toMatch(/Ready\?/)

    const withoutSelfIntro = applyTurnAuthorityOverrides({
      ...warmupSpentOpts,
      turn: secondWarmup,
      selfIntroEnabled: false,
    })
    expect(withoutSelfIntro).toEqual(cannedCoreEntryTurn('neutral'))
    expect(withoutSelfIntro.speech).not.toMatch(/Ready\?/)
  })

  it('the first (boot) warmup turn is still allowed through', () => {
    const speech = "Hi Asha! I'm Meera. Really glad you're here today. How are you doing?"
    const result = applyTurnAuthorityOverrides({
      turn: baseTurn({
        phase: 'warmup',
        speech,
        display_question: null,
        timer_seconds: 10,
        reading_buffer_seconds: 2,
        auto_submit: true,
        show_auto_structure: false,
      }),
      coreQuestionsAsked: 0,
      totalQuestions: 4,
      followUpsThisQuestion: 0,
      followUpEnabled: false,
      candidateQuestionsExchanges: 0,
      requestPhase: 'warmup',
      lastAnswer: '[NONE]',
      warmupQuestionsAsked: 0,
      warmupTurns: 0,
      selfIntroEnabled: true,
    })
    expect(result.phase).toBe('warmup')
    expect(result.speech).toBe(speech)
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

  it('turn-cap exhaustion reserves candidate_questions when cores are done', () => {
    expect(
      resolveTurnCapExhaustion({
        coreQuestionsAsked: 4,
        totalQuestions: 4,
        candidateQuestionsExchanges: 0,
      }),
    ).toBe('candidate_questions')
    expect(
      resolveTurnCapExhaustion({
        coreQuestionsAsked: 4,
        totalQuestions: 4,
        candidateQuestionsExchanges: 1,
      }),
    ).toBe('closing')
    expect(
      resolveTurnCapExhaustion({
        coreQuestionsAsked: 2,
        totalQuestions: 4,
        candidateQuestionsExchanges: 0,
      }),
    ).toBe('closing')
  })
})

describe('existingNextTurnIndexAfterAnswer', () => {
  it('returns null for boot [NONE] / missing prevTurnIndex', () => {
    expect(
      existingNextTurnIndexAfterAnswer({
        prevTurnIndex: undefined,
        lastAnswer: '[NONE]',
        currentTurnIndex: 0,
      }),
    ).toBeNull()
    expect(
      existingNextTurnIndexAfterAnswer({
        prevTurnIndex: 3,
        lastAnswer: '[NONE]',
        currentTurnIndex: 4,
      }),
    ).toBeNull()
  })

  it('returns null when the next turn was not yet persisted', () => {
    expect(
      existingNextTurnIndexAfterAnswer({
        prevTurnIndex: 5,
        lastAnswer: 'My answer',
        currentTurnIndex: 5,
      }),
    ).toBeNull()
  })

  it('returns the expected next index when a prior /turn already advanced the interview', () => {
    // Prefetch inserted turn 6 and updated current_turn_index → 6; client lost the response.
    expect(
      existingNextTurnIndexAfterAnswer({
        prevTurnIndex: 5,
        lastAnswer: 'My answer',
        currentTurnIndex: 6,
      }),
    ).toBe(6)
  })

  it('still returns expectedNext even if current_turn_index drifted ahead (orphan already created)', () => {
    expect(
      existingNextTurnIndexAfterAnswer({
        prevTurnIndex: 5,
        lastAnswer: 'My answer',
        currentTurnIndex: 7,
      }),
    ).toBe(6)
  })
})

describe('bootResumeTurnIndex', () => {
  it('returns null for non-boot answers', () => {
    expect(
      bootResumeTurnIndex({ lastAnswer: 'My answer', currentTurnIndex: 3 }),
    ).toBeNull()
  })

  it('returns null on cold boot (no turns yet)', () => {
    expect(bootResumeTurnIndex({ lastAnswer: '[NONE]', currentTurnIndex: 0 })).toBeNull()
  })

  it('resumes the latest turn when [NONE] is repeated after advancement', () => {
    expect(bootResumeTurnIndex({ lastAnswer: '[NONE]', currentTurnIndex: 1 })).toBe(1)
    expect(bootResumeTurnIndex({ lastAnswer: '[NONE]', currentTurnIndex: 2 })).toBe(2)
  })
})

const authorityOpts = {
  coreQuestionsAsked: 1,
  totalQuestions: 4,
  followUpsThisQuestion: 0,
  followUpEnabled: true,
  candidateQuestionsExchanges: 0,
  requestPhase: 'core',
  lastAnswer: 'Here is my answer about the topic in enough detail.',
}

describe('applyTurnAuthorityOverrides speech canonicalization (H/T/M)', () => {
  it('SCRIPT_H question paraphrase → exact display_question suffix', () => {
    const display =
      'Give me a specific example where you identified a problem and took initiative to solve it without being asked. What was the outcome?'
    const result = applyTurnAuthorityOverrides({
      ...authorityOpts,
      turn: baseTurn({
        speech:
          'That sounds like a real challenge. Can you walk me through a specific example of a problem you identified during InterviewEra and the initiative you took to solve it? What was the outcome?',
        display_question: display,
        question_type: undefined,
      }),
    })
    expect(speechCarriesExactDisplayQuestion(result.speech, display)).toBe(true)
    expect(result.display_question).toBe(display)
  })

  it('SCRIPT_T question paraphrase → exact display_question suffix', () => {
    const display =
      'How does REST API differ from GraphQL? When would you choose one over the other and why?'
    const result = applyTurnAuthorityOverrides({
      ...authorityOpts,
      turn: baseTurn({
        speech: "Good. Let's move to the technical side. Can you explain REST versus GraphQL?",
        display_question: display,
      }),
    })
    expect(result.speech).toBe(`Good. Let's move to the technical side. ${display}`)
  })

  it('SCRIPT_M behavioral + technical both canonicalize', () => {
    const behavioral = applyTurnAuthorityOverrides({
      ...authorityOpts,
      turn: baseTurn({
        speech: "Let's switch direction a bit. Tell me about a tight deadline you handled.",
        display_question:
          'Tell me about a time you had to deliver something under a tight deadline. What was the outcome?',
        question_type: 'behavioral',
      }),
    })
    expect(
      speechCarriesExactDisplayQuestion(
        behavioral.speech,
        'Tell me about a time you had to deliver something under a tight deadline. What was the outcome?',
      ),
    ).toBe(true)

    const technical = applyTurnAuthorityOverrides({
      ...authorityOpts,
      turn: baseTurn({
        speech: 'Back to technical — what is the difference between stack and heap?',
        display_question:
          'What is the difference between stack memory and heap memory? Give an example of when each is used.',
        question_type: 'technical',
      }),
    })
    expect(
      speechCarriesExactDisplayQuestion(
        technical.speech,
        'What is the difference between stack memory and heap memory? Give an example of when each is used.',
      ),
    ).toBe(true)
  })

  it('does not rewrite warmup (display_question null)', () => {
    const speech = "Hi Rakesh! I'm Rohan. How are you doing?"
    const result = applyTurnAuthorityOverrides({
      ...authorityOpts,
      requestPhase: 'warmup',
      coreQuestionsAsked: 0,
      turn: baseTurn({
        phase: 'warmup',
        speech,
        display_question: null,
        timer_seconds: 10,
        reading_buffer_seconds: 2,
        auto_submit: true,
        show_auto_structure: false,
      }),
      warmupQuestionsAsked: 0,
    })
    expect(result.phase).toBe('warmup')
    expect(result.speech).toBe(speech)
    expect(result.display_question).toBeNull()
  })
})

describe('cannedNextCoreQuestionTurn — no-ack guarantee', () => {
  const SCRIPT_H_FALLBACK = 'Tell me about a time you faced a setback or disagreement at work or in a project. What did you do, and what was the outcome?'
  const SCRIPT_T_FALLBACK = 'Walk me through how you would approach this problem end to end, including the main trade-off you would make.'

  it('SCRIPT_H: returns the canned fallback question when nothing is asked yet', () => {
    const result = cannedNextCoreQuestionTurn({ scriptType: 'SCRIPT_H', alreadyAsked: [] })
    expect(result.is_question).toBe(true)
    expect(result.phase).toBe('core')
    expect(result.display_question).toBe(SCRIPT_H_FALLBACK)
  })

  it('SCRIPT_T: returns the canned fallback question when nothing is asked yet', () => {
    const result = cannedNextCoreQuestionTurn({ scriptType: 'SCRIPT_T', alreadyAsked: [] })
    expect(result.is_question).toBe(true)
    expect(result.display_question).toBe(SCRIPT_T_FALLBACK)
  })

  it('SCRIPT_H: returns candidate_questions (NOT an ack) when canned fallback is already asked', () => {
    const result = cannedNextCoreQuestionTurn({
      scriptType: 'SCRIPT_H',
      alreadyAsked: [SCRIPT_H_FALLBACK],
    })
    // Must never return is_question:false — that would cause an infinite ack loop.
    expect(result.is_question).toBe(true)
    expect(result.phase).toBe('candidate_questions')
    expect(result).toEqual(cannedCandidateQuestionsTurn())
  })

  it('SCRIPT_T: returns candidate_questions when canned fallback is already asked', () => {
    const result = cannedNextCoreQuestionTurn({
      scriptType: 'SCRIPT_T',
      alreadyAsked: [SCRIPT_T_FALLBACK],
    })
    expect(result.is_question).toBe(true)
    expect(result.phase).toBe('candidate_questions')
  })

  it('consecutive-ack guard never returns an ack when previousTurnWasAcknowledgment + all canned Qs used', () => {
    const ackTurn: ScriptTurnOutput = {
      speech: "Thanks. Let's keep going.",
      display_question: null,
      tip: null,
      timer_seconds: 0,
      reading_buffer_seconds: 0,
      auto_submit: false,
      allow_skip: false,
      show_auto_structure: false,
      phase: 'core',
      is_question: false,
      is_follow_up: false,
      question_difficulty: null,
      interviewer_emotion: 'neutral',
    }
    const result = applyTurnAuthorityOverrides({
      turn: ackTurn,
      coreQuestionsAsked: 2,
      totalQuestions: 5,
      followUpsThisQuestion: 0,
      followUpEnabled: true,
      requestPhase: 'core',
      lastAnswer: cannedMoveOnTurn().speech,
      previousTurnWasAcknowledgment: true,
      scriptType: 'SCRIPT_H',
      alreadyAskedQuestions: [SCRIPT_H_FALLBACK],
    })
    // Even when all canned fallback questions are exhausted, the guard must
    // never produce another is_question:false turn — that loops the client.
    expect(result.is_question).toBe(true)
  })
})
