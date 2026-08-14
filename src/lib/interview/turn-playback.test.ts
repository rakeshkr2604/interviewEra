import { describe, expect, it } from 'vitest'
import {
  buildPlaybackHighlight,
  computeCaptionWordIndex,
  isAbortError,
  resolveTurnSpeakPlan,
  shouldDeferEarlyTts,
  shouldRevealSpokenQuestion,
  wordCount,
} from '@/lib/interview/turn-playback'

describe('resolveTurnSpeakPlan', () => {
  const full = 'Tell me about a project you built. What was the biggest challenge?'

  it('A/E: deferred early sentence → speak full once (no sentence0 replay path)', () => {
    const plan = resolveTurnSpeakPlan(full, {
      sentence: 'Tell me about a project you built.',
      done: Promise.resolve(),
      deferred: true,
    })
    expect(plan.mode).toBe('full')
    expect(plan.remaining).toBe(full)
  })

  it('F/G: played early sentence → remaining suffix only', () => {
    const plan = resolveTurnSpeakPlan(full, {
      sentence: 'Tell me about a project you built.',
      done: Promise.resolve(),
      deferred: false,
    })
    expect(plan.mode).toBe('remaining_after_early')
    expect(plan.remaining).toBe('What was the biggest challenge?')
    expect(plan.remaining.startsWith('Tell me about')).toBe(false)
  })

  it('no early → full speech', () => {
    const plan = resolveTurnSpeakPlan(full, null)
    expect(plan.mode).toBe('full')
    expect(plan.remaining).toBe(full)
  })

  it('stale warmup sentence-0 vs canned core-entry complete → speak full canonical', () => {
    const canonical = "Alright — let's dig into the interview questions."
    const plan = resolveTurnSpeakPlan(canonical, {
      sentence: 'Good. Today is a easy technical interview for Software Engineer.',
      done: Promise.resolve(),
      deferred: false,
      fetchGeneration: 2,
    })
    expect(plan.mode).toBe('full')
    expect(plan.remaining).toBe(canonical)
    expect(plan.early).toBeNull()
  })
})

describe('computeCaptionWordIndex', () => {
  const full = 'Tell me about a project you built. What was the biggest challenge?'

  it('N: highlight follows suffix segment, not full-speech timer', () => {
    const highlight = buildPlaybackHighlight(full, 'What was the biggest challenge?')
    expect(highlight.prefixWordCount).toBe(wordCount('Tell me about a project you built.'))

    const mid = computeCaptionWordIndex({
      fullSpeech: full,
      highlight,
      progress: 0,
      isPlaying: true,
    })
    expect(mid).toBe(highlight.prefixWordCount)

    const end = computeCaptionWordIndex({
      fullSpeech: full,
      highlight,
      progress: 0.99,
      isPlaying: true,
    })
    expect(end).toBeGreaterThan(highlight.prefixWordCount)
    expect(end).toBeLessThan(wordCount(full))
  })

  it('clears to past-end when not playing', () => {
    expect(
      computeCaptionWordIndex({
        fullSpeech: full,
        highlight: null,
        progress: 0.5,
        isPlaying: false,
      }),
    ).toBe(wordCount(full))
  })

  it('full-segment highlight starts at word 0', () => {
    const highlight = buildPlaybackHighlight(full, full)
    expect(highlight.prefixWordCount).toBe(0)
    expect(
      computeCaptionWordIndex({
        fullSpeech: full,
        highlight,
        progress: 0,
        isPlaying: true,
      }),
    ).toBe(0)
  })
})

describe('isAbortError', () => {
  it('P: recognizes AbortError and aborted-signal messages', () => {
    expect(isAbortError(new DOMException('Aborted', 'AbortError'))).toBe(true)
    expect(isAbortError(new Error('signal is aborted without reason'))).toBe(true)
    expect(isAbortError(new Error('network failed'))).toBe(false)
  })
})

describe('shouldDeferEarlyTts', () => {
  it('allows sentence-0 only for boot after all other ownership gates clear', () => {
    expect(
      shouldDeferEarlyTts({
        authoritativeTurnPending: false,
        reviewOpen: false,
        priorTurnStillLive: false,
      }),
    ).toBe(false)
  })

  it('defers non-boot sentence-0 until authority finalizes canonical speech', () => {
    expect(
      shouldDeferEarlyTts({
        authoritativeTurnPending: true,
        reviewOpen: false,
        priorTurnStillLive: false,
      }),
    ).toBe(true)
  })

  it('defers while feedback is open (existing Continue prefetch)', () => {
    expect(
      shouldDeferEarlyTts({
        authoritativeTurnPending: false,
        reviewOpen: true,
        priorTurnStillLive: false,
      }),
    ).toBe(true)
  })

  it('defers while a prior auto-turn is still presenting (ack TTS)', () => {
    expect(
      shouldDeferEarlyTts({
        authoritativeTurnPending: false,
        reviewOpen: false,
        priorTurnStillLive: true,
      }),
    ).toBe(true)
  })
})

describe('shouldRevealSpokenQuestion', () => {
  const live = {
    hydrateOnly: false,
    maySpeak: true,
    speakPlanMode: 'full' as const,
    playbackStarted: false,
    isPlaying: false,
  }

  it('hides new question text until playback has started', () => {
    expect(shouldRevealSpokenQuestion(live)).toBe(false)
  })

  it('reveals on playback-start without waiting for TTS completion', () => {
    expect(shouldRevealSpokenQuestion({ ...live, playbackStarted: true, isPlaying: true })).toBe(
      true,
    )
    expect(shouldRevealSpokenQuestion({ ...live, playbackStarted: true, isPlaying: false })).toBe(
      true,
    )
  })

  it('reveals when audio is already playing (SSE sentence-0)', () => {
    expect(shouldRevealSpokenQuestion({ ...live, isPlaying: true })).toBe(true)
  })

  it('reveals immediately when there is no live speak (hydrate / skip / silent)', () => {
    expect(shouldRevealSpokenQuestion({ ...live, hydrateOnly: true })).toBe(true)
    expect(shouldRevealSpokenQuestion({ ...live, maySpeak: false })).toBe(true)
    expect(shouldRevealSpokenQuestion({ ...live, speakPlanMode: 'silent' })).toBe(true)
  })
})
