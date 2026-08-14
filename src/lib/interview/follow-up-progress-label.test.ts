import { describe, expect, it } from 'vitest'
import { coreProgressLabels } from './follow-up-progress-label'

describe('coreProgressLabels', () => {
  it('labels a follow-up without advancing the main question number', () => {
    expect(
      coreProgressLabels({ isFollowUp: true, questionNumber: 2, totalQuestions: 6 }),
    ).toEqual({
      desktop: 'Follow-up · Q2 of 6',
      mobile: 'Follow-up',
    })
  })

  it('labels a normal core question', () => {
    expect(
      coreProgressLabels({ isFollowUp: false, questionNumber: 2, totalQuestions: 6 }),
    ).toEqual({
      desktop: 'Question 2 of 6',
      mobile: 'Q2/6',
    })
  })
})
