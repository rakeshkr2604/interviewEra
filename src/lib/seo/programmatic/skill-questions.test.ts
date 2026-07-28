import { describe, expect, it } from 'vitest'
import { buildFaqPairs, getSkillQuestionSet, getSkillQuestionsFlat } from './questions'
import { getSkillBySlug } from './slugs'
import { isSkillIndexable } from './indexing'

describe('skill question banks v2', () => {
  const V2_SKILLS = [
    'mysql',
    'typescript',
    'angular',
    'django',
    'machine-learning',
    'google-cloud',
    'postgresql',
    'graphql',
  ] as const

  it.each(V2_SKILLS)('%s has a full question set with context metadata', (slug) => {
    const set = getSkillQuestionSet(slug)
    expect(set?.commonlyAskedAt).toBeTruthy()
    expect(set?.legalDisclaimer).toBeTruthy()
    expect(set?.questions).toHaveLength(10)
  })

  it.each(V2_SKILLS)('%s is indexable and yields FAQ answers', (slug) => {
    const skill = getSkillBySlug(slug)
    expect(skill).toBeTruthy()
    expect(getSkillQuestionsFlat(slug)).toHaveLength(10)
    expect(isSkillIndexable(skill!)).toBe(true)

    const faqPairs = buildFaqPairs(getSkillQuestionsFlat(slug))
    expect(faqPairs).toHaveLength(10)
    expect(faqPairs[0]?.answer.length).toBeGreaterThan(20)
  })

  it('uses spoken answers and strips decorative emoji in skill FAQ schema output', () => {
    const faqPairs = buildFaqPairs(getSkillQuestionsFlat('typescript'))

    expect(faqPairs[0]).toEqual({
      question: 'What is TypeScript, and how is it different from JavaScript?',
      answer:
        'TypeScript is a superset of JavaScript that adds static typing. It compiles down to plain JS, so it runs anywhere JS runs, but it catches type errors at compile time instead of at runtime, which makes large codebases much easier to maintain and refactor.',
    })
    expect(faqPairs[9]?.question.startsWith('Scenario:')).toBe(true)
    expect(faqPairs[9]?.question.includes('⭐')).toBe(false)
  })
})
