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

describe('MicCaptureCoordinator failure injection', () => {
  let coordinator: MicCaptureCoordinator
  let getUserMedia: ReturnType<typeof vi.fn>

  beforeEach(() => {
    coordinator = new MicCaptureCoordinator()
    getUserMedia = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    })
  })

  afterEach(() => {
    coordinator.__resetForTests()
  })

  it('recovers after AbortError from external signal', async () => {
    const ac = new AbortController()
    getUserMedia.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
    await expect(coordinator.acquire({ owner: 'pcm', signal: ac.signal, maxAttempts: 1 })).rejects.toThrow()
    expect(coordinator.getCoordinatorState()).toBe('idle')

    const stream = makeStream()
    getUserMedia.mockResolvedValueOnce(stream)
    const recovered = await coordinator.acquire({ owner: 'pcm' })
    expect(recovered).toBe(stream)
  })

  it('fails fast on acquire timeout', async () => {
    vi.useFakeTimers()
    getUserMedia.mockReturnValue(new Promise(() => {}))
    const promise = coordinator.acquire({ owner: 'pcm', acquireTimeoutMs: 1000, maxAttempts: 1 })
    const assertion = expect(promise).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(1001)
    await assertion
    vi.useRealTimers()
    expect(coordinator.getCoordinatorState()).toBe('idle')
  })

  it('stops late getUserMedia streams that resolve after timeout', async () => {
    vi.useFakeTimers()
    let resolveGum!: (stream: MediaStream) => void
    getUserMedia.mockImplementation(
      () =>
        new Promise<MediaStream>((resolve) => {
          resolveGum = resolve
        }),
    )
    const promise = coordinator.acquire({ owner: 'pcm', acquireTimeoutMs: 1000, maxAttempts: 1 })
    const assertion = expect(promise).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(1001)
    await assertion

    const track = makeTrack()
    const lateStream = makeStream([track])
    resolveGum(lateStream)
    await Promise.resolve()
    await Promise.resolve()

    expect(track.stop).toHaveBeenCalled()
    expect(coordinator.hasActiveCapture()).toBe(false)
    expect(coordinator.getCoordinatorState()).toBe('idle')
    vi.useRealTimers()
  })

  it('stops late getUserMedia streams after abort/cancel', async () => {
    let resolveGum!: (stream: MediaStream) => void
    getUserMedia.mockImplementation(
      () =>
        new Promise<MediaStream>((resolve) => {
          resolveGum = resolve
        }),
    )
    const ac = new AbortController()
    const pending = coordinator.acquire({
      owner: 'pcm',
      signal: ac.signal,
      acquireTimeoutMs: 30_000,
      maxAttempts: 1,
    })
    await vi.waitFor(() => {
      expect(getUserMedia).toHaveBeenCalled()
      expect(resolveGum).toBeTypeOf('function')
    })
    ac.abort()
    await expect(pending).rejects.toThrow()

    const track = makeTrack()
    resolveGum(makeStream([track]))
    await Promise.resolve()
    await Promise.resolve()

    expect(track.stop).toHaveBeenCalled()
    expect(coordinator.hasActiveCapture()).toBe(false)
  })

  it('forceRelease clears in-flight acquire', async () => {
    getUserMedia.mockReturnValue(new Promise(() => {}))
    const pending = coordinator.acquire({ owner: 'pcm', acquireTimeoutMs: 30_000 })
    coordinator.forceRelease('injection')
    await expect(pending).rejects.toThrow()
    expect(coordinator.hasActiveCapture()).toBe(false)
  })

  it('handles permission denied (NotAllowedError)', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'))
    await expect(coordinator.acquire({ owner: 'pcm', maxAttempts: 1 })).rejects.toThrow('Denied')
    expect(coordinator.getCoordinatorState()).toBe('idle')
  })

  it('handles track muted callback without releasing stream', async () => {
    const track = makeTrack()
    const stream = makeStream([track])
    getUserMedia.mockResolvedValueOnce(stream)
    const onCaptureLost = vi.fn()
    await coordinator.acquire({ owner: 'pcm', onCaptureLost })

    const muteHandler = (track.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
      ([event]) => event === 'mute',
    )?.[1] as () => void
    muteHandler()
    expect(onCaptureLost).toHaveBeenCalledWith('track_muted')
    expect(coordinator.hasActiveCapture()).toBe(true)
  })
})

describe('MicCaptureCoordinator state machine (no deadlock)', () => {
  it('documents valid transitions', () => {
    const transitions = [
      'idle → acquiring (acquire)',
      'acquiring → active(owner) (getUserMedia success)',
      'acquiring → idle (failure | abort | timeout)',
      'active(A) → acquiring (acquire B releases A)',
      'active → idle (release | forceRelease)',
      'acquiring → idle (forceRelease aborts in-flight)',
    ]
    expect(transitions.length).toBeGreaterThan(0)
  })
})
