/** Normalized JD text used for parse dedup and draft comparison. */
export function normalizeJdTextForParse(text: string, maxLen = 12_000): string {
  // refineJobDescriptionForUi is applied by callers before compare when needed
  return text.trim().slice(0, maxLen)
}

/**
 * Skip client re-parse when draft/hydration already has a structured JD for the same text.
 * Prevents "Structuring the posting…" on every hard refresh.
 */
export function shouldSkipJdReparse(input: {
  normalizedText: string
  minLen: number
  parseStatus: 'idle' | 'parsing' | 'ready' | 'failed'
  hasParsedJd: boolean
  lastParsedSource: string | null
}): boolean {
  if (input.normalizedText.length < input.minLen) return false
  if (input.parseStatus !== 'ready' || !input.hasParsedJd) return false
  if (!input.lastParsedSource) return false
  return input.lastParsedSource === input.normalizedText
}
