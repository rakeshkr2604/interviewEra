/**
 * Resolve the answer to submit from the freshest transcript state.
 *
 * The live UI renders `dgTranscript + dgInterim`; `answerText` is synced on a
 * setTimeout(0) and can lag the last interim update. Submitting `answerText`
 * could drop the final words the candidate just saw on screen.
 *
 * Rule:
 *  - voice mode      → spoken (final + interim) wins; typed is the fallback
 *  - mic fallback    → typed wins (the visible textarea IS the answer);
 *                      spoken is only a fallback for a pre-fallback capture
 * Whitespace is normalized at the boundary only (single spaces, trimmed).
 */

import { shouldSuppressInterimAsDuplicate } from '@/lib/voice/stt-transcript'

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Final + interim without duplicating an interim that echoes the final tail. */
export function composeSpokenAnswer(finalText: string, interim: string): string {
  const fin = collapse(finalText)
  const int = collapse(interim)
  if (!int) return fin
  if (!fin) return int
  if (shouldSuppressInterimAsDuplicate(fin, int)) return fin
  return collapse(`${fin} ${int}`)
}

export function resolveSubmitAnswer(opts: {
  spokenFinal: string
  spokenInterim: string
  typedAnswer: string
  micFallbackActive: boolean
}): string {
  const spoken = composeSpokenAnswer(opts.spokenFinal, opts.spokenInterim)
  const typed = collapse(opts.typedAnswer)
  if (opts.micFallbackActive) return typed || spoken
  return spoken || typed
}
