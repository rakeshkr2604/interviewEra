/**
 * Deterministic Big-O / complexity notation normalization for scoring input.
 * Applied only before answer-score — never mutates raw_transcript or review UI text.
 *
 * Patterns are limited to those confirmed in production STT samples (recon 2026-07).
 */

/** Product convention: caret notation (matches SEO / question bank copy). */
const O_N_SQUARED = 'O(n^2)'

/**
 * Normalize unambiguous spoken complexity phrases to standard notation.
 * Conservative: if no pattern matches, returns input unchanged.
 */
export function normalizeComplexityNotation(text: string): string {
  if (!text.trim()) return text

  let out = text

  // Squared before generic O(n) — "big o n squared" must not become "O(n) squared"
  out = out.replace(/\b(?:big\s*)?o\s+n\s+squared\b/gi, O_N_SQUARED)

  // "big o n log n" / "big O n log n" (most common voice failure mode in samples)
  out = out.replace(/\bbig\s*o\s*n\s*log\s*n\b/gi, 'O(n log n)')

  // "big o of n" / "big o n" / "o of n" (word-boundary guarded — not "on", "no")
  out = out.replace(/\bbig\s*o\s*(?:of\s*)?n\b(?!\s*(?:log|squared))/gi, 'O(n)')
  out = out.replace(/\bo\s+of\s+n\b(?!\s*(?:log|squared))/gi, 'O(n)')

  // "o n log n" without "big" prefix (when already partially recognized)
  out = out.replace(/(?<!\w)\bo\s+n\s+log\s+n\b(?!\w)/gi, 'O(n log n)')

  return out
}

/** Scoring-only helper — alias for call sites that score voice transcripts. */
export function normalizeComplexityNotationForScoring(transcript: string): string {
  return normalizeComplexityNotation(transcript)
}
