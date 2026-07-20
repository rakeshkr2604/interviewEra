import { resolveSttLocale, type SttLocale } from '@/lib/voice/speech-locale';
import { PcmSendBuffer } from '@/lib/voice/stt/pcm-send-buffer';
import { lifecycleLog, lifecycleWarn, voiceDebug } from './lifecycle-log';
import { voicePipelineDiagnostics } from './voice-pipeline-diagnostics';

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
   * Deepgram pipeline is ready to receive audio — start() resolving is
   * necessary but not sufficient because the socket goes through
   * CONNECTING → OPEN asynchronously.
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

const DEEPGRAM_LISTEN_URL = 'wss://api.deepgram.com/v1/listen';

/**
 * Nova-3 keyterm boosting (repeated `keyterm=` query params — Deepgram docs).
 * Improves recognition odds for CS vocabulary; does not guarantee notation formatting.
 */
export const DEEPGRAM_CS_KEYTERMS = [
  'O(n)',
  'O(n log n)',
  'O(log n)',
  'O(n^2)',
  'O(1)',
  'O(2^n)',
  'QuickSort',
  'MergeSort',
  'HashMap',
  'HashSet',
  'Big O',
  'time complexity',
  'space complexity',
] as const;

/** Append Nova-3 keyterms as repeated query params (not comma-separated). */
export function appendDeepgramKeyterms(params: URLSearchParams, terms: readonly string[]): void {
  for (const term of terms) {
    params.append('keyterm', term);
  }
}

/** Shape of the JSON frames Deepgram's live API sends over the socket. */
type DeepgramLiveMessage = {
  type?: string;
  is_final?: boolean;
  channel?: { alternatives?: Array<{ transcript?: string; confidence?: number }> };
};

// Deepgram Nova-3 streaming STT with VAD via utterance_end_ms.
// Optimised for Indian English + Hinglish (en-IN locale).
//
// TRANSPORT: direct native browser WebSocket — NOT the @deepgram/sdk socket.
// The SDK v5 browser path is broken for this use case in two independent ways:
//   1. Auth: it forwards `Authorization` as a `headers` option on
//      `new WebSocket(url, protocols, options)`. Native browser WebSocket only
//      accepts (url, protocols); the third argument is silently ignored, so the
//      handshake reached Deepgram unauthenticated and `open` never fired.
//   2. Failure visibility: the SDK creates the socket inside an internal
//      promise chain with no rejection handler — a constructor throw (CSP,
//      malformed subprotocol) dies as an unhandled rejection with no error
//      event, leaving callers waiting forever on an `open` that can't come.
// Browsers authenticate Deepgram WS connections via the Sec-WebSocket-Protocol
// header instead: `new WebSocket(url, ['token', apiKey])` — the mechanism the
// SDK itself documents in its own browser helper (CustomClient.js) but does not
// apply on the listen.v1.connect() path.
//
// AUDIO FORMAT: the mic pipeline (useMicrophone → pcm-capture-graph) sends raw
// headerless PCM — Float32 → Int16, 16 kHz, mono. Raw PCM REQUIRES explicit
// `encoding=linear16&sample_rate=16000&channels=1` query params; without them
// Deepgram tries container auto-detection, cannot decode the stream, and never
// emits a transcript even on a healthy authenticated connection.
//
// LIFECYCLE OWNERSHIP
// -------------------
// Owns: one WebSocket at a time. Two invariants the audit caller relies on:
//   1. If stop() is called BEFORE start() resolves, the socket that start()
//      created must be closed immediately and never deliver callbacks.
//   2. After stop() returns, no message/error/close callback may invoke the
//      caller-supplied STTCallbacks — they may close over React state.
// Both invariants are enforced by a generation counter `gen`. Every start()
// claims a fresh gen; every event handler compares against the live gen and
// becomes a no-op if superseded.
export class StreamingSTT {
  private apiKey: string;
  private socket: WebSocket | null = null;
  private fullTranscript = '';
  private lastFinal = '';
  private chunksSent = 0;
  private readonly pcmBuffer = new PcmSendBuffer();
  // Monotonic id of the current session. Bumped on every start() and stop().
  private gen = 0;
  // Set true after stop() — any in-flight connect resolution must close.
  private aborted = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async start(callbacks: STTCallbacks, options?: STTStartOptions): Promise<void> {
    this.fullTranscript = '';
    this.lastFinal = '';
    this.chunksSent = 0;
    this.pcmBuffer.clear();
    this.aborted = false;
    const mySession = ++this.gen;

    const language = options?.locale ?? resolveSttLocale();
    const params = new URLSearchParams({
      model: 'nova-3',
      language,
      smart_format: 'true',
      interim_results: 'true',
      punctuate: 'true', // cleaner sentence boundaries
      vad_events: 'true', // explicit speech events → steadier VAD
      // More patient endpointing: campus candidates pause mid-thought; the old
      // 300/1000 ms cut them off and produced fragmented "unstable" transcripts.
      endpointing: '500', // 500 ms silence → utterance end detection
      utterance_end_ms: '1500', // 1.5 s of silence → UtteranceEnd fires
      // Raw headerless PCM from the mic pipeline — mandatory, see header comment.
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
    });
    appendDeepgramKeyterms(params, DEEPGRAM_CS_KEYTERMS);

    let socket: WebSocket;
    try {
      // Subprotocol auth: browsers cannot set an Authorization header on a
      // WebSocket; Deepgram accepts `Sec-WebSocket-Protocol: token, <key>`.
      socket = new WebSocket(`${DEEPGRAM_LISTEN_URL}?${params.toString()}`, ['token', this.apiKey]);
    } catch (err) {
      // Synchronous constructor throws: CSP connect-src violation or a
      // malformed subprotocol value. Surface loudly — this exact class of
      // failure previously died silently inside the SDK.
      lifecycleWarn('stt', 'connect_failed', {
        mySession,
        err: err instanceof Error ? err.message : String(err),
      });
      try { callbacks.onError(err instanceof Error ? err : new Error(String(err))); } catch { /* */ }
      throw err;
    }
    socket.binaryType = 'arraybuffer';

    // If stop() was called synchronously after start() (unlikely but possible
    // via re-entrant callbacks), close the socket we just created silently.
    if (this.aborted || mySession !== this.gen) {
      lifecycleWarn('stt', 'connect_resolved_after_abort', { mySession, current: this.gen });
      try { socket.close(); } catch { /* */ }
      return;
    }

    this.socket = socket;
    lifecycleLog('stt', 'open', { session: mySession });

    socket.addEventListener('open', () => {
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
        voicePipelineDiagnostics.recordBufferFlush(flushed);
        voiceDebug('CHUNK_FLUSHED', { session: mySession, chunks: flushed, queued_bytes: 0 });
      }
      try { callbacks.onOpen?.(); } catch { /* */ }
    });

    socket.addEventListener('message', (event: MessageEvent) => {
      if (typeof event.data !== 'string') return; // Deepgram results are JSON text frames
      let msg: DeepgramLiveMessage;
      try {
        msg = JSON.parse(event.data) as DeepgramLiveMessage;
      } catch {
        return;
      }

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
        const transcript = alt.transcript;
        const confidence = alt.confidence ?? 0;

        if (msg.is_final) {
          const clean = transcript.trim();
          // Deepgram can re-emit the same final segment; skip exact repeats so
          // the assembled answer doesn't contain doubled phrases.
          if (clean && clean !== this.lastFinal) {
            this.fullTranscript += clean + ' ';
            this.lastFinal = clean;
            voicePipelineDiagnostics.recordDeepgramFinal(clean.length);
            voiceDebug('dg_transcript_received', {
              session: mySession,
              is_final: true,
              chars: clean.length,
            });
            voiceDebug('STT_FINAL', { session: mySession, chars: clean.length });
            try { callbacks.onPartial({ text: clean, isFinal: true, confidence }); } catch { /* */ }
          }
        } else {
          voicePipelineDiagnostics.recordDeepgramPartial(transcript.length);
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

    socket.addEventListener('error', () => {
      if (mySession !== this.gen || this.aborted) return;
      // Browser 'error' events carry no detail; the specifics (401 handshake
      // rejection, DNS, TLS) are only visible in the DevTools Network tab.
      const err = new Error(
        'Deepgram WebSocket connection failed — handshake rejected or blocked (see the browser Network tab).',
      );
      voiceDebug('dg_ws_error', { session: mySession, message: err.message });
      lifecycleWarn('stt', 'ws_error', { session: mySession, err: err.message });
      try { callbacks.onError(err); } catch { /* */ }
    });

    socket.addEventListener('close', (event: CloseEvent) => {
      voiceDebug('dg_ws_closed', {
        session: mySession,
        was_aborted: this.aborted,
        was_superseded: mySession !== this.gen,
        code: event.code,
      });
      lifecycleLog('stt', 'ws_close', { session: mySession, code: event.code });
      if (mySession !== this.gen || this.aborted) return;
      try {
        callbacks.onClose?.({
          code: event.code,
          reason: typeof event.reason === 'string' ? event.reason : undefined,
          wasClean: event.wasClean,
        });
      } catch { /* */ }
    });
  }

  private sendMediaNow(audioData: ArrayBuffer): void {
    if (this.aborted || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    const readyState = this.socket.readyState;
    this.socket.send(audioData);
    this.chunksSent += 1;
    voicePipelineDiagnostics.recordWsPacket(audioData.byteLength, readyState);
    if (this.chunksSent === 1 || this.chunksSent % 50 === 0) {
      voiceDebug('CHUNK_SENT', { chunk: this.chunksSent, bytes: audioData.byteLength });
    }
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.aborted) return;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendMediaNow(audioData);
      return;
    }
    // Queue while CONNECTING — flushed on 'open'.
    this.pcmBuffer.enqueue(audioData);
    voicePipelineDiagnostics.recordPcmQueued(this.pcmBuffer.queuedBytes);
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
