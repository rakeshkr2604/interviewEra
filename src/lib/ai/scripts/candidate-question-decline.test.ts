import { describe, expect, it } from 'vitest'
import {
  isNoQuestionsAnswer,
  shouldForceClosingBeforeLlm,
  shouldShowCandidateQuestionGuidance,
} from './turn-authority'

/**
 * Regression: a spoken decline puts the refusal and the reason in one
 * utterance. The original whole-string alternation only matched a bare "no",
 * so the most common phrasing fell through to the LLM and the interview
 * skipped guidance entirely.
 */
describe('candidate-question decline detection', () => {
  const declines = [
    'no i dont have any question right now',
    "No, I don't have any questions right now.",
    "No, I don't have any questions.",
    'no i dont have any questions',
    'No thanks.',
    'no thank you',
    'No questions from my side.',
    'no questions right now',
    "I'm good, thanks.",
    'Nothing from my side.',
    'nothing right now',
    'No, nothing right now.',
    "no i'm good",
    'None.',
    "That's all.",
    'no, all good',
    'I have no questions.',
    "no i don't have anything to ask",
    'not really',
    "no, let's finish",
    '[SKIPPED]',
    '[TIMEOUT]',
    '   ',
  ]

  it.each(declines)('treats %j as a decline', (answer) => {
    expect(isNoQuestionsAnswer(answer)).toBe(true)
  })

  const realQuestions = [
    'What kind of projects does the team work on?',
    'What about the backend?',
    'How is the engineering team structured?',
    'no wait, what is the tech stack?',
    'None of the projects use React, can you tell me more?',
    'Can you explain what you mean by success?',
    'I have questions about the onboarding process.',
    'Nothing was mentioned about mentorship — how does that work?',
    "I don't have a technical background, does that matter for this role?",
  ]

  it.each(realQuestions)('does not treat %j as a decline', (answer) => {
    expect(isNoQuestionsAnswer(answer)).toBe(false)
  })

  it('routes a natural first decline to guidance, not the LLM or closing', () => {
    const opts = {
      requestPhase: 'candidate_questions',
      lastAnswer: 'no i dont have any question right now',
      candidateQuestionsExchanges: 1,
      candidateQuestionGuidanceTurns: 0,
    }

    expect(shouldShowCandidateQuestionGuidance(opts)).toBe(true)
    expect(
      shouldForceClosingBeforeLlm({ ...opts, lastTurnWasCqAnswer: false }),
    ).toBe(false)
  })

  it('closes on a second decline once guidance has been shown', () => {
    const opts = {
      requestPhase: 'candidate_questions',
      lastAnswer: "No, I don't have any questions right now.",
      candidateQuestionsExchanges: 1,
      candidateQuestionGuidanceTurns: 1,
    }

    expect(shouldShowCandidateQuestionGuidance(opts)).toBe(false)
    expect(
      shouldForceClosingBeforeLlm({ ...opts, lastTurnWasCqAnswer: false }),
    ).toBe(true)
  })
})
