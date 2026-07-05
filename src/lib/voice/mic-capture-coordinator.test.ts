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

describe('MicCaptureCoordinator', () => {
  let coordinator: MicCaptureCoordinator
  let getUserMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    coordinator = new MicCaptureCoordinator()
    getUserMedia = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: getUserMedia },
    })
  })

  afterEach(() => {
    coordinator.__resetForTests()
  })

  it('reuses a live stream for the same owner', async () => {
    const stream = makeStream()
    getUserMedia.mockResolvedValueOnce(stream)

    const first = await coordinator.acquire({ owner: 'keep_alive' })
    const second = await coordinator.acquire({ owner: 'keep_alive' })

    expect(first).toBe(stream)
    expect(second).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('releases another owner before acquiring a new stream', async () => {
    const keepAlive = makeStream()
    const pcm = makeStream([makeTrack({ label: 'PCM Mic' })])
    getUserMedia.mockResolvedValueOnce(keepAlive).mockResolvedValueOnce(pcm)

    await coordinator.acquire({ owner: 'keep_alive' })
    expect(coordinator.isOwnerActive('keep_alive')).toBe(true)

    const acquired = await coordinator.acquire({ owner: 'pcm' })
    expect(acquired).toBe(pcm)
    expect(coordinator.isOwnerActive('pcm')).toBe(true)
    expect(coordinator.isOwnerActive('keep_alive')).toBe(false)
    expect(keepAlive.getTracks()[0].stop).toHaveBeenCalled()
  })

  it('coalesces concurrent acquire calls for the same owner', async () => {
    const stream = makeStream()
    let resolveStream!: (s: MediaStream) => void
    getUserMedia.mockReturnValueOnce(
      new Promise<MediaStream>((resolve) => {
        resolveStream = resolve
      }),
    )

    const p1 = coordinator.acquire({ owner: 'pcm' })
    const p2 = coordinator.acquire({ owner: 'pcm' })
    resolveStream(stream)

    const [a, b] = await Promise.all([p1, p2])
    expect(a).toBe(stream)
    expect(b).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('retries NotReadableError with backoff', async () => {
    const stream = makeStream()
    getUserMedia
      .mockRejectedValueOnce(new DOMException('Device busy', 'NotReadableError'))
      .mockResolvedValueOnce(stream)

    vi.useFakeTimers()
    const acquirePromise = coordinator.acquire({ owner: 'pcm', maxAttempts: 3 })
    await vi.advanceTimersByTimeAsync(250)
    const result = await acquirePromise
    vi.useRealTimers()

    expect(result).toBe(stream)
    expect(getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('invokes onCaptureLost when a track ends', async () => {
    const track = makeTrack()
    const stream = makeStream([track])
    getUserMedia.mockResolvedValueOnce(stream)
    const onCaptureLost = vi.fn()

    await coordinator.acquire({ owner: 'pcm', onCaptureLost })

    const endedHandler = (track.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
      ([event]) => event === 'ended',
    )?.[1] as () => void
    expect(endedHandler).toBeTypeOf('function')
    endedHandler()

    expect(onCaptureLost).toHaveBeenCalledWith('track_ended')
    expect(coordinator.hasActiveCapture()).toBe(false)
  })
})
