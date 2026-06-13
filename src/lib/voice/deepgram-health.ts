/**
 * Live voice health snapshot for debugging and support.
 * Exposed via window.__VOICE_HEALTH__ when installed.
 */
import type { DeepgramCircuitBreakerState } from '@/lib/voice/deepgram-circuit-breaker'

export type VoiceConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'retrying'
  | 'rate_limited'
  | 'unavailable'
  | 'circuit_open'

export interface VoiceHealthSnapshot {
  provider: 'deepgram'
  connection_state: VoiceConnectionState
  token_expiry: string | null
  reconnect_count: number
  refresh_count: number
  last_error: string | null
  session_duration_ms: number | null
  circuit_breaker: DeepgramCircuitBreakerState
  ui_message: string | null
}

export class VoiceHealthMonitor {
  private connectionState: VoiceConnectionState = 'idle'
  private tokenExpiry: string | null = null
  private reconnectCount = 0
  private refreshCount = 0
  private lastError: string | null = null
  private sessionStartedAt: number | null = null
  private uiMessage: string | null = null

  setConnectionState(state: VoiceConnectionState, message?: string | null): void {
    this.connectionState = state
    if (message !== undefined) this.uiMessage = message
  }

  setTokenExpiry(iso: string | null): void {
    this.tokenExpiry = iso
  }

  incrementReconnect(): void {
    this.reconnectCount += 1
  }

  incrementRefresh(): void {
    this.refreshCount += 1
  }

  setLastError(error: string | null): void {
    this.lastError = error
  }

  markSessionStarted(): void {
    this.sessionStartedAt = Date.now()
  }

  markSessionEnded(): void {
    this.sessionStartedAt = null
  }

  snapshot(circuit: DeepgramCircuitBreakerState): VoiceHealthSnapshot {
    return {
      provider: 'deepgram',
      connection_state: this.connectionState,
      token_expiry: this.tokenExpiry,
      reconnect_count: this.reconnectCount,
      refresh_count: this.refreshCount,
      last_error: this.lastError,
      session_duration_ms:
        this.sessionStartedAt != null ? Date.now() - this.sessionStartedAt : null,
      circuit_breaker: circuit,
      ui_message: this.uiMessage,
    }
  }
}

export function installVoiceHealthDebug(getSnapshot: () => VoiceHealthSnapshot): void {
  if (typeof window === 'undefined') return
  ;(window as Window & { __VOICE_HEALTH__?: () => VoiceHealthSnapshot }).__VOICE_HEALTH__ =
    getSnapshot
}
