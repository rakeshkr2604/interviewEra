import { afterEach, describe, expect, it } from 'vitest'
import { getOpenRouterModelForOperation } from '@/lib/ai/openrouter-model-router'

describe('getOpenRouterModelForOperation — answer_score', () => {
  const prevScore = process.env.OPENROUTER_SCORE_MODEL
  const prevQg = process.env.OPENROUTER_QUESTION_GEN_MODEL
  const prevCheap = process.env.OPENROUTER_CHEAP_MODEL
  const prevAuto = process.env.OPENROUTER_AUTO_STRUCTURE_MODEL

  afterEach(() => {
    if (prevScore === undefined) delete process.env.OPENROUTER_SCORE_MODEL
    else process.env.OPENROUTER_SCORE_MODEL = prevScore
    if (prevQg === undefined) delete process.env.OPENROUTER_QUESTION_GEN_MODEL
    else process.env.OPENROUTER_QUESTION_GEN_MODEL = prevQg
    if (prevCheap === undefined) delete process.env.OPENROUTER_CHEAP_MODEL
    else process.env.OPENROUTER_CHEAP_MODEL = prevCheap
    if (prevAuto === undefined) delete process.env.OPENROUTER_AUTO_STRUCTURE_MODEL
    else process.env.OPENROUTER_AUTO_STRUCTURE_MODEL = prevAuto
  })

  it('routes answer_score to gemini flash by default (latency path)', () => {
    delete process.env.OPENROUTER_SCORE_MODEL
    delete process.env.OPENROUTER_QUESTION_GEN_MODEL
    expect(getOpenRouterModelForOperation('answer_score')).toBe('google/gemini-2.5-flash')
  })

  it('honors OPENROUTER_SCORE_MODEL override', () => {
    process.env.OPENROUTER_SCORE_MODEL = 'openai/gpt-4.1-mini'
    expect(getOpenRouterModelForOperation('answer_score')).toBe('openai/gpt-4.1-mini')
  })

  it('routes auto_structure to gemini flash by default (latency path)', () => {
    delete process.env.OPENROUTER_AUTO_STRUCTURE_MODEL
    delete process.env.OPENROUTER_QUESTION_GEN_MODEL
    expect(getOpenRouterModelForOperation('auto_structure')).toBe('google/gemini-2.5-flash')
  })

  it('honors OPENROUTER_AUTO_STRUCTURE_MODEL override', () => {
    process.env.OPENROUTER_AUTO_STRUCTURE_MODEL = 'openai/gpt-4.1-mini'
    expect(getOpenRouterModelForOperation('auto_structure')).toBe('openai/gpt-4.1-mini')
  })
})
