import {
  DeepgramClient,
  ListenV1InterimResults,
  ListenV1SmartFormat,
  ListenV1Punctuate,
  ListenV1VadEvents,
  type ListenV1Model,
} from '@deepgram/sdk';
import { resolveSttLocale, type SttLocale } from '@/lib/voice/speech-locale';
import { PcmSendBuffer } from '@/lib/voice/stt/pcm-send-buffer';
import { lifecycleLog, lifecycleWarn, voiceDebug } from './lifecycle-log';

export interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface STTCallbacks {
  onPartial: (chunk: TranscriptChunk) => void;
  onFinal: (fullText: string) => void;
  onError: (error: Error) => void;
  /**
   * Fires exactly once when the underlying WebSocket reaches OPEN state.
   * Callers should treat this as the only authoritative signal that the
   * Deepgram pipeline is ready to receive audio — the connect() promise
   * resolving is necessary but not sufficient because the socket goes
   * through CONNECTING → OPEN asynchronously.
   *
   * UI must NOT render "Listening…" before this fires.
   */
  onOpen?: () => void;
  /** Fires when the WebSocket closes (normal or abnormal). */
  onClose?: (info: { code?: number; reason?: string; wasClean?: boolean }) => void;
}

export interface STTStartOptions {
  locale?: SttLocale;
}

// Deepgram Nova-3 streaming STT with VAD via utterance_end_ms.
// Optimised for Indian English + Hinglish (en-IN locale).
// SDK v4 API: new DeepgramClient({ apiKey }) → client.listen.v1.connect() → V1Socket
//
// LIFECYCLE OWNERSHIP
// -------------------
// Owns: one WebSocket at a time. Two invariants the audit caller relies on:
//   1. If stop() is called BEFORE start() resolves, the socket that connect()
//      eventually returns must be closed immediately and never deliver callbacks.
//   2. After stop() returns, no message/error/close callback may invoke the
//      caller-supplied STTCallbacks — they may close over React state.
// Both invariants are enforced by a generation counter `gen`. Every start()
// claims a fresh gen; the message handler and the late-resolved-socket guard
// compare against the live gen and become no-ops if superseded.
export class StreamingSTT {
  private client: DeepgramClient;
  private apiKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socket: any = null;
  private fullTranscript = '';
  private lastFinal = '';
  private chunksSent = 0;
  private readonly pcmBuffer = new PcmSendBuffer();
  // Monotonic id of the current session. Bumped on every start() and stop().
  private gen = 0;
  // Set true after stop() — any in-flight connect() resolution must close.
  private aborted = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new DeepgramClient({ apiKey });
  }

  async start(callbacks: STTCallbacks, options?: STTStartOptions): Promise<void> {
    this.fullTranscript = '';
    this.lastFinal = '';
    this.chunksSent = 0;
    this.pcmBuffer.clear();
    this.aborted = false;
    const mySession = ++this.gen;

    // ConnectArgs requires Authorization for WebSocket auth (SDK v4 doesn't
    // auto-inject the header for live streaming connections).
    const language = options?.locale ?? resolveSttLocale();
    let socket: unknown;
    try {
      socket = await this.client.listen.v1.connect({
        model: 'nova-3' as ListenV1Model,
        language,
        smart_format: ListenV1SmartFormat.True,
        interim_results: ListenV1InterimResults.True,
        punctuate: ListenV1Punctuate.True,   // cleaner sentence boundaries
        vad_events: ListenV1VadEvents.True,  // explicit speech events → steadier VAD
        // More patient endpointing: campus candidates pause mid-thought; the old
        // 300/1000 ms cut them off and produced fragmented "unstable" transcripts.
        endpointing: 500,        // 500 ms silence → utterance end detection
        utterance_end_ms: 1500,  // 1.5 s of silence → UtteranceEnd fires
        Authorization: `Token ${this.apiKey}`,
      });
    } catch (err) {
      lifecycleWarn('stt', 'connect_failed', { mySession, err: err instanceof Error ? err.message : String(err) });
      // Surface as an STTCallbacks error so the caller can recover.
      try { callbacks.onError(err instanceof Error ? err : new Error(String(err))); } catch { /* */ }
      throw err;
    }

    // If stop() was called while connect() was awaiting, the socket we just
    // received must be closed silently — nobody is listening for it, and
    // delivering callbacks would re-enter a torn-down React tree.
    if (this.aborted || mySession !== this.gen) {
      lifecycleWarn('stt', 'connect_resolved_after_abort', { mySession, current: this.gen });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      try { (socket as any)?.close?.(); } catch { /* */ }
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket = socket as any;
    lifecycleLog('stt', 'open', { session: mySession });

    this.socket.on('open', () => {
      // Stale-event gate: a delayed 'open' on a superseded session must not
      // unblock UI for the new session.
      if (mySession !== this.gen || this.aborted) {
        voiceDebug('dg_ws_opened_ignored', {
          reason: this.aborted ? 'aborted' : 'stale_gen',
          session: mySession,
          current: this.gen,
        });
        return;
      }
      voiceDebug('dg_ws_opened', { session: mySession });
      voiceDebug('STT_CONNECTED', { session: mySession });
      voiceDebug('VAD_STARTED', { session: mySession });
      lifecycleLog('stt', 'ws_open', { session: mySession });
      const flushed = this.pcmBuffer.flush((chunk) => this.sendMediaNow(chunk));
      if (flushed > 0) {
        voiceDebug('CHUNK_FLUSHED', { session: mySession, chunks: flushed, queued_bytes: 0 });
      }
      try { callbacks.onOpen?.(); } catch { /* */ }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on('message', (msg: any) => {
      // Stale-event gate: a late frame after stop() must not surface to React.
      if (mySession !== this.gen || this.aborted) {
        if (msg?.type === 'Results' && msg?.channel?.alternatives?.[0]?.transcript) {
          voiceDebug('dg_transcript_ignored', {
            reason: this.aborted ? 'aborted' : 'stale_gen',
            session: mySession,
            current: this.gen,
          });
        }
        return;
      }

      if (msg?.type === 'Results') {
        const alt = msg.channel?.alternatives?.[0];
        if (!alt?.transcript) return;
        const { transcript, confidence } = alt as { transcript: string; confidence: number };

        if (msg.is_final) {
          const clean = transcript.trim();
          // Deepgram can re-emit the same final segment; skip exact repeats so
          // the assembled answer doesn't contain doubled phrases.
          if (clean && clean !== this.lastFinal) {
            this.fullTranscript += clean + ' ';
            this.lastFinal = clean;
            voiceDebug('dg_transcript_received', {
              session: mySession,
              is_final: true,
              chars: clean.length,
            });
            voiceDebug('STT_FINAL', { session: mySession, chars: clean.length });
            try { callbacks.onPartial({ text: clean, isFinal: true, confidence }); } catch { /* */ }
          }
        } else {
          voiceDebug('dg_transcript_received', {
            session: mySession,
            is_final: false,
            chars: transcript.length,
          });
          voiceDebug('STT_PARTIAL', { session: mySession, chars: transcript.length });
          try { callbacks.onPartial({ text: transcript, isFinal: false, confidence }); } catch { /* */ }
        }
      } else if (msg?.type === 'UtteranceEnd') {
        const text = this.fullTranscript.trim();
        if (text) {
          voiceDebug('dg_utterance_end', { session: mySession, chars: text.length });
          voiceDebug('VAD_SPEECH_END', { session: mySession, chars: text.length });
          try { callbacks.onFinal(text); } catch { /* */ }
          this.fullTranscript = '';
          this.lastFinal = '';
        }
      }
    });

    this.socket.on('error', (error: unknown) => {
      if (mySession !== this.gen || this.aborted) return;
      const err = error instanceof Error ? error : new Error(String(error));
      voiceDebug('dg_ws_error', { session: mySession, message: err.message });
      lifecycleWarn('stt', 'ws_error', { session: mySession, err: err.message });
      try { callbacks.onError(err); } catch { /* */ }
    });

    this.socket.on('close', (event?: { code?: number; reason?: string; wasClean?: boolean }) => {
      voiceDebug('dg_ws_closed', {
        session: mySession,
        was_aborted: this.aborted,
        was_superseded: mySession !== this.gen,
        code: event?.code,
      });
      lifecycleLog('stt', 'ws_close', { session: mySession, code: event?.code });
      if (mySession !== this.gen || this.aborted) return;
      try {
        callbacks.onClose?.({
          code: event?.code,
          reason: typeof event?.reason === 'string' ? event.reason : undefined,
          wasClean: event?.wasClean,
        });
      } catch { /* */ }
    });
  }

  private sendMediaNow(audioData: ArrayBuffer): void {
    if (this.aborted || !this.socket || this.socket.readyState !== 1) return;
    this.socket.sendMedia(audioData);
    this.chunksSent += 1;
    if (this.chunksSent === 1 || this.chunksSent % 50 === 0) {
      voiceDebug('CHUNK_SENT', { chunk: this.chunksSent, bytes: audioData.byteLength });
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.aborted) return;
    if (this.socket?.readyState === 1) {
      this.sendMediaNow(audioData);
      return;
    }
    // Queue while CONNECTING — flushed on 'open'.
    this.pcmBuffer.enqueue(audioData);
    if (this.pcmBuffer.queuedChunks === 1 || this.pcmBuffer.queuedChunks % 25 === 0) {
      voiceDebug('CHUNK_QUEUED', {
        queued_chunks: this.pcmBuffer.queuedChunks,
        queued_bytes: this.pcmBuffer.queuedBytes,
      });
    }
  }

  // Idempotent. Safe to call repeatedly (Submit + onFinal VAD + unmount cleanup
  // routinely race on the same WebSocket).
  stop(): void {
    if (this.aborted && !this.socket) return;
    this.aborted = true;
    this.pcmBuffer.clear();
    // Bump the generation BEFORE closing so any callbacks dispatched between
    // close() and the close-event landing are dropped by the stale-gate.
    this.gen += 1;
    const s = this.socket;
    this.socket = null;
    if (s) {
      try { s.close(); } catch { /* */ }
    }
    voiceDebug('dg_stop_called', { gen: this.gen });
    lifecycleLog('stt', 'stop', { gen: this.gen });
  }
}
