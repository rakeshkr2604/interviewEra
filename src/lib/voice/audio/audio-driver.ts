/**
 * Dependency-injection seam between the (testable, framework-agnostic)
 * `AudioSessionManager` and the real Web Audio / MediaDevices implementation.
 *
 * The manager owns *lifecycle and policy* (acquire-once, gating, supersession,
 * deterministic disposal). The driver owns *raw browser plumbing*. This split
 * lets the manager's behavioural guarantees be unit-tested in Node with a fake
 * driver, while the browser driver stays a thin, side-effecting adapter.
 */

/** Raw 16 kHz mono Int16 PCM frame delivered from the mic tap. */
export type PcmListener = (frame: ArrayBuffer) => void

export interface AudioPlaybackCallbacks {
  onPlaybackStarted?: () => void
  onPlaybackComplete?: () => void
  onPlaybackFailed?: (message?: string) => void
}

/** Handle to a live microphone capture pipeline. `stop()` is idempotent. */
export interface CaptureHandle {
  stop(): void
}

/** Handle to one in-flight/active playback. `stop()` is idempotent. */
export interface PlaybackHandle {
  stop(): void
  readonly durationSec: number | null
}

export interface AudioDriver {
  /** iOS gesture unlock + speechSynthesis prime. Safe to call repeatedly. */
  unlock(): void

  /** True when this platform requires an in-page tap before audio can play. */
  needsGestureUnlock(): boolean

  /**
   * Acquire the microphone exactly once and build the PCM capture pipeline.
   * Frames flow to `onPcm` continuously while the pipeline is alive; gating
   * (pause/resume between questions) is the manager's responsibility, NOT a
   * re-acquisition. Returns a handle whose `stop()` fully releases the stream.
   */
  startCapture(onPcm: PcmListener): Promise<CaptureHandle>

  /** Resume the playback AudioContext (autoplay policy). Returns running state. */
  resumePlayback(): Promise<boolean>

  /** Resume the capture AudioContext after tab/lock-screen backgrounding. */
  resumeCapture(): Promise<boolean>

  /** Release audio focus before capture (Android suspends playback context). */
  prepareForCapture(): Promise<void>

  /**
   * Decode `buffer` and begin playback. Resolves once playback has STARTED
   * (or rejects/calls onPlaybackFailed on decode/autoplay failure). The
   * returned handle's `stop()` cancels playback immediately.
   */
  play(buffer: ArrayBuffer, callbacks: AudioPlaybackCallbacks): Promise<PlaybackHandle>

  /** Tear down every context/stream/node owned by the driver. Idempotent. */
  dispose(): Promise<void>
}

export type AudioSessionStatus =
  | 'created'
  | 'initializing'
  | 'ready'
  | 'disposing'
  | 'disposed'
