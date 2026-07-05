import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { micDeviceMonitor } from '@/lib/voice/mic-device-monitor'
import { micCaptureCoordinator } from '@/lib/voice/mic-capture-coordinator'

function makeTrack(readyState: MediaStreamTrackState = 'live'): MediaStreamTrack {
  return {
    label: 'BT Headset',
    readyState,
    muted: false,
    enabled: true,
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as MediaStreamTrack
}

function makeStream(track: MediaStreamTrack): MediaStream {
  return {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream
}

describe('micDeviceMonitor', () => {
  beforeEach(() => {
    micCaptureCoordinator.__resetForTests()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'audioinput', deviceId: '1', label: 'Headset', groupId: 'g' } as MediaDeviceInfo,
        ]),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    })
  })

  afterEach(() => {
    micDeviceMonitor.__resetForTests()
    micCaptureCoordinator.__resetForTests()
    vi.restoreAllMocks()
  })

  it('invokes onDeviceInvalid when active capture has no live tracks', async () => {
    const track = makeTrack('live')
    const stream = makeStream(track)
    ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockResolvedValueOnce(stream)

    const onDeviceInvalid = vi.fn()
    const ctx = { interviewId: 'i1', questionIndex: 0, phase: 'candidate_answering' }

    await micCaptureCoordinator.acquire({ owner: 'pcm', maxAttempts: 1 })
    track.readyState = 'ended'

    micDeviceMonitor.start(ctx, { onDeviceInvalid })
    await micDeviceMonitor.__simulateDeviceChangeForTests()
    expect(onDeviceInvalid).toHaveBeenCalledWith('track_ended')
  })
})
