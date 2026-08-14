import { describe, expect, it } from 'vitest'
import {
  cannedScriptMNextCoreTurn,
  nextScriptMCoreQuestionType,
  repeatsAlreadyAskedQuestion,
  scriptMFollowUpCanBecomeNextCore,
} from './script-m-progression'

const STACK_PARENT =
  'What is the difference between stack memory and heap memory? Give an example of when each is used and what happens when either is exhausted.'
const STACK_FU =
  'Can you explain the main differences between stack memory and heap memory in terms of their structure and typical usage?'
const GRAPHQL_FU =
  'What trade-off would you consider before choosing GraphQL over REST in a production application?'
const DEADLINE_Q =
  "Tell me about a time you had to deliver something under a tight deadline when you didn't have all the information you needed. What did you do and what was the outcome?"

describe('nextScriptMCoreQuestionType', () => {
  it('starts technical when last is null', () => {
    expect(nextScriptMCoreQuestionType(null)).toBe('technical')
    expect(nextScriptMCoreQuestionType(undefined)).toBe('technical')
  })

  it('alternates technical → behavioral → technical', () => {
    expect(nextScriptMCoreQuestionType('technical')).toBe('behavioral')
    expect(nextScriptMCoreQuestionType('behavioral')).toBe('technical')
  })
})

describe('scriptMFollowUpCanBecomeNextCore', () => {
  it('rejects parent / FU1 / FU2 exact repeats', () => {
    const asked = [STACK_PARENT, STACK_FU, GRAPHQL_FU]
    expect(
      scriptMFollowUpCanBecomeNextCore({
        questionText: STACK_PARENT,
        modelQuestionType: 'behavioral',
        nextType: 'behavioral',
        alreadyAsked: asked,
      }),
    ).toBe(false)
    expect(
      scriptMFollowUpCanBecomeNextCore({
        questionText: STACK_FU,
        modelQuestionType: 'technical',
        nextType: 'behavioral',
        alreadyAsked: asked,
      }),
    ).toBe(false)
    expect(
      scriptMFollowUpCanBecomeNextCore({
        questionText: GRAPHQL_FU,
        modelQuestionType: 'technical',
        nextType: 'behavioral',
        alreadyAsked: asked,
      }),
    ).toBe(false)
  })

  it('rejects a technical FU when the next core must be behavioral', () => {
    expect(
      scriptMFollowUpCanBecomeNextCore({
        questionText: STACK_FU,
        modelQuestionType: 'technical',
        nextType: 'behavioral',
        alreadyAsked: [STACK_PARENT],
      }),
    ).toBe(false)
  })

  it('allows a new behavioral question when next core must be behavioral', () => {
    expect(
      scriptMFollowUpCanBecomeNextCore({
        questionText: DEADLINE_Q,
        modelQuestionType: 'behavioral',
        nextType: 'behavioral',
        alreadyAsked: [STACK_PARENT, STACK_FU],
      }),
    ).toBe(true)
  })
})

describe('cannedScriptMNextCoreTurn', () => {
  it('after a technical parent, emits a new behavioral core not equal to parent/FU', () => {
    const asked = [STACK_PARENT, STACK_FU, GRAPHQL_FU]
    const turn = cannedScriptMNextCoreTurn('behavioral', asked)
    expect(turn.is_follow_up).toBe(false)
    expect(turn.is_question).toBe(true)
    expect(turn.phase).toBe('core')
    expect(turn.question_type).toBe('behavioral')
    expect(turn.display_question).toBeTruthy()
    expect(repeatsAlreadyAskedQuestion(turn.display_question!, asked)).toBe(false)
    expect(turn.speech).toContain(turn.display_question!)
  })

  it('after a behavioral parent, emits a new technical core', () => {
    const asked = [DEADLINE_Q]
    const turn = cannedScriptMNextCoreTurn('technical', asked)
    expect(turn.question_type).toBe('technical')
    expect(turn.is_follow_up).toBe(false)
    expect(repeatsAlreadyAskedQuestion(turn.display_question!, asked)).toBe(false)
  })
})
