import { describe, expect, it } from 'vitest'
import { progressRingLabel } from '@/lib/interview/runtime-phase'

describe('progressRingLabel', () => {
  it('shows speaking progress during avatar_speaking when available', () => {
    expect(progressRingLabel('avatar_speaking', { speakingProgressPct: 42 })).toBe('42%')
  })

  it('falls back to Speaking label before playback progress exists', () => {
    expect(progressRingLabel('avatar_speaking')).toBe('Speaking…')
    expect(progressRingLabel('avatar_speaking', { speakingProgressPct: 0 })).toBe('Speaking…')
  })
})
