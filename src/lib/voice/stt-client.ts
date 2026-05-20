import {
  DeepgramClient,
  ListenV1InterimResults,
  ListenV1SmartFormat,
  ListenV1Punctuate,
  ListenV1VadEvents,
  type ListenV1Model,
} from '@deepgram/sdk';

export interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface STTCallbacks {
  onPartial: (chunk: TranscriptChunk) => void;
  onFinal: (fullText: string) => void;
  onError: (error: Error) => void;
}

// Deepgram Nova-3 streaming STT with VAD via utterance_end_ms.
// Optimised for Indian English + Hinglish (en-IN locale).
// SDK v4 API: new DeepgramClient({ apiKey }) → client.listen.v1.connect() → V1Socket
export class StreamingSTT {
  private client: DeepgramClient;
  private apiKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private socket: any = null;
  private fullTranscript = '';
  private lastFinal = '';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new DeepgramClient({ apiKey });
  }

  async start(callbacks: STTCallbacks): Promise<void> {
    this.fullTranscript = '';
    this.lastFinal = '';

    // ConnectArgs requires Authorization for WebSocket auth (SDK v4 doesn't
    // auto-inject the header for live streaming connections).
    this.socket = await this.client.listen.v1.connect({
      model: 'nova-3' as ListenV1Model,
      language: 'en-IN',
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

    this.socket.on('open', () => {
      console.log('[STT] Connection opened');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.on('message', (msg: any) => {
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
            callbacks.onPartial({ text: clean, isFinal: true, confidence });
          }
        } else {
          callbacks.onPartial({ text: transcript, isFinal: false, confidence });
        }
      } else if (msg?.type === 'UtteranceEnd') {
        const text = this.fullTranscript.trim();
        if (text) {
          callbacks.onFinal(text);
          this.fullTranscript = '';
          this.lastFinal = '';
        }
      }
    });

    this.socket.on('error', (error: unknown) => {
      console.error('[STT] Error:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks.onError(err);
    });

    this.socket.on('close', () => {
      console.log('[STT] Connection closed');
    });
  }

  sendAudio(audioData: ArrayBuffer): void {
    // readyState 1 = WebSocket OPEN
    if (this.socket?.readyState === 1) {
      this.socket.sendMedia(audioData);
    }
  }

  stop(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
