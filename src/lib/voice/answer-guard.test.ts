import { describe, it, expect } from 'vitest'
import {
  MIN_VOICE_ANSWER_WORDS,
  countWords,
  isTooShortVoiceAnswer,
} from './answer-guard'

/**
 * FM-3 Phase 4 — the strict fairness invariant: a technical STT failure must
 * never silently become a scored answer. A voice transcript under
 * MIN_VOICE_ANSWER_WORDS is blocked before it reaches the evaluator; a typed
 * answer is intentional input and is never blocked, however short.
 */

describe('countWords', () => {
  it('counts whitespace-delimited words', () => {
    expect(countWords('one two three')).toBe(3)
  })

  it('is empty-safe and collapses irregular whitespace', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
    expect(countWords('  hello   world \n\t there ')).toBe(3)
  })
})

describe('isTooShortVoiceAnswer', () => {
  it('blocks a voice transcript under the minimum word count', () => {
    expect(isTooShortVoiceAnswer('yes definitely agreed', 'voice')).toBe(true) // 3
    expect(isTooShortVoiceAnswer('no', 'deepgram')).toBe(true) // 1
    expect(isTooShortVoiceAnswer('', 'voice')).toBe(true) // 0
  })

  it('allows a voice transcript at or above the minimum word count', () => {
    // Exactly MIN_VOICE_ANSWER_WORDS words must pass (boundary).
    expect(isTooShortVoiceAnswer('I have not used Kafka', 'voice')).toBe(false) // 5
    expect(
      isTooShortVoiceAnswer('I led the migration to a service mesh', 'deepgram'),
    ).toBe(false) // 8
  })

  it('never blocks text mode, however short (intentional typed input)', () => {
    expect(isTooShortVoiceAnswer('no', 'text')).toBe(false)
    expect(isTooShortVoiceAnswer('', 'text')).toBe(false)
    expect(isTooShortVoiceAnswer('ok', 'text')).toBe(false)
  })

  it('boundary: MIN_VOICE_ANSWER_WORDS - 1 words is blocked, MIN passes', () => {
    const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')
    expect(isTooShortVoiceAnswer(words(MIN_VOICE_ANSWER_WORDS - 1), 'voice')).toBe(true)
    expect(isTooShortVoiceAnswer(words(MIN_VOICE_ANSWER_WORDS), 'voice')).toBe(false)
  })
})
