'use client'

/**
 * Browser microphone permission lifecycle monitor.
 * Uses Permissions API where supported; falls back to focus/visibility re-query.
 */
import { micFlowLog } from '@/lib/voice/lifecycle-log'
import { emitMicPipelineTelemetry } from '@/lib/voice/mic-pipeline-telemetry'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'

export type MicPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'

export type MicPermissionTransition =
  | 'initial'
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'revoked'
  | 'restored'

export interface MicPermissionListener {
  (state: MicPermissionState, transition: MicPermissionTransition): void
}

type PermissionStatusLike = PermissionStatus & {
  onchange: (() => void) | null
}

let permissionStatus: PermissionStatusLike | null = null
let currentState: MicPermissionState = 'unknown'
let subscriberCount = 0
const listeners = new Set<MicPermissionListener>()
let telemetryCtx: InterviewTelemetryContext | null = null
let fallbackBound = false

function normalizeState(state: string): MicPermissionState {
  if (state === 'granted' || state === 'prompt' || state === 'denied') return state
  return 'unknown'
}

function classifyTransition(
  prev: MicPermissionState,
  next: MicPermissionState,
): MicPermissionTransition {
  if (prev === 'unknown') return 'initial'
  if (prev === 'granted' && next === 'denied') return 'revoked'
  if (prev === 'denied' && next === 'granted') return 'restored'
  if (prev === 'prompt' && next === 'granted') return 'granted'
  if (prev === 'granted' && next === 'prompt') return 'prompt'
  if (next === 'denied') return 'denied'
  if (next === 'granted') return 'granted'
  return 'prompt'
}

function notifyListeners(transition: MicPermissionTransition): void {
  for (const listener of listeners) {
    try {
      listener(currentState, transition)
    } catch {
      /* listener must not break monitor */
    }
  }
}

function emitPermissionTelemetry(
  event:
    | 'mic_permission_granted'
    | 'mic_permission_denied'
    | 'mic_permission_revoked',
  transition: MicPermissionTransition,
): void {
  if (!telemetryCtx) return
  emitMicPipelineTelemetry(event, telemetryCtx, {
    permission_state: currentState,
    transition,
  })
}

function applyState(next: MicPermissionState, source: string): void {
  const prev = currentState
  if (prev === next) return
  currentState = next
  const transition = classifyTransition(prev, next)
  micFlowLog('mic_permission_changed', {
    prev,
    next,
    transition,
    source,
  })
  if (transition === 'revoked' || (prev === 'granted' && next === 'denied')) {
    emitPermissionTelemetry('mic_permission_revoked', transition)
  } else if (next === 'granted') {
    emitPermissionTelemetry('mic_permission_granted', transition)
  } else if (next === 'denied') {
    emitPermissionTelemetry('mic_permission_denied', transition)
  }
  notifyListeners(transition)
}

async function queryPermission(source: string): Promise<MicPermissionState> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return currentState
  }
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    permissionStatus = status as PermissionStatusLike
    if (!permissionStatus.onchange) {
      permissionStatus.onchange = () => {
        applyState(normalizeState(permissionStatus!.state), 'permission_onchange')
      }
    }
    const next = normalizeState(status.state)
    applyState(next, source)
    return next
  } catch {
    micFlowLog('mic_permission_query_unsupported', { source })
    return currentState
  }
}

function bindFallbackListeners(): void {
  if (fallbackBound || typeof document === 'undefined') return
  fallbackBound = true
  const recheck = () => {
    void queryPermission('fallback_recheck')
  }
  document.addEventListener('visibilitychange', recheck)
  window.addEventListener('focus', recheck)
}

export const micPermissionMonitor = {
  getState(): MicPermissionState {
    return currentState
  },

  async refresh(source = 'manual'): Promise<MicPermissionState> {
    return queryPermission(source)
  },

  /**
   * Subscribe to permission transitions. Starts monitoring on first subscriber.
   */
  subscribe(
    listener: MicPermissionListener,
    ctx?: InterviewTelemetryContext,
  ): () => void {
    listeners.add(listener)
    subscriberCount += 1
    if (ctx) telemetryCtx = ctx

    if (subscriberCount === 1) {
      bindFallbackListeners()
      void queryPermission('subscribe')
    } else {
      listener(currentState, 'initial')
    }

    return () => {
      listeners.delete(listener)
      subscriberCount = Math.max(0, subscriberCount - 1)
      if (subscriberCount === 0) {
        telemetryCtx = null
        if (permissionStatus) {
          permissionStatus.onchange = null
        }
        permissionStatus = null
      }
    }
  },

  /** @internal */
  __resetForTests(): void {
    listeners.clear()
    subscriberCount = 0
    permissionStatus = null
    currentState = 'unknown'
    telemetryCtx = null
    fallbackBound = false
  },
}
