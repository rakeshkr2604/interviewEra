/**
 * Pure render model for the review highlight view.
 *
 * Invariant: concatenating segment text reproduces the editor value EXACTLY
 * (whitespace, newlines, paragraph breaks included). The old renderer joined
 * tokens with single spaces, so what the candidate saw could differ from the
 * value that gets approved.
 *
 * Insert ops have no presence in the raw value and are intentionally not
 * rendered (same as before).
 */

import type { AlignedDiffOp } from '@/lib/interview/corrected-transcript-guard'

export type HighlightRenderSegment =
  | { kind: 'text'; text: string; start: number }
  | {
      kind: 'replace'
      text: string
      start: number
      end: number
      opIndex: number
      suggestion: string
    }
  | { kind: 'delete'; text: string; start: number; end: number; opIndex: number }

/**
 * Slice the CURRENT value by op offsets; gaps between ops (spaces, newlines,
 * `\n\n` paragraph breaks) are emitted verbatim as plain-text segments.
 */
export function buildHighlightRenderSegments(
  value: string,
  ops: AlignedDiffOp[],
): HighlightRenderSegment[] {
  const segments: HighlightRenderSegment[] = []
  let cursor = 0

  ops.forEach((op, opIndex) => {
    if (op.type === 'insert') return

    if (op.rawStart > cursor) {
      segments.push({ kind: 'text', text: value.slice(cursor, op.rawStart), start: cursor })
    }
    // Defensive: overlapping/out-of-order op — skip rather than duplicate text.
    if (op.rawStart < cursor) return

    const text = value.slice(op.rawStart, op.rawEnd)
    if (op.type === 'replace') {
      segments.push({
        kind: 'replace',
        text,
        start: op.rawStart,
        end: op.rawEnd,
        opIndex,
        suggestion: op.suggestion,
      })
    } else if (op.type === 'delete') {
      segments.push({ kind: 'delete', text, start: op.rawStart, end: op.rawEnd, opIndex })
    } else {
      segments.push({ kind: 'text', text, start: op.rawStart })
    }
    cursor = op.rawEnd
  })

  if (cursor < value.length) {
    segments.push({ kind: 'text', text: value.slice(cursor), start: cursor })
  }

  return segments
}

/** Test/QA helper — must always equal the input value. */
export function renderedTextFromSegments(segments: HighlightRenderSegment[]): string {
  return segments.map((s) => s.text).join('')
}
