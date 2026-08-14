import { describe, expect, it } from 'vitest'
import { cannedCandidateQuestionAnswerTurn } from '@/lib/ai/scripts/turn-authority'
import {
  ACK_HANG_WATCHDOG_MAX_MS,
  resolveAckHangWatchdogMs,
} from './turn-presentation'

const AUTO_ADVANCE_MS = 1_500

/**
 * Regression: the watchdog was a flat AUTO_ADVANCE_MS regardless of speech
 * length. Short canned acks finished inside it, but a multi-sentence
 * candidate-question answer did not — the timer fired mid-sentence, loaded
 * the next turn, and cut playback off after a few words.
 */
describe('ack hang watchdog sizing', () => {
  it('keeps the floor for a short canned ack', () => {
    expect(resolveAckHangWatchdogMs("Thanks. Let's keep going.", AUTO_ADVANCE_MS)).toBeGreaterThanOrEqual(
      AUTO_ADVANCE_MS,
    )
  })

  it('outlasts a multi-sentence candidate-question answer', () => {
    const speech =
      'That is a good question. In general, success in this role is defined by the impact you create, how reliably you deliver, and how well you collaborate with the team. Most people get a clear picture of that within the first few months.'
    const words = speech.split(/\s+/).length
    const spokenAtSlowPaceMs = (words / 130) * 60_000

    const watchdog = resolveAckHangWatchdogMs(speech, AUTO_ADVANCE_MS)

    expect(watchdog).toBeGreaterThan(spokenAtSlowPaceMs)
    expect(watchdog).toBeGreaterThan(AUTO_ADVANCE_MS)
  })

  it('scales monotonically with speech length', () => {
    const short = resolveAckHangWatchdogMs('Understood.', AUTO_ADVANCE_MS)
    const long = resolveAckHangWatchdogMs(
      Array.from({ length: 40 }, () => 'word').join(' '),
      AUTO_ADVANCE_MS,
    )
    expect(long).toBeGreaterThan(short)
  })

  it('stays bounded so a genuinely hung TTS still recovers', () => {
    const veryLong = Array.from({ length: 5_000 }, () => 'word').join(' ')
    expect(resolveAckHangWatchdogMs(veryLong, AUTO_ADVANCE_MS)).toBe(
      ACK_HANG_WATCHDOG_MAX_MS,
    )
  })

  it('outlasts the canned candidate-question answer turn', () => {
    const turn = cannedCandidateQuestionAnswerTurn()
    expect(turn.is_question).toBe(false)
    expect(resolveAckHangWatchdogMs(turn.speech, AUTO_ADVANCE_MS)).toBeGreaterThan(
      AUTO_ADVANCE_MS * 4,
    )
  })

  it('handles empty speech without dropping below the floor', () => {
    expect(resolveAckHangWatchdogMs('', AUTO_ADVANCE_MS)).toBeGreaterThanOrEqual(
      AUTO_ADVANCE_MS,
    )
  })
})
