import type { InterviewInputMode } from '@/lib/voice/browser-capabilities'

/**
 * FM-3 (Phase 4): a VOICE transcript below this word count is treated as a
 * probable transcription failure and must never be sent to the evaluator — a
 * technical STT failure (dropped audio, iOS Safari empty/partial recognition)
 * must not silently become a scored answer. Blocking (rather than forcing text
 * mode) keeps the mic live so the candidate can keep talking; a deliberately
 * terse TYPED answer is intentional input and is exempt from this rule.
 */
export const MIN_VOICE_ANSWER_WORDS = 5

/** Whitespace-delimited word count of a transcript (empty-safe). */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * True when a transcript is too short to be accepted as a real answer and must
 * be blocked before it reaches the evaluator. Voice engines only (Web Speech
 * and Deepgram) — `text` mode is intentional typed input and is never blocked
 * here, however short. Empty input also returns true (it is trivially too
 * short), though the caller handles the empty case with its own guard first so
 * the two failure modes get distinct UI copy.
 */
export function isTooShortVoiceAnswer(text: string, inputMode: InterviewInputMode): boolean {
  if (inputMode === 'text') return false
  return countWords(text) < MIN_VOICE_ANSWER_WORDS
}
