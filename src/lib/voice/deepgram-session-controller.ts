'use client'

import { StreamingSTT, type TranscriptChunk } from '@/lib/voice/stt-client'
import {
  fetchSTTTokenWithRetry,
  is429Error,
  releaseSTTSession,
  STTTokenError,
  tokenErrorMessage,
  type STTTokenResponse,
} from '@/lib/voice/stt-token'
import {
  DeepgramCircuitBreaker,
  computeBackoffMs,
  sleepMs,
} from '@/lib/voice/deepgram-circuit-breaker'
import {
  VoiceHealthMonitor,
  installVoiceHealthDebug,
  type VoiceConnectionState,
  type VoiceHealthSnapshot,
} from '@/lib/voice/deepgram-health'
import {
  trackDeepgramEvent,
  logVoiceHealthSnapshot,
  type DeepgramTelemetryContext,
} from '@/lib/voice/deepgram-telemetry'

type TrackFn = (
  type: 'VOICE' | 'RECOVERY',
  event: string,
  data?: Record<string, unknown>,
  options?: { critical?: boolean; level?: 'info' | 'warn' | 'error' },
) => void

export interface DeepgramSessionCallbacks {
  onPartial: (chunk: TranscriptChunk) => void
  onFinal: (text: string) => void
  onWsOpen: () => void
  onRefreshRestart: () => void
  onUiState: (state: VoiceConnectionState, message: string | null) => void
  onFatalError: (message: string, opts: { canRetryVoice: boolean; canSwitchToText: boolean }) => void
  onQuotaFallback?: (message: string) => void
  isMounted: () => boolean
  startMic: (sendAudio: (data: ArrayBuffer) => void) => Promise<() => void>
  stopMic: () => void
  releaseAudio: () => Promise<void>
}

export interface DeepgramSessionStopOptions {
  releaseQuota?: boolean
  beacon?: boolean
}

export interface DeepgramSessionStartOptions {
  preserveTranscript?: boolean
  isRefresh?: boolean
  /**
   * Reuse an existing server lease across question boundaries (submit tears
   * down the WS/mic but keeps the lease). Avoids burning a new-mint rate-limit
   * slot on every turn.
   */
  refreshLeaseId?: string
  /**
   * Mid-answer expiry refresh must mint a new Deepgram key even if a
   * still-valid prefetch residue sits in the client cache.
   */
  forceNewKey?: boolean
}

const MAX_TOKEN_ATTEMPTS = 4
const MAX_CONNECT_RETRIES = 3
// stt.start() resolving only means connect() returned a socket object — NOT that
// Deepgram actually authenticated/opened the connection (browsers can't set
// WebSocket auth headers; see stt-client.ts). Bound how long we wait for the real
// 'open' event so a silently-failed handshake surfaces as a retry/fallback instead
// of leaving the UI on "Connecting microphone…" indefinitely.
const WS_OPEN_TIMEOUT_MS = 8_000

export class DeepgramSessionController {
  private stt: StreamingSTT | null = null
  private micCleanup: (() => void) | null = null
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private startInFlight = false
  private sessionLeaseId: string | null = null
  private pageHideHandler: (() => void) | null = null
  private readonly breaker = new DeepgramCircuitBreaker()
  private readonly health = new VoiceHealthMonitor()

  constructor(
    private readonly interviewId: string,
    private readonly telemetryCtx: DeepgramTelemetryContext,
    private readonly track: TrackFn,
    private readonly callbacks: DeepgramSessionCallbacks,
  ) {
    if (typeof window !== 'undefined') {
      installVoiceHealthDebug(() => this.getHealth())
    }
  }

  getHealth(): VoiceHealthSnapshot {
    const snap = this.health.snapshot(this.breaker.getState())
    logVoiceHealthSnapshot(snap as unknown as Record<string, unknown>)
    return snap
  }

  isActive(): boolean {
    return this.stt != null || this.micCleanup != null
  }

  getSessionLeaseId(): string | null {
    return this.sessionLeaseId
  }

  installPageHideRelease(): void {
    if (typeof window === 'undefined' || this.pageHideHandler) return
    this.pageHideHandler = () => {
      this.stop({ releaseQuota: true, beacon: true })
    }
    window.addEventListener('pagehide', this.pageHideHandler)
  }

  private removePageHideRelease(): void {
    if (typeof window === 'undefined' || !this.pageHideHandler) return
    window.removeEventListener('pagehide', this.pageHideHandler)
    this.pageHideHandler = null
  }

  private releaseQuotaLease(opts?: { beacon?: boolean }, preCapturedDurationMs?: number | null): void {
    const leaseId = this.sessionLeaseId
    if (!leaseId) return

    const durationMs =
      preCapturedDurationMs !== undefined ? preCapturedDurationMs : this.getHealth().session_duration_ms
    const durationSeconds =
      durationMs != null && durationMs > 0 ? Math.ceil(durationMs / 1000) : undefined

    releaseSTTSession(this.interviewId, leaseId, durationSeconds, { beacon: opts?.beacon })
    this.sessionLeaseId = null
    trackDeepgramEvent('voice_session_released', this.telemetryCtx, this.track, {
      duration_seconds: durationSeconds ?? null,
      beacon: Boolean(opts?.beacon),
    })
  }

  /**
   * Host unmounted — tear down transport and release any acquired lease.
   * Idempotent: releaseQuotaLease no-ops when lease already cleared.
   */
  private stopIfUnmounted(): boolean {
    if (!this.callbacks.isMounted()) {
      this.stop({ releaseQuota: true })
      return true
    }
    return false
  }

  /**
   * After an async boundary in connectWithRetry.
   * - Unmounted → full stop + lease release.
   * - Superseded attempt (stt !== this.stt) → exit without release; active start owns lease.
   */
  private abortConnectAttempt(stt: StreamingSTT, micCleanup?: (() => void) | null): boolean {
    if (micCleanup) {
      try {
        micCleanup()
      } catch {
        /* */
      }
    }
    if (!this.callbacks.isMounted()) {
      this.stop({ releaseQuota: true })
      return true
    }
    if (this.stt !== stt) {
      return true
    }
    return false
  }

  stop(opts?: DeepgramSessionStopOptions): void {
    const releaseQuota = opts?.releaseQuota !== false
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    this.startInFlight = false
    this.callbacks.onUiState('idle', null)
    const stt = this.stt
    this.stt = null
    if (stt) {
      try {
        stt.stop()
      } catch {
        /* */
      }
    }
    const micCleanup = this.micCleanup
    this.micCleanup = null
    if (micCleanup) {
      try {
        micCleanup()
      } catch {
        /* */
      }
    }
    this.callbacks.stopMic()
    const duration = this.getHealth().session_duration_ms
    if (duration != null && duration > 2000) {
      trackDeepgramEvent('voice_session_completed', this.telemetryCtx, this.track, {
        duration_ms: duration,
      })
    }

    if (releaseQuota) {
      this.releaseQuotaLease({ beacon: opts?.beacon }, duration)
      this.removePageHideRelease()
    }

    this.health.markSessionEnded()
    this.health.setConnectionState('idle', null)
  }

  scheduleTokenRefresh(expiresInSeconds: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    const refreshMs = Math.max(30_000, (expiresInSeconds - 25) * 1000)
    this.refreshTimer = setTimeout(() => {
      this.health.incrementRefresh()
      trackDeepgramEvent('deepgram_refresh_attempt', this.telemetryCtx, this.track, {
        refresh_ms: refreshMs,
      })
      this.stop({ releaseQuota: false })
      this.callbacks.onRefreshRestart()
    }, refreshMs)
  }

  async start(opts?: DeepgramSessionStartOptions): Promise<void> {
    if (!this.callbacks.isMounted()) return
    if (this.startInFlight) return

    const gate = this.breaker.canRequestToken()
    if (!gate.allowed) {
      const msg =
        gate.reason === 'circuit_open'
          ? 'Voice service paused after repeated errors. Wait a moment, then tap Retry Voice.'
          : 'Voice service is cooling down. Please wait…'
      this.health.setConnectionState('circuit_open', msg)
      this.callbacks.onUiState('circuit_open', msg)
      this.callbacks.onFatalError(msg, { canRetryVoice: true, canSwitchToText: true })
      trackDeepgramEvent('voice_session_abandoned', this.telemetryCtx, this.track, {
        reason: gate.reason,
        wait_ms: gate.waitMs,
      })
      return
    }

    if (this.stt || this.micCleanup) {
      this.stop({ releaseQuota: false })
    }

    this.startInFlight = true
    if (opts?.refreshLeaseId) {
      this.sessionLeaseId = opts.refreshLeaseId
    }
    const isRefresh = Boolean(opts?.isRefresh || opts?.refreshLeaseId)
    const uiState: VoiceConnectionState = isRefresh ? 'reconnecting' : 'connecting'
    this.callbacks.onUiState(
      uiState,
      isRefresh ? 'Reconnecting voice channel…' : 'Connecting voice channel…',
    )
    this.health.setConnectionState(uiState, null)

    try {
      const tokenMeta = await this.fetchToken(isRefresh, Boolean(opts?.forceNewKey))
      if (this.stopIfUnmounted()) return

      const stt = new StreamingSTT(tokenMeta.token)
      this.stt = stt

      trackDeepgramEvent('deepgram_connect_attempt', this.telemetryCtx, this.track)
      await this.connectWithRetry(stt, tokenMeta, isRefresh)
      if (this.stopIfUnmounted()) return
    } catch (err) {
      this.handleStartFailure(err, isRefresh)
    } finally {
      this.startInFlight = false
    }
  }

  private async fetchToken(isRefresh: boolean, forceNewKey = false): Promise<STTTokenResponse> {
    const event = isRefresh ? 'deepgram_refresh_attempt' : 'deepgram_token_requested'
    trackDeepgramEvent(event, this.telemetryCtx, this.track)

    this.breaker.recordTokenRequest()
    let attempt = 0

    const data = await fetchSTTTokenWithRetry(this.interviewId, {
      maxAttempts: MAX_TOKEN_ATTEMPTS,
      refreshLeaseId: isRefresh ? this.sessionLeaseId ?? undefined : undefined,
      bypassCache: forceNewKey,
      onRetry: (retryNum, waitMs, error) => {
        attempt = retryNum
        if (error.fallback === 'text_mode') return
        if (error.isRateLimit) {
          trackDeepgramEvent('deepgram_429_received', this.telemetryCtx, this.track, {
            attempt: retryNum,
            wait_ms: waitMs,
            retry_after: error.retryAfterSeconds,
          })
        }
        this.health.setConnectionState('retrying', 'Voice service is temporarily busy. Retrying automatically…')
        this.callbacks.onUiState(
          'retrying',
          'Voice service is temporarily busy. Retrying automatically…',
        )
      },
    })

    const expiry = new Date(
      Date.parse(data.issued_at) + data.expires_in_seconds * 1000,
    ).toISOString()
    this.health.setTokenExpiry(expiry)

    if (data.session_lease_id) {
      this.sessionLeaseId = data.session_lease_id
      if (!isRefresh) {
        this.installPageHideRelease()
      }
    }

    trackDeepgramEvent(
      isRefresh ? 'deepgram_refresh_success' : 'deepgram_token_success',
      this.telemetryCtx,
      this.track,
      { expires_in_seconds: data.expires_in_seconds, attempts: attempt + 1 },
    )
    this.breaker.recordSuccess()
    return data
  }

  private async connectWithRetry(
    stt: StreamingSTT,
    tokenMeta: STTTokenResponse,
    isRefresh: boolean,
  ): Promise<void> {
    let lastErr: Error | null = null

    for (let attempt = 0; attempt < MAX_CONNECT_RETRIES; attempt++) {
      if (this.stopIfUnmounted()) return
      if (this.stt !== stt) return

      try {
        let resolveOpened: (() => void) | null = null
        let rejectOpened: ((err: Error) => void) | null = null
        const opened = new Promise<void>((resolve, reject) => {
          resolveOpened = resolve
          rejectOpened = reject
        })

        await stt.start({
          onOpen: () => {
            // Release the open-race FIRST, unconditionally. Resolving a local
            // promise has no side effects; gating it behind isMounted/
            // supersession checks silently swallowed genuine opens — the
            // attempt then died on the open-timeout with zero error events.
            // abortConnectAttempt below still decides whether this attempt
            // proceeds to mic capture.
            resolveOpened?.()
            if (!this.callbacks.isMounted() || this.stt !== stt) return
            trackDeepgramEvent('deepgram_connect_success', this.telemetryCtx, this.track, {
              attempt: attempt + 1,
            })
            this.health.setConnectionState('connected', null)
            this.callbacks.onUiState('connected', null)
            this.callbacks.onWsOpen()
          },
          onPartial: (chunk) => {
            if (!this.callbacks.isMounted()) return
            this.callbacks.onPartial(chunk)
          },
          onFinal: (text) => {
            if (!this.callbacks.isMounted()) return
            this.callbacks.onFinal(text)
          },
          onError: (err) => {
            this.handleWsError(err, stt)
            rejectOpened?.(err)
          },
          onClose: (info) => {
            trackDeepgramEvent('deepgram_ws_closed', this.telemetryCtx, this.track, info)
            // While the open-race is still pending, a close means the
            // handshake failed (auth rejected, server dropped) — fail this
            // attempt immediately instead of waiting out the open-timeout.
            // No-op once `opened` has already settled.
            rejectOpened?.(
              new Error(`Voice connection closed before opening (code ${info.code ?? 'unknown'}).`),
            )
          },
        })

        if (this.abortConnectAttempt(stt)) return

        // Wait for the real 'open' event (bounded) before trusting this attempt —
        // do not let a silently-unauthenticated socket look like a success.
        let openTimeoutId: ReturnType<typeof setTimeout> | undefined
        const openTimedOut = new Promise<never>((_, reject) => {
          openTimeoutId = setTimeout(
            () => reject(new Error('Voice connection timed out waiting to open.')),
            WS_OPEN_TIMEOUT_MS,
          )
        })
        try {
          await Promise.race([opened, openTimedOut])
        } finally {
          clearTimeout(openTimeoutId)
        }

        if (this.abortConnectAttempt(stt)) return

        await this.callbacks.releaseAudio()
        const cleanup = await this.callbacks.startMic((data) => stt.sendAudio(data))
        // Store BEFORE the abort check so stop() can run the cleanup if the
        // component unmounted or was superseded between startMic and here.
        // Previously passing cleanup to abortConnectAttempt ran micCleanup()
        // unconditionally (before the isMounted/supersession guards), causing
        // the mic to stop immediately after starting → Deepgram 1011 "no audio".
        this.micCleanup = cleanup

        if (this.abortConnectAttempt(stt)) return
        this.health.markSessionStarted()
        trackDeepgramEvent('voice_session_started', this.telemetryCtx, this.track, {
          is_refresh: isRefresh,
        })
        this.scheduleTokenRefresh(tokenMeta.expires_in_seconds)
        return
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err))
        if (attempt < MAX_CONNECT_RETRIES - 1) {
          const waitMs = computeBackoffMs(attempt)
          this.health.incrementReconnect()
          this.health.setConnectionState('retrying', 'Reconnecting voice channel…')
          this.callbacks.onUiState('retrying', 'Reconnecting voice channel…')
          await sleepMs(waitMs)
          if (this.stopIfUnmounted()) return
          if (this.stt !== stt) return
        }
      }
    }

    throw lastErr ?? new Error('Could not open voice connection.')
  }

  private handleWsError(err: Error, stt: StreamingSTT): void {
    if (this.stt !== stt) return
    const is429 = /429|rate.?limit|too many/i.test(err.message)
    if (is429) {
      trackDeepgramEvent('deepgram_429_received', this.telemetryCtx, this.track, {
        source: 'websocket',
        error: err.message,
      })
    }
    trackDeepgramEvent('deepgram_ws_error', this.telemetryCtx, this.track, { error: err.message })
    trackDeepgramEvent('deepgram_connect_failure', this.telemetryCtx, this.track, {
      error: err.message,
    })
    this.breaker.recordFailure(err.message)
    this.health.setLastError(err.message)
    this.stop()
    this.callbacks.onFatalError(
      is429
        ? 'Voice service is temporarily busy. Tap Retry Voice or switch to typing.'
        : err.message,
      { canRetryVoice: true, canSwitchToText: true },
    )
  }

  private handleStartFailure(err: unknown, isRefresh: boolean): void {
    const message = tokenErrorMessage(err)
    this.breaker.recordFailure(message)
    this.health.setLastError(message)

    if (is429Error(err)) {
      trackDeepgramEvent('deepgram_429_received', this.telemetryCtx, this.track, {
        source: 'token',
        error: message,
      })
    }

    trackDeepgramEvent(
      isRefresh ? 'deepgram_refresh_failure' : 'deepgram_token_failure',
      this.telemetryCtx,
      this.track,
      {
        error: message,
        status: err instanceof STTTokenError ? err.status : undefined,
        fallback: err instanceof STTTokenError ? err.fallback : undefined,
      },
    )

    trackDeepgramEvent('voice_session_abandoned', this.telemetryCtx, this.track, {
      error: message,
    })

    const fallbackText =
      err instanceof STTTokenError && err.fallback === 'text_mode'
    this.health.setConnectionState('unavailable', message)
    this.callbacks.onUiState('unavailable', message)
    if (fallbackText) {
      this.callbacks.onQuotaFallback?.(message)
    }
    this.callbacks.onFatalError(message, {
      canRetryVoice: !fallbackText,
      canSwitchToText: true,
    })
    this.stop()
  }
}
