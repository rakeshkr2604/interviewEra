import { describe, expect, it } from 'vitest'
import {
  questionTypeFromScript,
  resolveQuestionType,
} from './question-type'
import { subRubricForQuestionType } from './rubric'

describe('question-type routing for answer_score', () => {
  it('SCRIPT_H → behavioral → star (no classifier)', async () => {
    expect(questionTypeFromScript('SCRIPT_H')).toBe('behavioral')
    const resolved = await resolveQuestionType({
      taggedType: null,
      scriptType: 'SCRIPT_H',
      question: 'Tell me about a conflict.',
    })
    expect(resolved).toEqual({
      questionType: 'behavioral',
      typeSource: 'script_derived',
    })
    expect(subRubricForQuestionType(resolved.questionType)).toBe('star')
  })

  it('SCRIPT_T → technical → logical_flow', async () => {
    expect(questionTypeFromScript('SCRIPT_T')).toBe('technical')
    const resolved = await resolveQuestionType({
      taggedType: null,
      scriptType: 'SCRIPT_T',
      question: 'Explain CAP theorem.',
    })
    expect(resolved.questionType).toBe('technical')
    expect(subRubricForQuestionType(resolved.questionType)).toBe('logical_flow')
  })

  it('tagged type wins over script identity', async () => {
    const resolved = await resolveQuestionType({
      taggedType: 'technical',
      scriptType: 'SCRIPT_H',
      question: 'anything',
    })
    expect(resolved).toEqual({ questionType: 'technical', typeSource: 'tagged' })
  })
})
