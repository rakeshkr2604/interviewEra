import { describe, expect, it } from 'vitest'
import { scriptRadarChartRows, strongestAndWeakestDimensions } from '@/lib/interview/script-report/radar'
import { DIMENSION_KEYS } from '@/lib/interview/answer-score/rubric'

describe('script radar helpers', () => {
  it('emits five score-v1.2 axes without confidence', () => {
    const dims = Object.fromEntries(DIMENSION_KEYS.map((k, i) => [k, i + 5])) as Record<
      (typeof DIMENSION_KEYS)[number],
      number
    >
    const rows = scriptRadarChartRows(dims)
    expect(rows).toHaveLength(5)
    expect(rows.map((r) => r.dimension).join(',')).not.toMatch(/confidence/i)
  })

  it('picks strongest and weakest', () => {
    const dims = {
      relevance: 9,
      content_accuracy: 7,
      communication_clarity: 6,
      structure: 4,
      specificity: 5,
    }
    expect(strongestAndWeakestDimensions(dims)).toEqual({
      strongest: 'relevance',
      weakest: 'structure',
    })
  })
})
