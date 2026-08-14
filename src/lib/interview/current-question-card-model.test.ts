import { describe, expect, it } from 'vitest'
import {
  buildCurrentQuestionCardModel,
  normalizeTipText,
} from './current-question-card-model'

describe('H. Question + Tip render as one card', () => {
  it('returns question and tip together (single card model, not a sibling tip card)', () => {
    const model = buildCurrentQuestionCardModel({
      is_question: true,
      display_question: 'Tell me about a time you had to deliver under a tight deadline.',
      speech: 'Tell me about a time you had to deliver under a tight deadline.',
      tip: 'Show how you handled ambiguity — what you prioritized and decided.',
    })
    expect(model).toEqual({
      question: 'Tell me about a time you had to deliver under a tight deadline.',
      tip: 'Show how you handled ambiguity — what you prioritized and decided.',
    })
  })

  it('omits tip when absent; still one question card', () => {
    const model = buildCurrentQuestionCardModel({
      is_question: true,
      display_question: 'Walk me through your approach.',
      speech: 'Walk me through your approach.',
      tip: null,
    })
    expect(model).toEqual({
      question: 'Walk me through your approach.',
      tip: null,
    })
  })

  it('falls back to speech when display_question is null', () => {
    const model = buildCurrentQuestionCardModel({
      is_question: true,
      display_question: null,
      speech: 'Welcome back, how are you doing today?',
      tip: null,
    })
    expect(model?.question).toBe('Welcome back, how are you doing today?')
  })

  it('does not build a card for non-question / auto turns', () => {
    expect(
      buildCurrentQuestionCardModel({
        is_question: false,
        speech: 'Thanks, let’s move on.',
        tip: 'Should not show',
      }),
    ).toBeNull()
  })

  it('strips a leading Tip: prefix so the card does not render Tip · Tip:', () => {
    expect(normalizeTipText('Tip: Explain caching')).toBe('Explain caching')
    expect(normalizeTipText('tip: Explain caching')).toBe('Explain caching')
    expect(normalizeTipText('Tip — Explain caching')).toBe('Explain caching')
    expect(normalizeTipText('Explain caching')).toBe('Explain caching')
    expect(
      buildCurrentQuestionCardModel({
        is_question: true,
        display_question: 'How does caching work?',
        speech: 'How does caching work?',
        tip: 'Tip: Explain caching',
      })?.tip,
    ).toBe('Explain caching')
  })

  it('follow-up uses display_question as the card question', () => {
    const model = buildCurrentQuestionCardModel({
      is_question: true,
      display_question:
        'What did you personally do in that disagreement, and what changed afterward?',
      speech:
        'I hear the team friction. What did you personally do in that disagreement, and what changed afterward?',
      tip: 'Name YOUR action.',
    })
    expect(model?.question).toBe(
      'What did you personally do in that disagreement, and what changed afterward?',
    )
  })
})
