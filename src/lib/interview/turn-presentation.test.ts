import { afterEach, describe, expect, it } from 'vitest'
import { cannedScriptMNextCoreTurn } from '@/lib/ai/scripts/script-m-progression'
import {
  _resetTurnPresentationForTests,
  applyWarmupEvent,
  canEnterCandidateAnswering,
  canShowFeedbackWithVisibleQuestion,
  claimTurnSpeak,
  decideAckAdvance,
  decideContinueActivation,
  decideNonQuestionProgression,
  decideTurnApply,
  decideTurnSpeak,
  feedbackBindEquals,
  getActiveTurnIndex,
  getWarmupLifecycle,
  hasTurnBeenPresented,
  isLiveTurnCallback,
  isStaleFetchCallback,
  markTurnPresented,
  MAX_CONSECUTIVE_NON_QUESTION_TURNS,
  nextWarmupLifecycle,
  selectFeedbackForRender,
  setActiveTurnIndex,
  shouldStopPriorTts,
  turnHasAuthoritativeQuestion,
  uiTtsShareIdentity,
} from './turn-presentation'

afterEach(() => {
  _resetTurnPresentationForTests()
})

const INT = 'int-qa'

describe('A. Warmup turn is presented once', () => {
  it('first warmup apply is apply; second delivery of the same turnIndex hydrates without replay', () => {
    expect(
      decideTurnApply({
        interviewId: INT,
        incomingTurnIndex: 1,
        incomingPhase: 'warmup',
        componentActiveTurnIndex: null,
      }),
    ).toBe('apply')

    markTurnPresented(INT, 1)
    setActiveTurnIndex(INT, 1)
    applyWarmupEvent(INT, 'present', 'warmup')

    expect(
      decideTurnApply({
        interviewId: INT,
        incomingTurnIndex: 1,
        incomingPhase: 'warmup',
        componentActiveTurnIndex: 1,
      }),
    ).toBe('ignore_duplicate')

    // Strict Mode remount: React state empty, module still owns turn 1.
    expect(
      decideTurnApply({
        interviewId: INT,
        incomingTurnIndex: 1,
        incomingPhase: 'warmup',
        componentActiveTurnIndex: null,
      }),
    ).toBe('hydrate_ui_only')
  })
})

describe('B. Same turn cannot trigger duplicate TTS', () => {
  it('claimTurnSpeak allows one speaker per turn identity', () => {
    expect(claimTurnSpeak(INT, 1)).toBe(true)
    expect(claimTurnSpeak(INT, 1)).toBe(false)
    expect(claimTurnSpeak(INT, 2)).toBe(true)
  })

  it('hydrateOnly and already-spoken skip speak', () => {
    markTurnPresented(INT, 1)
    setActiveTurnIndex(INT, 1)
    expect(decideTurnSpeak({ interviewId: INT, turnIndex: 1, hydrateOnly: true })).toBe(
      'skip_already_spoken',
    )
    expect(claimTurnSpeak(INT, 1)).toBe(true)
    expect(decideTurnSpeak({ interviewId: INT, turnIndex: 1, hydrateOnly: false })).toBe(
      'skip_already_spoken',
    )
  })
})

describe('C. Stale warmup callback cannot restore warmup question', () => {
  it('warmup ack after the candidate answers is still applied (not ignore_stale)', () => {
    markTurnPresented(INT, 1)
    setActiveTurnIndex(INT, 1)
    applyWarmupEvent(INT, 'present', 'warmup')
    applyWarmupEvent(INT, 'answer_submitted', 'warmup')
    expect(getWarmupLifecycle(INT)).toBe('waiting_for_answer')
    expect(
      decideTurnApply({
        interviewId: INT,
        incomingTurnIndex: 2,
        incomingPhase: 'warmup',
        componentActiveTurnIndex: 1,
      }),
    ).toBe('apply')
  })

  it('warmup is terminal after phase exit to a non-warmup turn', () => {
    applyWarmupEvent(INT, 'present', 'warmup')
    expect(getWarmupLifecycle(INT)).toBe('presenting')
    markTurnPresented(INT, 1)
    setActiveTurnIndex(INT, 2)
    applyWarmupEvent(INT, 'exit_to_non_warmup', 'core')
    expect(getWarmupLifecycle(INT)).toBe('completed')

    expect(
      decideTurnApply({
        interviewId: INT,
        incomingTurnIndex: 1,
        incomingPhase: 'warmup',
        componentActiveTurnIndex: 2,
      }),
    ).toBe('ignore_stale')

    expect(
      isLiveTurnCallback({
        interviewId: INT,
        callbackTurnIndex: 1,
        callbackGeneration: 1,
        activeGeneration: 1,
        callbackPhase: 'warmup',
      }),
    ).toBe(false)
  })

  it('exit_to_non_warmup completes even without an explicit answer event', () => {
    applyWarmupEvent(INT, 'present', 'warmup')
    applyWarmupEvent(INT, 'exit_to_non_warmup', 'core')
    expect(getWarmupLifecycle(INT)).toBe('completed')
    expect(
      nextWarmupLifecycle({
        current: 'completed',
        event: 'present',
        incomingPhase: 'warmup',
      }),
    ).toBe('completed')
  })
})

describe('D. Stale previous-turn callback cannot overwrite current question', () => {
  it('older turnIndex is ignore_stale once a newer turn is active', () => {
    markTurnPresented(INT, 1)
    setActiveTurnIndex(INT, 2)
    markTurnPresented(INT, 2)

    expect(
      decideTurnApply({
        interviewId: INT,
        incomingTurnIndex: 1,
        incomingPhase: 'core',
        componentActiveTurnIndex: 2,
      }),
    ).toBe('ignore_stale')
  })

  it('callback from generation N is ignored after generation N+1', () => {
    setActiveTurnIndex(INT, 2)
    expect(
      isLiveTurnCallback({
        interviewId: INT,
        callbackTurnIndex: 1,
        callbackGeneration: 4,
        activeGeneration: 5,
      }),
    ).toBe(false)
    expect(
      isLiveTurnCallback({
        interviewId: INT,
        callbackTurnIndex: 2,
        callbackGeneration: 5,
        activeGeneration: 5,
      }),
    ).toBe(true)
  })

  it('delayed fetch callback from an aborted generation is stale', () => {
    expect(
      isStaleFetchCallback({ callbackFetchGeneration: 3, activeFetchGeneration: 4 }),
    ).toBe(true)
    expect(
      isStaleFetchCallback({ callbackFetchGeneration: 4, activeFetchGeneration: 4 }),
    ).toBe(false)
  })
})

describe('E. UI question and active spoken question use same turn identity', () => {
  it('uiTtsShareIdentity requires matching turnIndex', () => {
    expect(uiTtsShareIdentity({ uiTurnIndex: 2, spokenTurnIndex: 2 })).toBe(true)
    expect(uiTtsShareIdentity({ uiTurnIndex: 2, spokenTurnIndex: 1 })).toBe(false)
    expect(uiTtsShareIdentity({ uiTurnIndex: null, spokenTurnIndex: 1 })).toBe(false)
  })

  it('applying a different turn requires stopping prior TTS', () => {
    setActiveTurnIndex(INT, 1)
    expect(
      shouldStopPriorTts({ interviewId: INT, incomingTurnIndex: 2, hydrateOnly: false }),
    ).toBe(true)
    expect(
      shouldStopPriorTts({ interviewId: INT, incomingTurnIndex: 1, hydrateOnly: false }),
    ).toBe(false)
    expect(
      shouldStopPriorTts({ interviewId: INT, incomingTurnIndex: 2, hydrateOnly: true }),
    ).toBe(false)
  })

  it('speak is skipped when the active turn is already someone else', () => {
    setActiveTurnIndex(INT, 3)
    expect(decideTurnSpeak({ interviewId: INT, turnIndex: 2, hydrateOnly: false })).toBe(
      'skip_not_active',
    )
  })
})

describe('F/G. Feedback remains bound to the approved answer; stale feedback is not rendered', () => {
  const deadline = {
    turnIndex: 4,
    displayQuestion: 'Tell me about a time you had to deliver something under a tight deadline',
  }
  const indexes = {
    turnIndex: 3,
    displayQuestion: 'How would you add an index to a slow query?',
  }

  it('F: matching bind renders the payload', () => {
    const selected = selectFeedbackForRender({
      payload: { text: 'Quantify the deadline impact.' },
      payloadBind: deadline,
      activeBind: deadline,
    })
    expect(selected).toEqual({
      status: 'ready',
      payload: { text: 'Quantify the deadline impact.' },
    })
    expect(feedbackBindEquals(deadline, { ...deadline })).toBe(true)
  })

  it('G: latest payload for a previous question is empty, not shown on the next question', () => {
    const selected = selectFeedbackForRender({
      payload: { text: 'Talk about database indexes.' },
      payloadBind: indexes,
      activeBind: deadline,
    })
    expect(selected).toEqual({ status: 'empty' })
  })

  it('missing identity prefers empty over stale latest object', () => {
    expect(
      selectFeedbackForRender({
        payload: { text: 'Talk about database indexes.' },
        payloadBind: indexes,
        activeBind: null,
      }),
    ).toEqual({ status: 'empty' })
  })

  it('feedback(X) + visible question(Y) is rejected', () => {
    expect(
      canShowFeedbackWithVisibleQuestion({
        feedbackTurnIndex: 3,
        visibleQuestionTurnIndex: 4,
        reviewOpen: true,
        reviewStep: 'feedback',
      }),
    ).toBe(false)
    expect(
      canShowFeedbackWithVisibleQuestion({
        feedbackTurnIndex: 3,
        visibleQuestionTurnIndex: 3,
        reviewOpen: true,
        reviewStep: 'feedback',
      }),
    ).toBe(true)
  })

  it('Continue clears feedback before applying the next turn', () => {
    expect(decideContinueActivation()).toBe('clear_feedback_then_apply')
  })
})

describe('warmup lifecycle', () => {
  it('idle → presenting → waiting_for_answer → completed on phase exit', () => {
    expect(getWarmupLifecycle(INT)).toBe('idle')
    expect(applyWarmupEvent(INT, 'present', 'warmup')).toBe('presenting')
    expect(applyWarmupEvent(INT, 'waiting_for_answer', 'warmup')).toBe('waiting_for_answer')
    expect(applyWarmupEvent(INT, 'answer_submitted', 'warmup')).toBe('waiting_for_answer')
    expect(applyWarmupEvent(INT, 'exit_to_non_warmup', 'core')).toBe('completed')
    expect(hasTurnBeenPresented(INT, 1)).toBe(false)
    expect(getActiveTurnIndex(INT)).toBeNull()
  })
})

describe('candidate-answering progression contract', () => {
  const question = {
    is_question: true,
    display_question: 'Why might one O(n log n) sort still be faster in practice?',
    speech: 'Why might one O(n log n) sort still be faster in practice?',
  }
  const ack = {
    is_question: false,
    display_question: null,
    speech: "Thanks. Let's keep going.",
  }

  it('non-question cannot enter answering', () => {
    expect(turnHasAuthoritativeQuestion(ack)).toBe(false)
    expect(canEnterCandidateAnswering(ack)).toBe(false)
    expect(canEnterCandidateAnswering(null)).toBe(false)
  })

  it('is_question:false still auto-advances under the existing ceiling', () => {
    expect(decideNonQuestionProgression(1)).toBe('auto_advance')
    expect(decideNonQuestionProgression(2)).toBe('auto_advance')
    expect(decideNonQuestionProgression(MAX_CONSECUTIVE_NON_QUESTION_TURNS)).toBe(
      'auto_advance',
    )
  })

  it('consecutive acknowledgements never imply answering with an empty question', () => {
    for (let n = 1; n <= MAX_CONSECUTIVE_NON_QUESTION_TURNS + 2; n++) {
      expect(canEnterCandidateAnswering(ack)).toBe(false)
      expect(turnHasAuthoritativeQuestion(ack)).toBe(false)
    }
  })

  it('authoritative question after acknowledgements is answerable', () => {
    expect(decideNonQuestionProgression(1)).toBe('auto_advance')
    expect(decideNonQuestionProgression(2)).toBe('auto_advance')
    expect(canEnterCandidateAnswering(question)).toBe(true)
    expect(turnHasAuthoritativeQuestion(question)).toBe(true)
  })

  it('ceiling recovers instead of entering answering or looping', () => {
    expect(
      decideNonQuestionProgression(MAX_CONSECUTIVE_NON_QUESTION_TURNS + 1),
    ).toBe('recover')
    expect(canEnterCandidateAnswering(ack)).toBe(false)
  })

  it('stale older turn cannot restore an obsolete question once a newer turn is active', () => {
    markTurnPresented(INT, 5)
    setActiveTurnIndex(INT, 6)
    markTurnPresented(INT, 6)
    expect(
      decideTurnApply({
        interviewId: INT,
        incomingTurnIndex: 5,
        incomingPhase: 'core',
        componentActiveTurnIndex: 6,
      }),
    ).toBe('ignore_stale')
  })

  it('H/T Adaptive OFF: cannedMoveOn / ack is not answerable; next core is', () => {
    const moveOn = {
      is_question: false,
      display_question: null as string | null,
      speech: "Thanks. Let's keep going.",
    }
    const nextCore = {
      is_question: true,
      display_question: question.display_question,
      speech: question.speech,
    }
    expect(canEnterCandidateAnswering(moveOn)).toBe(false)
    expect(decideNonQuestionProgression(1)).toBe('auto_advance')
    expect(canEnterCandidateAnswering(nextCore)).toBe(true)
  })

  it('is_question:true with empty text is not answerable', () => {
    expect(
      canEnterCandidateAnswering({
        is_question: true,
        display_question: '   ',
        speech: '',
      }),
    ).toBe(false)
  })

  it('SCRIPT_M canned next core remains answerable (server still owns the question)', () => {
    const turn = cannedScriptMNextCoreTurn('behavioral', [
      'What is the difference between stack memory and heap memory?',
    ])
    expect(turn).not.toBeNull()
    expect(turn!.is_question).toBe(true)
    expect(canEnterCandidateAnswering(turn!)).toBe(true)
  })
})

describe('ack TTS vs AUTO_ADVANCE_MS one-shot', () => {
  const nextCore = {
    is_question: true,
    display_question: 'Why might one O(n log n) sort still be faster in practice?',
    speech: 'Why might one O(n log n) sort still be faster in practice?',
  }
  const nextAck = {
    is_question: false,
    display_question: null as string | null,
    speech: "Thanks. Let's keep going.",
  }

  function applyAckSignals(
    signals: Array<{ signal: 'tts_complete' | 'tts_failed' | 'timer'; live: boolean }>,
  ) {
    let claimed = false
    const applied: Array<'tts_complete' | 'tts_failed' | 'timer'> = []
    for (const step of signals) {
      const decision = decideAckAdvance({
        alreadyClaimed: claimed,
        live: step.live,
        signal: step.signal,
      })
      if (decision === 'advance') {
        claimed = true
        applied.push(step.signal)
      }
    }
    return { applied, claimed }
  }

  it('TTS complete applies the next authoritative question once', () => {
    const { applied } = applyAckSignals([
      { signal: 'tts_complete', live: true },
      { signal: 'timer', live: true },
    ])
    expect(applied).toEqual(['tts_complete'])
    expect(canEnterCandidateAnswering(nextCore)).toBe(true)
  })

  it('TTS failure still auto-advances; next core is answerable', () => {
    const { applied } = applyAckSignals([{ signal: 'tts_failed', live: true }])
    expect(applied).toEqual(['tts_failed'])
    expect(canEnterCandidateAnswering(nextCore)).toBe(true)
  })

  it('hung TTS: timer applies the prefetched authoritative turn', () => {
    const { applied } = applyAckSignals([{ signal: 'timer', live: true }])
    expect(applied).toEqual(['timer'])
    expect(canEnterCandidateAnswering(nextCore)).toBe(true)
  })

  it('TTS complete ≈ timer race applies the next turn exactly once', () => {
    const completeFirst = applyAckSignals([
      { signal: 'tts_complete', live: true },
      { signal: 'timer', live: true },
    ])
    const timerFirst = applyAckSignals([
      { signal: 'timer', live: true },
      { signal: 'tts_complete', live: true },
      { signal: 'tts_failed', live: true },
    ])
    expect(completeFirst.applied).toEqual(['tts_complete'])
    expect(timerFirst.applied).toEqual(['timer'])
  })

  it('next turn still a non-question stays in progression, never answering', () => {
    const { applied } = applyAckSignals([{ signal: 'timer', live: true }])
    expect(applied).toHaveLength(1)
    expect(canEnterCandidateAnswering(nextAck)).toBe(false)
    expect(decideNonQuestionProgression(2)).toBe('auto_advance')
  })

  it('fourth consecutive non-question recovers instead of answering', () => {
    expect(
      decideNonQuestionProgression(MAX_CONSECUTIVE_NON_QUESTION_TURNS + 1),
    ).toBe('recover')
    expect(canEnterCandidateAnswering(nextAck)).toBe(false)
  })

  it('stale TTS callback cannot apply an obsolete next turn', () => {
    const { applied } = applyAckSignals([
      { signal: 'tts_complete', live: false },
      { signal: 'timer', live: false },
    ])
    expect(applied).toEqual([])
    setActiveTurnIndex(INT, 8)
    expect(
      decideTurnApply({
        interviewId: INT,
        incomingTurnIndex: 7,
        incomingPhase: 'core',
        componentActiveTurnIndex: 8,
      }),
    ).toBe('ignore_stale')
  })

  it('SCRIPT_M cannedMoveOn then canned behavioral core remains answerable', () => {
    expect(canEnterCandidateAnswering(nextAck)).toBe(false)
    const behavioral = cannedScriptMNextCoreTurn('behavioral', [
      'What is the difference between stack memory and heap memory?',
    ])
    expect(behavioral).not.toBeNull()
    expect(canEnterCandidateAnswering(behavioral!)).toBe(true)
    const technical = cannedScriptMNextCoreTurn('technical', [
      behavioral!.display_question ?? '',
    ])
    expect(technical).not.toBeNull()
    expect(canEnterCandidateAnswering(technical!)).toBe(true)
  })
})
