/**
 * SCRIPT_H turn playback ownership helpers.
 *
 * One active interviewer turn ⇒ one canonical speech ⇒ one playback sequence.
 * Sentence-0 from SSE is a provisional prefix; complete delivers the canonical
 * string. Early TTS may start before complete only when the turn is already
 * activated (user waiting on turn_loading) — never while review/feedback is
 * open, and never while a prior turn is still the live presentation (ack TTS).
 */

import {
  remainingSpeechAfterPrefix,
  speechPrefixMatchesCanonical,
} from '@/lib/interview/json-speech-extractor'

export type EarlySpokenState = {
  sentence: string
  /** Resolves when sentence-0 playback finishes (or immediately if deferred). */
  done: Promise<void>
  /**
   * True when sentence-0 was recorded during prefetch/review without calling
   * speak(). applyTurnPayload must speak the full canonical speech once.
   */
  deferred: boolean
  /** Fetch generation that started sentence-0; stale completions must ignore it. */
  fetchGeneration?: number
}

export type PlaybackHighlight = {
  /** Exact text passed to the current speak() call. */
  segment: string
  /** Word offset of this segment within the canonical full speech. */
  prefixWordCount: number
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Build the highlight plan for a TTS segment within canonical speech.
 * Prefix words are treated as already spoken when highlighting the suffix.
 */
export function buildPlaybackHighlight(
  fullSpeech: string,
  segment: string,
): PlaybackHighlight {
  const full = fullSpeech.trim()
  const seg = segment.trim()
  if (!seg || seg === full) {
    return { segment: full || seg, prefixWordCount: 0 }
  }

  // Segment is an exact/normalized prefix of full → sentence-0 playback.
  if (full.startsWith(seg) || normalizeWs(full).startsWith(normalizeWs(seg))) {
    return { segment: seg, prefixWordCount: 0 }
  }

  // Segment is a suffix (remaining after early sentence).
  const idx = full.indexOf(seg)
  if (idx > 0) {
    return { segment: seg, prefixWordCount: wordCount(full.slice(0, idx)) }
  }
  const fullN = normalizeWs(full)
  const segN = normalizeWs(seg)
  const nIdx = fullN.indexOf(segN)
  if (nIdx > 0) {
    return { segment: seg, prefixWordCount: wordCount(fullN.slice(0, nIdx)) }
  }
  return { segment: seg, prefixWordCount: 0 }
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Map 0–1 audio progress onto the canonical speech word index, scoped to the
 * segment currently being spoken (not an independent full-speech timer).
 */
export function computeCaptionWordIndex(opts: {
  fullSpeech: string
  highlight: PlaybackHighlight | null
  progress: number
  isPlaying: boolean
}): number {
  const words = opts.fullSpeech.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  if (!opts.isPlaying) return words.length

  const progress = Math.min(1, Math.max(0, opts.progress))
  const highlight = opts.highlight

  if (!highlight || !highlight.segment.trim()) {
    return Math.min(Math.floor(progress * words.length), words.length - 1)
  }

  const segWords = highlight.segment.trim().split(/\s+/).filter(Boolean)
  if (segWords.length === 0) {
    return Math.min(highlight.prefixWordCount, words.length - 1)
  }

  const local = Math.min(Math.floor(progress * segWords.length), segWords.length - 1)
  return Math.min(highlight.prefixWordCount + local, words.length - 1)
}

/**
 * Decide what speak() sequence applyTurnPayload should run after SSE early path.
 */
export function resolveTurnSpeakPlan(
  fullSpeech: string,
  early: EarlySpokenState | null,
): {
  mode: 'full' | 'remaining_after_early' | 'silent'
  remaining: string
  early: EarlySpokenState | null
} {
  const full = fullSpeech.trim()
  if (!full) return { mode: 'silent', remaining: '', early: null }

  if (!early) {
    return { mode: 'full', remaining: full, early: null }
  }

  // Prefetch during review: sentence recorded but never played → one full speak.
  if (early.deferred) {
    return { mode: 'full', remaining: full, early: null }
  }

  // Authority may replace speech after sentence-0 was streamed from raw LLM
  // JSON (warmup → canned core entry). Mismatched early audio must not stand
  // in for the canonical turn — speak full (caller stop()s in-flight TTS).
  if (!speechPrefixMatchesCanonical(full, early.sentence)) {
    return { mode: 'full', remaining: full, early: null }
  }

  const remaining = remainingSpeechAfterPrefix(full, early.sentence)
  return { mode: 'remaining_after_early', remaining, early }
}

/**
 * Sentence-0 from an in-flight /turn must not call speak() before the server
 * has finalized authority overrides. Raw model speech may be replaced by a
 * score/cap/phase backstop; playing it early then speaking the canonical turn
 * cuts the first audio off mid-sentence. Boot is the only safe early path
 * because no prior answer-dependent authority decision exists.
 */
export function shouldDeferEarlyTts(opts: {
  /** True for every non-boot LLM turn until the SSE complete event arrives. */
  authoritativeTurnPending: boolean
  reviewOpen: boolean
  /** True while a prior turn is still the live presentation. */
  priorTurnStillLive: boolean
}): boolean {
  return (
    opts.authoritativeTurnPending ||
    opts.reviewOpen ||
    opts.priorTurnStillLive
  )
}

/**
 * Question/caption text in turn_ready: reveal on playback-start, not on apply.
 * Preserves anti-blank chrome; does not wait for TTS completion; mic/timer
 * still kick off on playback-complete.
 */
export function shouldRevealSpokenQuestion(opts: {
  hydrateOnly: boolean
  maySpeak: boolean
  speakPlanMode: 'full' | 'remaining_after_early' | 'silent'
  playbackStarted: boolean
  isPlaying: boolean
}): boolean {
  if (opts.hydrateOnly || !opts.maySpeak) return true
  if (opts.speakPlanMode === 'silent') return true
  return opts.playbackStarted || opts.isPlaying
}

export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true
  if (err instanceof Error && err.name === 'AbortError') return true
  if (err instanceof Error && /signal is aborted/i.test(err.message)) return true
  return false
}
