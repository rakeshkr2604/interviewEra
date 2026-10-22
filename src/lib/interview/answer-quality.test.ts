import { describe, expect, it } from 'vitest'
import {
  BANNED_PRAISE_PREFIXES,
  classifyCandidateAnswer,
  countConsecutiveQuestionEchoes,
  isEchoThenAnswer,
  isNearExactQuestionEcho,
  MAX_QUESTION_ECHO_RECOVERIES,
  stripUnjustifiedPraisePrefix,
} from './answer-quality'
import {
  applyTurnAuthorityOverrides,
  cannedQuestionEchoRecoveryTurn,
  probeIsRequired,
} from '@/lib/ai/scripts/turn-authority'
import type { ScriptTurnOutput } from '@/lib/ai/scripts/turn-validator'

const AUTH_Q =
  'What is the difference between authentication and authorization?'

const baseAuthority = {
  coreQuestionsAsked: 1,
  totalQuestions: 5,
  followUpsThisQuestion: 0,
  followUpEnabled: true,
  candidateQuestionsExchanges: 0,
  requestPhase: 'core',
  lastAnswer: AUTH_Q,
  hasValidParentCoreQuestion: true,
  parentQuestion: AUTH_Q,
  alreadyAskedQuestions: [AUTH_Q],
  scriptType: 'SCRIPT_T' as const,
}

function coreTurn(overrides: Partial<ScriptTurnOutput> = {}): ScriptTurnOutput {
  return {
    speech: 'Great answer! Next question.',
    display_question: 'How would you design a rate limiter?',
    tip: null,
    timer_seconds: 180,
    reading_buffer_seconds: 4,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: true,
    phase: 'core',
    is_question: true,
    is_follow_up: false,
    question_difficulty: 'medium',
    interviewer_emotion: 'neutral',
    ...overrides,
  }
}

describe('classifyCandidateAnswer', () => {
  it('detects exact question repetition', () => {
    const r = classifyCandidateAnswer({ answer: AUTH_Q, question: AUTH_Q })
    expect(r.kind).toBe('question_echo')
    expect(r.nonSubstantive).toBe(true)
    expect(r.needsRecovery).toBe(true)
  })

  it('detects case and punctuation variations', () => {
    const r = classifyCandidateAnswer({
      answer: 'what is the difference between authentication and authorization',
      question: AUTH_Q,
    })
    expect(r.kind).toBe('question_echo')
  })

  it('detects near-exact repetition with filler', () => {
    expect(isNearExactQuestionEcho(`${AUTH_Q} hmm`, AUTH_Q)).toBe(true)
    const r = classifyCandidateAnswer({
      answer: `So the question is ${AUTH_Q}`,
      question: AUTH_Q,
    })
    expect(r.kind).toBe('question_echo')
  })

  it('treats echo-then-answer as substantive', () => {
    const answer = `${AUTH_Q} Authentication verifies identity, authorization decides access.`
    expect(isEchoThenAnswer(answer, AUTH_Q)).toBe(true)
    const r = classifyCandidateAnswer({ answer, question: AUTH_Q })
    expect(r.kind).toBe('echo_then_answer')
    expect(r.nonSubstantive).toBe(false)
  })

  it('keeps a correct answer that uses question terminology as substantive', () => {
    const r = classifyCandidateAnswer({
      answer:
        'Authentication verifies who the user is, whereas authorization determines what that user can access.',
      question: AUTH_Q,
    })
    expect(r.kind).toBe('substantive')
    expect(r.nonSubstantive).toBe(false)
  })

  it('detects explicit uncertainty', () => {
    const r = classifyCandidateAnswer({
      answer: "I don't know",
      question: AUTH_Q,
    })
    expect(r.kind).toBe('explicit_uncertainty')
    expect(r.nonSubstantive).toBe(true)
  })

  it('treats partial answer with uncertainty as uncertainty with attempt', () => {
    const r = classifyCandidateAnswer({
      answer:
        "I think the question is about authentication, but I don't know the exact difference between the two concepts in practice.",
      question: AUTH_Q,
    })
    expect(r.kind).toBe('explicit_uncertainty')
    expect(r.reason).toBe('uncertainty_with_attempt')
    expect(r.nonSubstantive).toBe(false)
  })

  it('treats mixed uncertainty plus a real attempt as non-empty attempt', () => {
    const r = classifyCandidateAnswer({
      answer: "I don't know, but authentication verifies identity",
      question: AUTH_Q,
    })
    expect(r.kind).toBe('explicit_uncertainty')
    expect(r.nonSubstantive).toBe(false)
    expect(r.needsRecovery).toBe(false)
  })

  it('flags high-precision irrelevant answers', () => {
    const r = classifyCandidateAnswer({
      answer: 'I built a college website using React last semester.',
      question: AUTH_Q,
    })
    expect(r.kind).toBe('irrelevant')
    expect(r.needsRecovery).toBe(true)
  })

  it('flags an obviously irrelevant movie answer to a TypeScript question', () => {
    const r = classifyCandidateAnswer({
      answer: 'My favorite movie is about space exploration.',
      question:
        'In InterviewEra, what trade-off did you make around TypeScript, and what would you change if you rebuilt that part?',
    })
    expect(r.kind).toBe('irrelevant')
    expect(r.nonSubstantive).toBe(true)
    expect(r.needsRecovery).toBe(true)
  })

  it('flags an obviously irrelevant movie answer to a Python question', () => {
    const r = classifyCandidateAnswer({
      answer: 'My favorite movie is about space exploration.',
      question:
        'How would you design the data flow for a Software Engineer feature that uses Python? What would you measure to know it worked?',
    })
    expect(r.kind).toBe('irrelevant')
    expect(r.needsRecovery).toBe(true)
  })

  it('keeps a correct TypeScript answer as substantive', () => {
    const r = classifyCandidateAnswer({
      answer:
        'I used TypeScript gradual typing with strict null checks for safer refactors, accepting slower compile times during onboarding.',
      question:
        'In InterviewEra, what trade-off did you make around TypeScript, and what would you change if you rebuilt that part?',
    })
    expect(r.kind).toBe('substantive')
    expect(r.nonSubstantive).toBe(false)
  })

  it('keeps a correct Python data-flow answer as substantive', () => {
    const r = classifyCandidateAnswer({
      answer:
        'I would measure p95 latency, add caching at the read path, and use pagination with keyset cursors to keep query cost predictable as the dataset grows.',
      question:
        'How would you design the data flow for a Software Engineer feature that uses Python? What would you measure to know it worked?',
    })
    expect(r.kind).toBe('substantive')
  })

  it('treats a technically correct but off-topic REST answer to a Python data-flow question as irrelevant', () => {
    const r = classifyCandidateAnswer({
      answer:
        'In a REST API I would use idempotent PUT semantics, return proper HTTP status codes, validate input with a schema, and isolate side effects behind transactional boundaries to keep the system consistent under retries.',
      question:
        'How would you design the data flow for a Software Engineer feature that uses Python? What would you measure to know it worked?',
    })
    expect(r.kind).toBe('irrelevant')
    expect(r.reason).toBe('off_topic_or_domain_mismatch')
    expect(r.needsRecovery).toBe(true)
  })

  it('keeps mixed uncertainty plus authentication attempt as explicit_uncertainty with attempt', () => {
    const r = classifyCandidateAnswer({
      answer:
        "I don't know, but authentication verifies identity and authorization determines access.",
      question: AUTH_Q,
    })
    expect(r.kind).toBe('explicit_uncertainty')
    expect(r.nonSubstantive).toBe(false)
    expect(r.needsRecovery).toBe(false)
  })

  it('keeps a valid technical answer that uses unfamiliar terminology as substantive', () => {
    const r = classifyCandidateAnswer({
      answer:
        'I relied on structural subtyping and declaration merging for library authoring, accepting slower incremental builds for stronger editor fidelity.',
      question:
        'In InterviewEra, what trade-off did you make around TypeScript, and what would you change if you rebuilt that part?',
    })
    expect(r.kind).toBe('substantive')
    expect(r.nonSubstantive).toBe(false)
  })

  it('keeps a valid short answer as substantive', () => {
    const r = classifyCandidateAnswer({
      answer: 'OAuth tokens and role-based access control.',
      question: AUTH_Q,
    })
    expect(r.kind).toBe('substantive')
  })

  it('classifies empty transcript without inventing a poor score signal', () => {
    const r = classifyCandidateAnswer({ answer: '', question: AUTH_Q })
    expect(r.kind).toBe('empty')
    expect(r.needsRecovery).toBe(false)
  })

  it('tolerates common STT whitespace/punctuation artifacts on echoes', () => {
    const r = classifyCandidateAnswer({
      answer: '  What is the difference between authentication and authorization ?? ',
      question: AUTH_Q,
    })
    expect(r.kind).toBe('question_echo')
  })

  it('detects clarification requests', () => {
    const r = classifyCandidateAnswer({
      answer: 'Could you please repeat the question?',
      question: AUTH_Q,
    })
    expect(r.kind).toBe('clarification_request')
    expect(r.needsRecovery).toBe(true)
  })

  it('detects skip requests', () => {
    const r = classifyCandidateAnswer({
      answer: 'Can I skip this question?',
      question: AUTH_Q,
    })
    expect(r.kind).toBe('skip_request')
  })

  it('treats incomplete cut-off speech as incomplete, not incorrect', () => {
    const r = classifyCandidateAnswer({
      answer: 'Authentication is about and',
      question: AUTH_Q,
    })
    expect(r.kind).toBe('incomplete')
  })
})

describe('stripUnjustifiedPraisePrefix', () => {
  it('strips banned praise prefixes', () => {
    for (const phrase of ['Great answer!', 'Excellent!', "I love that approach!"]) {
      expect(
        stripUnjustifiedPraisePrefix(`${phrase} How would you scale that?`).startsWith(
          'How would',
        ),
      ).toBe(true)
    }
  })

  it('leaves neutral bridges alone', () => {
    expect(stripUnjustifiedPraisePrefix('Understood. What next?')).toBe(
      'Understood. What next?',
    )
  })

  it('strips praise that appears after the first sentence', () => {
    const cleaned = stripUnjustifiedPraisePrefix(
      'Okay, noted. Great answer! How would you decide which columns to index?',
    )
    expect(cleaned.toLowerCase()).not.toContain('great answer')
    expect(cleaned).toContain('How would you decide which columns to index?')
    expect(cleaned.startsWith('Okay, noted.')).toBe(true)
  })

  it('covers the documented banned list', () => {
    expect(BANNED_PRAISE_PREFIXES.length).toBeGreaterThan(5)
  })
})

describe('question-echo recovery authority', () => {
  it('replaces model output with a recovery that restates the parent', () => {
    const quality = classifyCandidateAnswer({ answer: AUTH_Q, question: AUTH_Q })
    const result = applyTurnAuthorityOverrides({
      ...baseAuthority,
      turn: coreTurn({
        speech: 'Great answer! Let’s dig into scaling next.',
        display_question: 'How would you scale a rate limiter?',
        is_follow_up: false,
      }),
      answerQuality: quality,
      consecutiveQuestionEchoes: 1,
      answerProbeNeeded: true,
    })
    expect(result.is_follow_up).toBe(true)
    expect(result.is_question).toBe(true)
    expect(result.display_question).toBe(AUTH_Q)
    expect(result.speech.endsWith(AUTH_Q)).toBe(true)
    expect(result.speech.toLowerCase()).toContain('repeated the question')
    expect(result.speech.toLowerCase()).not.toMatch(/great answer|excellent/)
    expect(result.speech).not.toMatch(/model answer|correct answer is/i)
  })

  it('does not force a content probe when the answer is an echo', () => {
    expect(
      probeIsRequired({
        requestPhase: 'core',
        followUpEnabled: true,
        followUpsThisQuestion: 0,
        hasValidParentCoreQuestion: true,
        answerProbeNeeded: true,
        lastAnswer: AUTH_Q,
        answerQuality: classifyCandidateAnswer({ answer: AUTH_Q, question: AUTH_Q }),
      }),
    ).toBe(false)
  })

  it('moves on after consecutive echoes instead of looping forever', () => {
    const quality = classifyCandidateAnswer({ answer: AUTH_Q, question: AUTH_Q })
    const result = applyTurnAuthorityOverrides({
      ...baseAuthority,
      turn: coreTurn({ is_follow_up: true, display_question: AUTH_Q, speech: AUTH_Q }),
      answerQuality: quality,
      consecutiveQuestionEchoes: MAX_QUESTION_ECHO_RECOVERIES,
      answerProbeNeeded: true,
    })
    expect(result.display_question).not.toBe(AUTH_Q)
    expect(result.is_follow_up).toBe(false)
    expect(result.phase).toBe('core')
  })

  it('strips unjustified praise from ordinary turns', () => {
    const result = applyTurnAuthorityOverrides({
      ...baseAuthority,
      lastAnswer: 'Indexes speed up reads but slow writes.',
      turn: coreTurn({
        speech: 'Great answer! How would you decide which columns to index?',
        display_question: 'How would you decide which columns to index?',
        is_follow_up: true,
      }),
      answerQuality: classifyCandidateAnswer({
        answer: 'Indexes speed up reads but slow writes.',
        question: AUTH_Q,
      }),
      answerProbeNeeded: true,
    })
    expect(result.speech.toLowerCase().startsWith('great answer')).toBe(false)
    expect(result.speech.endsWith(result.display_question!)).toBe(true)
  })

  it('canned recovery speech ends with exact display_question', () => {
    const canned = cannedQuestionEchoRecoveryTurn(AUTH_Q)
    expect(canned.speech.endsWith(AUTH_Q)).toBe(true)
    expect(canned.is_follow_up).toBe(true)
  })

  it('counts consecutive echoes on the same ask', () => {
    const count = countConsecutiveQuestionEchoes({
      turns: [
        {
          turn_index: 3,
          is_question: true,
          phase: 'core',
          llm_output: { display_question: AUTH_Q, is_follow_up: false },
          answer_text: AUTH_Q,
        },
      ],
      currentQuestion: AUTH_Q,
      currentAnswer: AUTH_Q,
    })
    expect(count).toBe(2)
  })

  it('respects the follow-up cap instead of issuing another recovery', () => {
    const quality = classifyCandidateAnswer({ answer: AUTH_Q, question: AUTH_Q })
    const result = applyTurnAuthorityOverrides({
      ...baseAuthority,
      followUpsThisQuestion: 2,
      consecutiveQuestionEchoes: 1,
      answerQuality: quality,
      turn: coreTurn({
        speech: 'Great answer!',
        display_question: AUTH_Q,
        is_follow_up: true,
      }),
      answerProbeNeeded: true,
    })
    expect(result.is_follow_up).toBe(false)
    expect(result.display_question).not.toBe(AUTH_Q)
    expect(result.speech.toLowerCase()).not.toContain('repeated the question')
  })

  it('recovery speech does not reveal a model answer', () => {
    const canned = cannedQuestionEchoRecoveryTurn(AUTH_Q)
    expect(canned.speech).not.toMatch(
      /correct answer|model answer|the difference is that authentication/i,
    )
    expect(canned.speech.endsWith(AUTH_Q)).toBe(true)
  })

  it('does not treat skip/timeout as echo recovery', () => {
    for (const special of ['[SKIPPED]', '[TIMEOUT]', '[NONE]'] as const) {
      const quality = classifyCandidateAnswer({
        answer: special,
        question: AUTH_Q,
      })
      expect(quality.kind).toBe('empty')
      expect(
        probeIsRequired({
          requestPhase: 'core',
          followUpEnabled: true,
          followUpsThisQuestion: 0,
          hasValidParentCoreQuestion: true,
          answerProbeNeeded: true,
          lastAnswer: special,
          answerQuality: quality,
        }),
      ).toBe(false)
    }
  })
})

describe('report honesty for echoes', () => {
  it('overrides model summaries that over-credit a repeated question', async () => {
    const { reportSummaryForAnswer, QUESTION_ECHO_REPORT_SUMMARY } = await import(
      './answer-quality'
    )
    const honesty = reportSummaryForAnswer({
      transcript: AUTH_Q,
      question: AUTH_Q,
      modelOneLineSummary: 'Strong grasp of authentication concepts.',
    })
    expect(honesty.kind).toBe('question_echo')
    expect(honesty.oneLineSummary).toBe(QUESTION_ECHO_REPORT_SUMMARY)
    expect(honesty.scoreSuspectHint).toBe(true)
  })

  it('keeps model summary for a substantive terminology-rich answer', async () => {
    const { reportSummaryForAnswer } = await import('./answer-quality')
    const honesty = reportSummaryForAnswer({
      transcript:
        'Authentication verifies who the user is, whereas authorization determines what that user can access.',
      question: AUTH_Q,
      modelOneLineSummary: 'Clear distinction between authn and authz.',
    })
    expect(honesty.kind).toBe('substantive')
    expect(honesty.oneLineSummary).toBe('Clear distinction between authn and authz.')
    expect(honesty.scoreSuspectHint).toBe(false)
  })
})
