'use client'

/**
 * Production STT transport: Deepgram Nova-3 over WebSocket.
 *
 * Consolidates the connection concerns previously in
 * `deepgram-session-controller.ts` — token fetch (with retry + circuit
 * breaker), the streaming socket, transparent token refresh, and server
 * lease release — behind the engine-agnostic `SttTransport` interface.
 *
 * Crucially, this transport does NOT own the microphone. PCM frames are fed in
 * via `sendAudio()` by the SttPipeline, whose frames originate from the single
 * `AudioSessionManager` (audit Phase 1/6 — one mic owner). This removes the
 * dual mic-ownership that the audit flagged.
 */
import { StreamingSTT } from '@/lib/voice/stt-client'
import {
  fetchSTTTokenWithRetry,
  releaseSTTSession,
  type STTTokenResponse,
} from '@/lib/voice/stt-token'
import { DeepgramCircuitBreaker } from '@/lib/voice/deepgram-circuit-breaker'
import { createVoiceLogger } from '@/lib/voice/core/observability'
import type { SttTransport, SttTransportCallbacks } from '@/lib/voice/stt/stt-transport'

const log = createVoiceLogger('stt-deepgram')

export class DeepgramTransport implements SttTransport {
  readonly kind = 'deepgram' as const

  private stt: StreamingSTT | null = null
  private callbacks: SttTransportCallbacks | null = null
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private leaseId: string | null = null
  private pageHideHandler: (() => void) | null = null
  private stopped = false
  private readonly breaker = new DeepgramCircuitBreaker()

  constructor(private readonly interviewId: string) {}

  async start(callbacks: SttTransportCallbacks): Promise<void> {
    this.callbacks = callbacks
    this.stopped = false

    const gate = this.breaker.canRequestToken()
    if (!gate.allowed) {
      throw new Error(
        gate.reason === 'circuit_open'
          ? 'Voice service paused after repeated errors. Please wait, then retry.'
          : 'Voice service is cooling down. Please wait…',
      )
    }

    this.breaker.recordTokenRequest()
    const token = await fetchSTTTokenWithRetry(this.interviewId)
    this.breaker.recordSuccess()
    if (this.stopped) return

    this.leaseId = token.session_lease_id ?? null
    this.installPageHideRelease()
    await this.connect(token)
  }

  private async connect(token: STTTokenResponse): Promise<void> {
    const stt = new StreamingSTT(token.token)
    this.stt = stt
    await stt.start({
      onOpen: () => {
        if (this.stopped) return
        this.callbacks?.onOpen()
      },
      onPartial: (chunk) => {
        if (this.stopped) return
        if (chunk.isFinal) this.callbacks?.onFinalSegment(chunk.text)
        else this.callbacks?.onPartial(chunk.text)
      },
      onFinal: (fullText) => {
        if (this.stopped) return
        this.callbacks?.onUtteranceEnd(fullText)
      },
      onError: (err) => {
        if (this.stopped) return
        this.breaker.recordFailure(err.message)
        this.callbacks?.onError(err)
      },
      onClose: (info) => {
        if (this.stopped) return
        this.callbacks?.onClose({ code: info.code, reason: info.reason })
      },
    })
    this.scheduleRefresh(token.expires_in_seconds)
  }

  private scheduleRefresh(expiresInSeconds: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer)
    const refreshMs = Math.max(30_000, (expiresInSeconds - 25) * 1000)
    this.refreshTimer = setTimeout(() => {
      void this.refresh()
    }, refreshMs)
  }

  /** Transparent token refresh: swap to a fresh socket without dropping frames noticeably. */
  private async refresh(): Promise<void> {
    if (this.stopped) return
    try {
      const token = await fetchSTTTokenWithRetry(this.interviewId, {
        refreshLeaseId: this.leaseId ?? undefined,
      })
      if (this.stopped) return
      const prev = this.stt
      this.stt = null
      try {
        prev?.stop()
      } catch {
        /* */
      }
      await this.connect(token)
      log.info('deepgram_token_refreshed', null, {})
    } catch (err) {
      if (this.stopped) return
      this.callbacks?.onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  sendAudio(frame: ArrayBuffer): void {
    if (this.stopped) return
    this.stt?.sendAudio(frame)
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
    const stt = this.stt
    this.stt = null
    try {
      stt?.stop()
    } catch {
      /* */
    }
    this.releaseLease()
    this.removePageHideRelease()
    log.info('deepgram_transport_stopped', null, {})
  }

  private releaseLease(opts?: { beacon?: boolean }): void {
    if (!this.leaseId) return
    const leaseId = this.leaseId
    this.leaseId = null
    releaseSTTSession(this.interviewId, leaseId, undefined, { beacon: opts?.beacon })
  }

  private installPageHideRelease(): void {
    if (typeof window === 'undefined' || this.pageHideHandler) return
    this.pageHideHandler = () => this.releaseLease({ beacon: true })
    window.addEventListener('pagehide', this.pageHideHandler)
  }

  private removePageHideRelease(): void {
    if (typeof window === 'undefined' || !this.pageHideHandler) return
    window.removeEventListener('pagehide', this.pageHideHandler)
    this.pageHideHandler = null
  }
}
