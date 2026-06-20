import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AudioSessionManager } from '@/lib/voice/audio/audio-session-manager'
import type {
  AudioDriver,
  AudioPlaybackCallbacks,
  CaptureHandle,
  PcmListener,
  PlaybackHandle,
} from '@/lib/voice/audio/audio-driver'

/**
 * Fake driver: records calls, lets tests drive PCM frames + playback
 * completion deterministically, and counts mic acquisitions to assert the
 * "acquire exactly once" guarantee.
 */
class FakeAudioDriver implements AudioDriver {
  startCaptureCalls = 0
  disposeCalls = 0
  resumeResult = true
  prepareForCaptureCalls = 0
  lastPcm: PcmListener | null = null
  activeCaptureStops = 0
  playCalls = 0
  activePlaybacks: Array<{ stopped: boolean; cb: AudioPlaybackCallbacks }> = []
  private gestureRequired = false
  private failPlayDecode = false
  unlockCalls = 0

  setGestureRequired(v: boolean) {
    this.gestureRequired = v
  }
  setFailPlayDecode(v: boolean) {
    this.failPlayDecode = v
  }

  unlock(): void {
    this.unlockCalls++
  }
  needsGestureUnlock(): boolean {
    return this.gestureRequired
  }
  async startCapture(onPcm: PcmListener): Promise<CaptureHandle> {
    this.startCaptureCalls++
    this.lastPcm = onPcm
    const handle: CaptureHandle = {
      stop: () => {
        this.activeCaptureStops++
      },
    }
    return handle
  }
  async resumePlayback(): Promise<boolean> {
    return this.resumeResult
  }
  async resumeCapture(): Promise<boolean> {
    return this.resumeResult
  }
  async prepareForCapture(): Promise<void> {
    this.prepareForCaptureCalls++
  }
  async play(_buffer: ArrayBuffer, callbacks: AudioPlaybackCallbacks): Promise<PlaybackHandle> {
    this.playCalls++
    if (this.failPlayDecode) {
      throw new Error('decode failed')
    }
    const entry = { stopped: false, cb: callbacks }
    this.activePlaybacks.push(entry)
    callbacks.onPlaybackStarted?.()
    const handle: PlaybackHandle = {
      durationSec: 2,
      stop: () => {
        entry.stopped = true
      },
    }
    return handle
  }
  async dispose(): Promise<void> {
    this.disposeCalls++
  }

  /** Test helper: simulate the most recent playback ending naturally. */
  endLatestPlayback() {
    const last = this.activePlaybacks[this.activePlaybacks.length - 1]
    last?.cb.onPlaybackComplete?.()
  }
}

function makeManager() {
  const driver = new FakeAudioDriver()
  const manager = new AudioSessionManager({ driver })
  return { driver, manager }
}

describe('AudioSessionManager', () => {
  let driver: FakeAudioDriver
  let manager: AudioSessionManager

  beforeEach(() => {
    ;({ driver, manager } = makeManager())
  })

  it('acquires the microphone exactly once, even across many enable/disable cycles', async () => {
    await manager.initialize()
    expect(driver.startCaptureCalls).toBe(1)
    expect(manager.getStatus()).toBe('ready')

    for (let i = 0; i < 5; i++) {
      await manager.enableMic()
      manager.disableMic()
    }
    expect(driver.startCaptureCalls).toBe(1) // never re-acquired
  })

  it('returns the same in-flight promise for concurrent initialize() calls', async () => {
    await Promise.all([manager.initialize(), manager.initialize(), manager.initialize()])
    expect(driver.startCaptureCalls).toBe(1)
  })

  it('gates PCM frames: only forwards to the consumer while mic enabled', async () => {
    const frames: ArrayBuffer[] = []
    manager.setPcmConsumer((f) => frames.push(f))
    await manager.initialize()

    // mic disabled by default → frames dropped
    driver.lastPcm?.(new ArrayBuffer(4))
    expect(frames).toHaveLength(0)

    await manager.enableMic()
    driver.lastPcm?.(new ArrayBuffer(4))
    driver.lastPcm?.(new ArrayBuffer(4))
    expect(frames).toHaveLength(2)

    manager.disableMic()
    driver.lastPcm?.(new ArrayBuffer(4))
    expect(frames).toHaveLength(2) // dropped again
  })

  it('prepares for capture (focus release) when enabling mic', async () => {
    await manager.initialize()
    await manager.enableMic()
    expect(driver.prepareForCaptureCalls).toBe(1)
  })

  it('never overlaps playback — a new utterance supersedes the prior source', async () => {
    await manager.initialize()
    await manager.playAudio(new ArrayBuffer(8))
    const first = driver.activePlaybacks[0]
    await manager.playAudio(new ArrayBuffer(8))
    expect(first.stopped).toBe(true) // prior stopped before new starts
    expect(driver.playCalls).toBe(2)
  })

  it('only completes the latest playback request (supersession token)', async () => {
    await manager.initialize()
    const firstComplete = vi.fn()
    const secondComplete = vi.fn()
    await manager.playAudio(new ArrayBuffer(8), { onPlaybackComplete: firstComplete })
    await manager.playAudio(new ArrayBuffer(8), { onPlaybackComplete: secondComplete })

    // Ending the (superseded) first playback must NOT fire its completion.
    driver.activePlaybacks[0].cb.onPlaybackComplete?.()
    expect(firstComplete).not.toHaveBeenCalled()

    driver.endLatestPlayback()
    expect(secondComplete).toHaveBeenCalledTimes(1)
  })

  it('stopAudio cancels active playback', async () => {
    await manager.initialize()
    await manager.playAudio(new ArrayBuffer(8))
    manager.stopAudio()
    expect(driver.activePlaybacks[0].stopped).toBe(true)
  })

  it('enableMic stops any interviewer audio first', async () => {
    await manager.initialize()
    await manager.playAudio(new ArrayBuffer(8))
    await manager.enableMic()
    expect(driver.activePlaybacks[0].stopped).toBe(true)
  })

  it('reports playback failure on decode error', async () => {
    await manager.initialize()
    driver.setFailPlayDecode(true)
    const onFail = vi.fn()
    await manager.playAudio(new ArrayBuffer(8), { onPlaybackFailed: onFail })
    expect(onFail).toHaveBeenCalledTimes(1)
  })

  it('reports playback failure when autoplay resume is blocked', async () => {
    await manager.initialize()
    driver.resumeResult = false
    const onFail = vi.fn()
    await manager.playAudio(new ArrayBuffer(8), { onPlaybackFailed: onFail })
    expect(onFail).toHaveBeenCalledTimes(1)
    expect(driver.playCalls).toBe(0)
  })

  it('resumes capture and playback after background via resumeAfterBackground', async () => {
    const resumePlayback = vi.spyOn(driver, 'resumePlayback')
    const resumeCapture = vi.spyOn(driver, 'resumeCapture')
    await manager.initialize()
    await manager.resumeAfterBackground()
    expect(resumePlayback).toHaveBeenCalledTimes(1)
    expect(resumeCapture).toHaveBeenCalledTimes(1)
  })

  it('disposes deterministically and is idempotent', async () => {
    await manager.initialize()
    await manager.enableMic()
    await manager.dispose()
    await manager.dispose()
    expect(manager.getStatus()).toBe('disposed')
    expect(driver.disposeCalls).toBe(1)
    expect(driver.activeCaptureStops).toBe(1) // capture stopped exactly once
    expect(manager.isMicEnabled()).toBe(false)
  })

  it('cannot initialize after dispose', async () => {
    await manager.initialize()
    await manager.dispose()
    await expect(manager.initialize()).rejects.toThrow(/after dispose/)
  })

  it('releases the mic if dispose races initialize', async () => {
    const initP = manager.initialize()
    // dispose before init settles
    const dispP = manager.dispose()
    await Promise.all([initP, dispP])
    expect(manager.getStatus()).toBe('disposed')
    expect(driver.activeCaptureStops).toBe(1) // freshly-acquired stream released
  })

  it('blocks playback and mic when not ready', async () => {
    const onFail = vi.fn()
    await manager.playAudio(new ArrayBuffer(8), { onPlaybackFailed: onFail })
    expect(onFail).toHaveBeenCalledTimes(1)
    expect(await manager.enableMic()).toBe(false)
  })
})
