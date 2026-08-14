import { describe, expect, it } from 'vitest'
import {
  canonicalizeQuestionSpeech,
  canonicalizeTurnSpeech,
  normalizeSpeechWhitespace,
  speechAlignsWithDisplayQuestion,
  speechCarriesExactDisplayQuestion,
  speechLooksLikeQuestion,
  spokenBridgeBeforeDisplayQuestion,
} from './speech-display-question'
import { validateTurnOutput, TurnValidationError } from './turn-validator'
import {
  cannedCandidateQuestionsTurn,
  cannedClosingTurn,
  cannedCoreEntryTurn,
  cannedMoveOnTurn,
} from './turn-authority'

function questionTurn(overrides: {
  speech: string
  display_question: string | null
  is_question?: boolean
  phase?: 'warmup' | 'self_intro' | 'core' | 'candidate_questions' | 'closing'
  is_follow_up?: boolean
}) {
  return {
    tip: null,
    timer_seconds: overrides.is_question === false ? 0 : 90,
    reading_buffer_seconds: overrides.is_question === false ? 0 : 3,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: overrides.is_question !== false,
    phase: overrides.phase ?? 'core',
    is_question: overrides.is_question ?? true,
    is_follow_up: overrides.is_follow_up ?? false,
    question_difficulty: 'medium' as const,
    interviewer_emotion: 'neutral' as const,
    speech: overrides.speech,
    display_question: overrides.display_question,
  }
}

const INITIATIVE_DISPLAY =
  'Give me a specific example where you identified a problem and took initiative to solve it without being asked. What was the outcome?'

describe('speechAlignsWithDisplayQuestion', () => {
  it('A: speech == display_question → PASS', () => {
    expect(speechAlignsWithDisplayQuestion(INITIATIVE_DISPLAY, INITIATIVE_DISPLAY)).toBe(true)
  })

  it('B: natural paraphrase of display_question → PASS', () => {
    const speech =
      'Can you share a time during your ATS Resume Checker project when you identified a problem and took initiative to solve it without being asked? What was the outcome?'
    expect(speechAlignsWithDisplayQuestion(speech, INITIATIVE_DISPLAY)).toBe(true)
  })

  it('C: conversational prefix + same question → PASS', () => {
    const speech = `I appreciate the honesty there. ${INITIATIVE_DISPLAY}`
    expect(speechAlignsWithDisplayQuestion(speech, INITIATIVE_DISPLAY)).toBe(true)
    expect(speechCarriesExactDisplayQuestion(speech, INITIATIVE_DISPLAY)).toBe(true)
  })

  it('C2: bridge + paraphrase → PASS', () => {
    const speech =
      'I like how you handled that. Can you share a specific example from your ATS Resume Checker project where you took initiative to solve a problem without being asked? What was the outcome?'
    expect(speechAlignsWithDisplayQuestion(speech, INITIATIVE_DISPLAY)).toBe(true)
  })

  it('D: speech asks unrelated question → FAIL', () => {
    const speech =
      'Tell me about a conflict with a teammate on your last project. What was the outcome?'
    expect(speechAlignsWithDisplayQuestion(speech, INITIATIVE_DISPLAY)).toBe(false)
  })

  it('E: speech is not a question / malformed → FAIL', () => {
    expect(
      speechAlignsWithDisplayQuestion(
        'That sounds like a real challenge and I appreciate the honesty.',
        INITIATIVE_DISPLAY,
      ),
    ).toBe(false)
    expect(speechLooksLikeQuestion('That sounds like a real challenge.')).toBe(false)
  })

  it('normalizes whitespace', () => {
    expect(normalizeSpeechWhitespace('  a   b  ')).toBe('a b')
  })

  it('spokenBridgeBeforeDisplayQuestion still works for exact suffix', () => {
    const q =
      'Can you share a time when you handled multiple deadlines or priorities? What was your approach and the result?'
    expect(spokenBridgeBeforeDisplayQuestion(`That's helpful. ${q}`, q)).toBe("That's helpful.")
    expect(spokenBridgeBeforeDisplayQuestion('unrelated paraphrase?', q)).toBeNull()
  })
})

describe('validateTurnOutput schema (no speech-alignment 422)', () => {
  it('A: accepts speech === display_question', () => {
    const turn = validateTurnOutput(
      questionTurn({ speech: INITIATIVE_DISPLAY, display_question: INITIATIVE_DISPLAY }),
      'SCRIPT_H',
    )
    expect(turn.speech).toBe(INITIATIVE_DISPLAY)
  })

  it('does not 422 on paraphrase that requires normalization (H/T/M)', () => {
    const paraphrased = questionTurn({
      speech:
        'Can you walk me through a specific example of a problem you identified during InterviewEra and the initiative you took to solve it? What was the outcome?',
      display_question: INITIATIVE_DISPLAY,
    })
    for (const script of ['SCRIPT_H', 'SCRIPT_T', 'SCRIPT_M'] as const) {
      expect(() => validateTurnOutput(paraphrased, script)).not.toThrow()
    }
  })

  it('does not 422 when speech is only an acknowledgment (normalize later)', () => {
    expect(() =>
      validateTurnOutput(
        questionTurn({
          speech: 'That sounds like a real challenge.',
          display_question: INITIATIVE_DISPLAY,
        }),
        'SCRIPT_H',
      ),
    ).not.toThrow()
  })

  it('still 422s when speech is missing (schema)', () => {
    const raw = questionTurn({ speech: INITIATIVE_DISPLAY, display_question: INITIATIVE_DISPLAY })
    const { speech: _omit, ...rest } = raw as { speech: string } & Record<string, unknown>
    void _omit
    expect(() => validateTurnOutput(rest, 'SCRIPT_H')).toThrow(TurnValidationError)
  })

  it('accepts non-question acknowledgment with display_question null', () => {
    const turn = validateTurnOutput(
      questionTurn({
        speech: 'That sounds like a real challenge.',
        display_question: null,
        is_question: false,
        phase: 'core',
      }),
      'SCRIPT_H',
    )
    expect(turn.is_question).toBe(false)
    expect(turn.display_question).toBeNull()
  })

  it('accepts warmup conversational question with null display_question', () => {
    const turn = validateTurnOutput(
      questionTurn({
        speech: "Hi Rakesh! I'm Meera. Really glad you're here today. How are you doing?",
        display_question: null,
        phase: 'warmup',
        is_question: true,
      }),
      'SCRIPT_H',
    )
    expect(turn.phase).toBe('warmup')
    expect(turn.display_question).toBeNull()
  })

  it('canned move-on turn does not rewrite speech', () => {
    const turn = cannedMoveOnTurn('neutral')
    expect(canonicalizeTurnSpeech(turn).speech).toBe(turn.speech)
    expect(turn.is_question).toBe(false)
    expect(turn.is_follow_up).toBe(false)
  })

  it('canned authority turns still validate', () => {
    const cq = validateTurnOutput(cannedCandidateQuestionsTurn('warm'), 'SCRIPT_H')
    expect(speechAlignsWithDisplayQuestion(cq.speech, cq.display_question!)).toBe(true)
    expect(speechCarriesExactDisplayQuestion(cq.speech, cq.display_question!)).toBe(true)

    const closing = validateTurnOutput(cannedClosingTurn(), 'SCRIPT_H')
    expect(closing.is_question).toBe(false)
    expect(closing.display_question).toBeNull()

    const digIn = validateTurnOutput(cannedCoreEntryTurn(), 'SCRIPT_H')
    expect(digIn.is_question).toBe(false)
    expect(digIn.display_question).toBeNull()
  })
})

describe('canonicalizeQuestionSpeech (shared H/T/M)', () => {
  const restVsGraphql =
    'How does REST API differ from GraphQL? When would you choose one over the other and why?'

  it('SCRIPT_H paraphrase → speech ends with exact display_question', () => {
    const speech =
      'That sounds like a real challenge. Can you walk me through a specific example of a problem you identified during InterviewEra and the initiative you took to solve it? What was the outcome?'
    const out = canonicalizeQuestionSpeech(speech, INITIATIVE_DISPLAY)
    expect(speechCarriesExactDisplayQuestion(out, INITIATIVE_DISPLAY)).toBe(true)
    expect(out.startsWith('That sounds like a real challenge.')).toBe(true)
    expect(out.includes('walk me through a specific example of a problem you identified during InterviewEra')).toBe(
      false,
    )
  })

  it('SCRIPT_T paraphrase → exact suffix', () => {
    const speech =
      'Two sorting algorithms both run in O(n log n) — can one still be faster in practice? Explain why.'
    const display =
      'Two sorting algorithms both have O(n log n) time complexity. Can one still be meaningfully faster than the other in practice? Why or why not?'
    const out = canonicalizeQuestionSpeech(speech, display)
    expect(speechCarriesExactDisplayQuestion(out, display)).toBe(true)
  })

  it('SCRIPT_M behavioral paraphrase → exact suffix', () => {
    const speech =
      "Let's switch direction a bit. Can you share a time you delivered under a tight deadline?"
    const display =
      "Tell me about a time you had to deliver something under a tight deadline when you didn't have all the information you needed. What did you do and what was the outcome?"
    const out = canonicalizeQuestionSpeech(speech, display)
    expect(speechCarriesExactDisplayQuestion(out, display)).toBe(true)
    expect(out.startsWith("Let's switch direction a bit.")).toBe(true)
  })

  it('SCRIPT_M technical paraphrase with bridge → exact suffix', () => {
    const speech = `Good. Let's move to the technical side. Can you explain REST versus GraphQL?`
    const out = canonicalizeQuestionSpeech(speech, restVsGraphql)
    expect(out).toBe(`Good. Let's move to the technical side. ${restVsGraphql}`)
    expect(speechCarriesExactDisplayQuestion(out, restVsGraphql)).toBe(true)
  })

  it('speech already contains display_question → do not duplicate', () => {
    const speech = `Good. Let's move to the technical side. ${restVsGraphql}`
    expect(canonicalizeQuestionSpeech(speech, restVsGraphql)).toBe(speech)
  })

  it('speech is only an acknowledgement → append canonical display_question', () => {
    const out = canonicalizeQuestionSpeech("That's interesting.", INITIATIVE_DISPLAY)
    expect(out).toBe(`That's interesting. ${INITIATIVE_DISPLAY}`)
  })

  it('display_question missing → preserve speech', () => {
    expect(canonicalizeQuestionSpeech('How are you doing?', '')).toBe('How are you doing?')
    const warmup = canonicalizeTurnSpeech(
      questionTurn({
        speech: "Hi Rakesh! I'm Meera. How are you doing?",
        display_question: null,
        phase: 'warmup',
        is_question: true,
      }),
    )
    expect(warmup.speech).toBe("Hi Rakesh! I'm Meera. How are you doing?")
    expect(warmup.display_question).toBeNull()
  })

  it('non-question speech → do not modify', () => {
    const ack = questionTurn({
      speech: 'Got it — especially your campus portal. Let’s dig in.',
      display_question: null,
      is_question: false,
      phase: 'self_intro',
    })
    expect(canonicalizeTurnSpeech(ack).speech).toBe(ack.speech)
  })

  it('follow-up turns use the same canonical speech/display_question invariant', () => {
    const display =
      'What trade-off would you consider before choosing GraphQL over REST in a production application?'
    const out = canonicalizeTurnSpeech(
      questionTurn({
        speech: "That's a useful point. Why GraphQL though?",
        display_question: display,
        is_follow_up: true,
      }),
    )
    expect(out.is_follow_up).toBe(true)
    expect(speechCarriesExactDisplayQuestion(out.speech, display)).toBe(true)
  })
})
