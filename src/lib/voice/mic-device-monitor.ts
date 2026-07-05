'use client'

/**
 * Monitors input device changes (Bluetooth disconnect, default mic switch, etc.).
 */
import { micFlowLog } from '@/lib/voice/lifecycle-log'
import { emitMicPipelineTelemetry } from '@/lib/voice/mic-pipeline-telemetry'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import { micCaptureCoordinator } from '@/lib/voice/mic-capture-coordinator'

export interface MicDeviceMonitorCallbacks {
  onDeviceInvalid: (reason: 'track_ended' | 'no_live_tracks' | 'device_removed') => void
  onDeviceRecovered?: () => void
}

let subscriberCount = 0
let callbacks: MicDeviceMonitorCallbacks | null = null
let telemetryCtx: InterviewTelemetryContext | null = null
let deviceChangeHandler: (() => void) | null = null
let lastDeviceLabels: string[] = []

export function isCaptureStreamValid(stream: MediaStream | null): boolean {
  if (!stream) return false
  const audioTracks = stream.getAudioTracks()
  return audioTracks.length > 0 && audioTracks.some((track) => track.readyState === 'live')
}

async function snapshotInputDeviceLabels(): Promise<string[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return []
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === 'audioinput')
      .map((d) => d.label || d.deviceId)
  } catch {
    return []
  }
}

async function handleDeviceChange(): Promise<void> {
  const labels = await snapshotInputDeviceLabels()
  const labelsChanged =
    labels.length !== lastDeviceLabels.length ||
    labels.some((label, i) => label !== lastDeviceLabels[i])
  lastDeviceLabels = labels

  const snap = micCaptureCoordinator.getSnapshot()
  const streamValid = snap.tracks.some((t) => t.readyState === 'live')

  micFlowLog('device_changed', {
    device_count: labels.length,
    labels,
    coordinator_owner: snap.owner,
    stream_valid: streamValid,
    tracks: snap.tracks,
  })

  if (telemetryCtx) {
    emitMicPipelineTelemetry('device_changed', telemetryCtx, {
      device_count: labels.length,
      coordinator_owner: snap.owner,
      stream_valid: streamValid,
      track_ready_states: snap.tracks.map((t) => t.readyState),
    })
  }

  if (!callbacks) return

  if (snap.owner && !streamValid) {
    callbacks.onDeviceInvalid(
      snap.tracks.every((t) => t.readyState === 'ended') ? 'track_ended' : 'no_live_tracks',
    )
    return
  }

  if (labelsChanged && streamValid) {
    if (telemetryCtx) {
      emitMicPipelineTelemetry('device_recovered', telemetryCtx, {
        device_count: labels.length,
      })
    }
    callbacks.onDeviceRecovered?.()
  }
}

export const micDeviceMonitor = {
  start(ctx: InterviewTelemetryContext, cbs: MicDeviceMonitorCallbacks): () => void {
    callbacks = cbs
    telemetryCtx = ctx
    subscriberCount += 1

    if (subscriberCount === 1 && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      deviceChangeHandler = () => {
        void handleDeviceChange()
      }
      navigator.mediaDevices.addEventListener('devicechange', deviceChangeHandler)
      void snapshotInputDeviceLabels().then((labels) => {
        lastDeviceLabels = labels
      })
    }

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1)
      if (subscriberCount === 0) {
        if (deviceChangeHandler && navigator.mediaDevices) {
          navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandler)
        }
        deviceChangeHandler = null
        callbacks = null
        telemetryCtx = null
        lastDeviceLabels = []
      }
    }
  },

  /** @internal */
  __resetForTests(): void {
    if (deviceChangeHandler && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', deviceChangeHandler)
    }
    deviceChangeHandler = null
    callbacks = null
    telemetryCtx = null
    subscriberCount = 0
    lastDeviceLabels = []
  },

  /** @internal — invoke devicechange handler in tests */
  async __simulateDeviceChangeForTests(): Promise<void> {
    await handleDeviceChange()
  },
}
