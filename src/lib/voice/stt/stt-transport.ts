/**
 * Transport abstraction for the STT pipeline.
 *
 * A transport is the wire to a single recognition engine. Exactly one transport
 * is ever active (audit Phase 4 — "never two active STT engines"). Deepgram is
 * the production transport; the browser transport is an explicit, opt-in
 * emergency fallback. The pipeline above owns transcript assembly, gating, and
 * the single-engine invariant; the transport owns only the connection.
 */

export type SttEngineKind = 'deepgram' | 'browser'

export interface SttTransportCallbacks {
  /** Fired once when the engine is confirmed ready to receive/emit audio. */
  onOpen: () => void
  /** Interim (partial) hypothesis for the current utterance. */
  onPartial: (text: string) => void
  /** A finalized segment to append to the transcript. */
  onFinalSegment: (text: string) => void
  /**
   * Voice-activity end of an utterance — the assembled answer is ready. The
   * pipeline forwards this to the orchestrator as an auto-submit signal.
   */
  onUtteranceEnd: (fullText: string) => void
  onError: (error: Error) => void
  onClose: (info: { code?: number; reason?: string }) => void
}

export interface SttTransport {
  readonly kind: SttEngineKind
  /** Open the connection. Resolves once the start handshake is issued. */
  start(callbacks: SttTransportCallbacks): Promise<void>
  /** Feed a PCM frame (Deepgram). Browser transport ignores this. */
  sendAudio(frame: ArrayBuffer): void
  /** Close + release the transport. Idempotent. */
  stop(): void
}

/** Factory so the pipeline can lazily build a transport per engine selection. */
export type SttTransportFactory = (kind: SttEngineKind) => SttTransport
