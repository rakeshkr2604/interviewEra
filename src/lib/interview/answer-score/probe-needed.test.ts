import { describe, expect, it } from 'vitest'
import {
  answerNeedsFollowUpProbe,
  parseOneLineSummaryFromRawModelOutput,
  probeNeededFromEvaluationRow,
  type ProbeScoreInput,
} from './probe-needed'
import { DIMENSION_KEYS, type DimensionKey } from './rubric'

function dims(partial: Partial<Record<DimensionKey, number>>): ProbeScoreInput['dimensions'] {
  const base: Record<DimensionKey, { score: number }> = {
    relevance: { score: 10 },
    content_accuracy: { score: 10 },
    communication_clarity: { score: 10 },
    structure: { score: 10 },
    specificity: { score: 10 },
  }
  for (const key of DIMENSION_KEYS) {
    const v = partial[key]
    if (typeof v === 'number') base[key] = { score: v }
  }
  return base
}

describe('answerNeedsFollowUpProbe', () => {
  it('all five dimensions exactly 7.0 → no probe (production regression)', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 7.6,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 7,
          structure: 7,
          specificity: 7,
          relevance: 10,
        }),
        one_line_summary:
          'The adaptive interview behavior could be more concretely described.',
      }),
    ).toBe(false)
  })

  it('communication_clarity 6.9 with others ≥7 → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: dims({ communication_clarity: 6.9 }),
      }),
    ).toBe(true)
  })

  it('content_accuracy 6.9 → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: dims({ content_accuracy: 6.9 }),
      }),
    ).toBe(true)
  })

  it('structure 6.9 → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: dims({ structure: 6.9 }),
      }),
    ).toBe(true)
  })

  it('specificity 6.9 → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: dims({ specificity: 6.9 }),
      }),
    ).toBe(true)
  })

  it('relevance 6.9 → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: dims({ relevance: 6.9 }),
      }),
    ).toBe(true)
  })

  it('all dimensions ≥7 with overall 6.5 → no probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 6.5,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 7,
          structure: 7,
          specificity: 7,
          relevance: 7,
        }),
      }),
    ).toBe(false)
  })

  it('all dimensions ≥7 with actionable one_line_summary → no probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 8.5,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 7,
          structure: 7,
          specificity: 7,
          relevance: 10,
        }),
        one_line_summary:
          'The adaptive interview behavior could be more concretely described.',
      }),
    ).toBe(false)
  })

  it('one dimension exactly 7.0 and others higher → no probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 8,
          structure: 9,
          specificity: 8,
          relevance: 10,
        }),
      }),
    ).toBe(false)
  })

  it('one dimension 6.99 → probe (strict < 7.0)', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: dims({ specificity: 6.99 }),
      }),
    ).toBe(true)
  })

  it('missing dimension → unknown', () => {
    const incomplete = dims({}) as ProbeScoreInput['dimensions'] & {
      specificity?: { score: number }
    }
    delete incomplete.specificity
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: incomplete,
      }),
    ).toBe('unknown')
  })

  it('invalid/non-numeric dimension → unknown', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9,
        dimensions: {
          ...dims({}),
          structure: { score: Number.NaN },
        },
      }),
    ).toBe('unknown')
  })

  it('null / unusable score → unknown (LLM decides)', () => {
    expect(answerNeedsFollowUpProbe(null)).toBe('unknown')
    expect(answerNeedsFollowUpProbe(undefined)).toBe('unknown')
  })

  it('weak specificity still probes (regression)', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 8.1,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 10,
          structure: 7,
          specificity: 5,
          relevance: 10,
        }),
        one_line_summary: 'Provide a specific project example.',
      }),
    ).toBe(true)
  })
})

describe('probeNeededFromEvaluationRow', () => {
  it('unscored / missing row → unknown (skip/timeout have no score)', () => {
    expect(probeNeededFromEvaluationRow(null)).toBe('unknown')
    expect(probeNeededFromEvaluationRow({ status: 'failed', overall: 6, dimensions: dims({}) })).toBe(
      'unknown',
    )
  })

  it('scored row with all dimensions ≥7 → no probe even with actionable summary', () => {
    const raw = JSON.stringify({
      sub_rubric: 'star',
      dimensions: dims({}),
      one_line_summary: 'Clarify the initial trigger for identifying the weakness.',
    })
    expect(
      probeNeededFromEvaluationRow({
        status: 'scored',
        overall: 7.6,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 7,
          structure: 7,
          specificity: 7,
          relevance: 10,
        }),
        raw_model_output: raw,
      }),
    ).toBe(false)
  })
})

describe('parseOneLineSummaryFromRawModelOutput', () => {
  it('reads the first JSON object and ignores repair suffix', () => {
    const raw =
      '{"one_line_summary":"Quantify the outcome."}\n---RETRY---\n{"one_line_summary":"ignored"}'
    expect(parseOneLineSummaryFromRawModelOutput(raw)).toBe('Quantify the outcome.')
  })
})
