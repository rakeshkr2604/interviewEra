import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  registerCaptureAudioContext,
  unregisterCaptureAudioContext,
  resumeCaptureAudioContext,
  __clearCaptureAudioContextsForTests,
} from '@/lib/voice/audio-gesture'

function makeCtx(state: AudioContextState = 'suspended') {
  return {
    state,
    resume: vi.fn(async function (this: { state: AudioContextState }) {
      this.state = 'running'
    }),
    close: vi.fn(async function (this: { state: AudioContextState }) {
      this.state = 'closed'
    }),
    sampleRate: 16_000,
  } as unknown as AudioContext
}

describe('capture AudioContext registry', () => {
  beforeEach(() => {
    __clearCaptureAudioContextsForTests()
  })

  it('resumes suspended capture contexts', async () => {
    const ctx = makeCtx('suspended')
    registerCaptureAudioContext(ctx)

    const ok = await resumeCaptureAudioContext()

    expect(ctx.resume).toHaveBeenCalledTimes(1)
    expect(ok).toBe(true)
    expect(ctx.state).toBe('running')
  })

  it('skips closed contexts', async () => {
    const ctx = makeCtx('closed')
    registerCaptureAudioContext(ctx)

    const ok = await resumeCaptureAudioContext()

    expect(ctx.resume).not.toHaveBeenCalled()
    expect(ok).toBe(false)
  })

  it('unregister removes context from resume set', async () => {
    const ctx = makeCtx('suspended')
    registerCaptureAudioContext(ctx)
    unregisterCaptureAudioContext(ctx)

    const ok = await resumeCaptureAudioContext()

    expect(ctx.resume).not.toHaveBeenCalled()
    expect(ok).toBe(false)
  })
})
