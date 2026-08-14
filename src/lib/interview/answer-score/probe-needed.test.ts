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
  it('9.6 praise recap + communication-only 7.0 → no probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9.6,
        dimensions: dims({ communication_clarity: 7, content_accuracy: 10 }),
        one_line_summary:
          'No major improvements needed; the answer is comprehensive and well-structured.',
      }),
    ).toBe(false)
  })

  it('8.1 specificity 5.0 + project-example gap → probe', () => {
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
        one_line_summary:
          'Provide a specific project example where these changes were applied and quantify the outcome.',
      }),
    ).toBe(true)
  })

  it('6.6 specificity 5.0 + quantify delivery → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 6.6,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 7,
          structure: 7,
          specificity: 5,
          relevance: 7,
        }),
        one_line_summary: 'Quantify the improvement in delivery speed or quality, even if an estimate.',
      }),
    ).toBe(true)
  })

  it('8.5 actionable trigger gap → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 8.5,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 10,
          structure: 7,
          specificity: 7,
          relevance: 10,
        }),
        one_line_summary: 'Clarify the initial trigger for identifying the weakness.',
      }),
    ).toBe(true)
  })

  it('8.6 all required dims ≥7 but actionable tool gap → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 8.6,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 7,
          structure: 10,
          specificity: 10,
          relevance: 10,
        }),
        one_line_summary:
          'The candidate could elaborate on the specific tools or methods used for prioritization beyond user impact and production risk.',
      }),
    ).toBe(true)
  })

  it('strong overall with empty summary → no probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 9.0,
        dimensions: dims({}),
        one_line_summary: '',
      }),
    ).toBe(false)
  })

  it('overall below 8 with no weak required dim → probe', () => {
    expect(
      answerNeedsFollowUpProbe({
        overall: 7.5,
        dimensions: dims({
          communication_clarity: 7,
          content_accuracy: 7,
          structure: 7,
          specificity: 7,
          relevance: 7,
        }),
        one_line_summary: 'Tighten the outcome.',
      }),
    ).toBe(true)
  })

  it('null / unusable score → unknown (LLM decides)', () => {
    expect(answerNeedsFollowUpProbe(null)).toBe('unknown')
    expect(answerNeedsFollowUpProbe(undefined)).toBe('unknown')
    expect(
      answerNeedsFollowUpProbe({
        overall: Number.NaN,
        dimensions: dims({}),
      }),
    ).toBe('unknown')
  })
})

describe('probeNeededFromEvaluationRow', () => {
  it('unscored / missing row → unknown (skip/timeout have no score)', () => {
    expect(probeNeededFromEvaluationRow(null)).toBe('unknown')
    expect(probeNeededFromEvaluationRow({ status: 'failed', overall: 6, dimensions: dims({}) })).toBe(
      'unknown',
    )
  })

  it('parses one_line_summary from raw_model_output', () => {
    const raw = JSON.stringify({
      sub_rubric: 'star',
      dimensions: dims({}),
      one_line_summary: 'No major improvements needed; the answer is comprehensive.',
    })
    expect(
      probeNeededFromEvaluationRow({
        status: 'scored',
        overall: 9.6,
        dimensions: dims({ communication_clarity: 7 }),
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
