import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MicCaptureCoordinator } from '@/lib/voice/mic-capture-coordinator'

function makeTrack(overrides: Partial<MediaStreamTrack> = {}): MediaStreamTrack {
  return {
    label: 'Default Mic',
    readyState: 'live',
    muted: false,
    enabled: true,
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  } as unknown as MediaStreamTrack
}

function makeStream(tracks: MediaStreamTrack[] = [makeTrack()]): MediaStream {
  return {
    getAudioTracks: () => tracks,
    getTracks: () => tracks,
  } as unknown as MediaStream
}

describe('MicCaptureCoordinator stress', () => {
  let coordinator: MicCaptureCoordinator
  let getUserMedia: ReturnType<typeof vi.fn>
  let activeStreams: MediaStream[]

  beforeEach(() => {
    coordinator = new MicCaptureCoordinator()
    activeStreams = []
    getUserMedia = vi.fn().mockImplementation(async () => {
      const stream = makeStream([makeTrack({ label: `mic-${activeStreams.length}` })])
      activeStreams.push(stream)
      return stream
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
  })

  afterEach(() => {
    coordinator.__resetForTests()
    activeStreams = []
  })

  it('survives 100 acquire/release cycles without leaking owner state', async () => {
    for (let i = 0; i < 100; i++) {
      const owner = i % 2 === 0 ? 'keep_alive' : 'pcm'
      await coordinator.acquire({ owner, maxAttempts: 1, acquireTimeoutMs: 5_000 })
      expect(coordinator.getCoordinatorState()).toBe('active')
      coordinator.release(owner)
      expect(coordinator.getCoordinatorState()).toBe('idle')
    }
    expect(coordinator.hasActiveCapture()).toBe(false)
    expect(getUserMedia).toHaveBeenCalledTimes(100)
  })

  it('survives 100 rapid owner handoffs without deadlock', async () => {
    const owners = ['keep_alive', 'pcm', 'debug_meter', 'settings_test'] as const
    for (let i = 0; i < 100; i++) {
      const owner = owners[i % owners.length]!
      await coordinator.acquire({ owner, maxAttempts: 1 })
      if (i % 3 === 0) coordinator.forceRelease('stress')
      else coordinator.release(owner)
    }
    expect(coordinator.getCoordinatorState()).toBe('idle')
  })

  it('coalesces 50 parallel acquires into one getUserMedia', async () => {
    let resolve!: (s: MediaStream) => void
    getUserMedia.mockReturnValueOnce(
      new Promise<MediaStream>((r) => {
        resolve = r
      }),
    )
    const pending = Array.from({ length: 50 }, () => coordinator.acquire({ owner: 'pcm' }))
    resolve(makeStream())
    const streams = await Promise.all(pending)
    expect(new Set(streams).size).toBe(1)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })
})
