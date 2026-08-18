/**
 * Readability suggestions for the review-transcript step.
 * Separate from STT word-correction (corrected_transcript): these only insert
 * paragraph breaks / fix obvious spacing — never change content words.
 */

export type ParagraphBreakSuggestion = {
  /** Index where `\n\n` should be inserted (start of the next sentence). */
  insertAt: number
}

const TOPIC_START =
  /^(My name|I am|I'm|Currently|While building|While|Also|Finally|In conclusion|I believe|I'm excited|I have also|I'm also|One more|Additionally)/i

/**
 * Suggest paragraph breaks in a wall-of-text spoken answer.
 * Skips short answers and text that already has blank lines.
 */
export function suggestParagraphBreaks(text: string): ParagraphBreakSuggestion[] {
  if (!text.trim()) return []
  if (/\n\s*\n/.test(text)) return []

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  if (wordCount < 40) return []

  const boundaryEnds: number[] = []
  const re = /[.!?]["']?\s+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    boundaryEnds.push(m.index + m[0].length)
  }
  if (boundaryEnds.length < 2) return []

  const breaks: ParagraphBreakSuggestion[] = []
  for (let i = 0; i < boundaryEnds.length; i++) {
    const at = boundaryEnds[i]!
    const rest = text.slice(at).trimStart()
    if (!rest) continue

    const topic = TOPIC_START.test(rest)
    // Every 2nd sentence, or any clear topic shift — keeps 3–5 short paras.
    const everyOther = i % 2 === 1
    if (!topic && !everyOther) continue

    const last = breaks[breaks.length - 1]
    if (last && at - last.insertAt < 48) continue
    breaks.push({ insertAt: at })
  }

  return breaks.slice(0, 5)
}

/** Apply break suggestions from the end so earlier offsets stay valid. */
export function applyParagraphBreaks(
  text: string,
  breaks: ParagraphBreakSuggestion[],
): string {
  let out = text
  const ordered = [...breaks].sort((a, b) => b.insertAt - a.insertAt)
  for (const b of ordered) {
    if (b.insertAt <= 0 || b.insertAt >= out.length) continue
    const nearby = out.slice(Math.max(0, b.insertAt - 2), b.insertAt + 2)
    if (nearby.includes('\n')) continue
    out = `${out.slice(0, b.insertAt)}\n\n${out.slice(b.insertAt)}`
  }
  return out
}

/** Insert suggested paragraph breaks, or return the original string. */
export function withSuggestedParagraphBreaks(text: string): string {
  return applyParagraphBreaks(text, suggestParagraphBreaks(text))
}

/**
 * Fix common STT/spacing glitches without touching words:
 * "API ,system" → "API, system"; ".Currently" → ". Currently"
 */
export function normalizeSpeechSpacing(text: string): string {
  return text
    .replace(/[^\S\n]+,/g, ',')
    .replace(/,([^\s\n])/g, ', $1')
    .replace(/[^\S\n]+\./g, '.')
    .replace(/\.([A-Za-z])/g, '. $1')
    .replace(/[^\S\n]+([!?])/g, '$1')
    .replace(/([!?])([A-Za-z])/g, '$1 $2')
    // Collapse runs of spaces/tabs but preserve newlines.
    .replace(/[^\S\n]{2,}/g, ' ')
}

export function spacingNeedsFix(text: string): boolean {
  return normalizeSpeechSpacing(text) !== text
}
