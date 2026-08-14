/**
 * Adaptive follow-up gate from an already-computed score-v1.6 result.
 *
 * Cap of 2 is a hard maximum, not a quota. This helper answers
 * "does this answer still need meaningful probing?" so turn authority
 * can skip a follow-up when the answer is already complete.
 *
 * Missing/failed scores return `unknown` — degrade to the turn LLM
 * (house style). Never hard-fail the interview.
 */

import { isPraiseRecapNotActionable } from '@/lib/interview/coaching-feedback-view'
import { DIMENSION_KEYS, type DimensionKey } from './rubric'

export type ProbeNeeded = boolean | 'unknown'

export type ProbeScoreInput = {
  overall: number
  dimensions: Record<DimensionKey, { score: number }>
  one_line_summary?: string | null
}

/** Required competency dims — communication-only weakness does not force a probe. */
export const REQUIRED_PROBE_DIMENSIONS: readonly DimensionKey[] = [
  'specificity',
  'structure',
  'relevance',
  'content_accuracy',
]

export const WEAK_DIMENSION_THRESHOLD = 7
export const WEAK_OVERALL_THRESHOLD = 8

export function parseOneLineSummaryFromRawModelOutput(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const first = raw.split('\n---RETRY---\n')[0] ?? raw
    const start = first.indexOf('{')
    const end = first.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    const parsed = JSON.parse(first.slice(start, end + 1)) as { one_line_summary?: unknown }
    return typeof parsed.one_line_summary === 'string' ? parsed.one_line_summary : null
  } catch {
    return null
  }
}

function parseStoredDimensions(raw: unknown): Record<DimensionKey, { score: number }> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const rec = raw as Record<string, unknown>
  const out = {} as Record<DimensionKey, { score: number }>
  for (const key of DIMENSION_KEYS) {
    const dim = rec[key]
    if (!dim || typeof dim !== 'object' || Array.isArray(dim)) return null
    const score = (dim as { score?: unknown }).score
    if (typeof score !== 'number' || !Number.isFinite(score)) return null
    out[key] = { score }
  }
  return out
}

/**
 * Score-driven probe decision.
 * - Weak required dimension or overall → probe.
 * - Praise-only next-step (e.g. "no major improvements") → no probe.
 * - Remaining actionable gap summary → probe.
 * - Null/unusable score → unknown (LLM decides).
 */
export function answerNeedsFollowUpProbe(score: ProbeScoreInput | null | undefined): ProbeNeeded {
  if (!score) return 'unknown'
  if (!Number.isFinite(score.overall)) return 'unknown'
  const dims = score.dimensions
  if (!dims) return 'unknown'

  for (const key of REQUIRED_PROBE_DIMENSIONS) {
    const v = dims[key]?.score
    if (typeof v !== 'number' || !Number.isFinite(v)) return 'unknown'
    if (v < WEAK_DIMENSION_THRESHOLD) return true
  }
  if (score.overall < WEAK_OVERALL_THRESHOLD) return true

  const summary = score.one_line_summary?.trim() ?? ''
  if (!summary) return false
  if (isPraiseRecapNotActionable(summary)) return false
  return true
}

export function probeNeededFromEvaluationRow(row: {
  status?: string | null
  overall?: number | string | null
  dimensions?: unknown
  raw_model_output?: string | null
  one_line_summary?: string | null
} | null | undefined): ProbeNeeded {
  if (!row || row.status !== 'scored') return 'unknown'
  const dimensions = parseStoredDimensions(row.dimensions)
  if (!dimensions) return 'unknown'
  const overall = typeof row.overall === 'number' ? row.overall : Number(row.overall)
  if (!Number.isFinite(overall)) return 'unknown'
  const one_line_summary =
    (typeof row.one_line_summary === 'string' && row.one_line_summary.trim()) ||
    parseOneLineSummaryFromRawModelOutput(row.raw_model_output)
  return answerNeedsFollowUpProbe({ overall, dimensions, one_line_summary })
}
