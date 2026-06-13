import {
  isElevenLabsTtsBlocked,
  markElevenLabsBlockedForHttpStatus,
} from '@/lib/voice/elevenlabs-tts-gate';

export type InterviewerVoice = 'male' | 'female';
export type InterviewerTone = 'encouraging' | 'neutral' | 'challenging';

export interface TTSOptions {
  voice: InterviewerVoice;
  tone: InterviewerTone;
}

/**
 * Typed error thrown by ProsodicTTS when the /api/tts route returns a JSON
 * response with `fallback: 'browser_tts'`. The server emits this signal for
 * three recoverable conditions:
 *   - Monthly TTS quota exhausted (429)
 *   - ElevenLabs upstream error (upstream status)
 *   - Network timeout / proxy fetch failure (502)
 *
 * Callers should treat this as a "soft" failure — the interview must continue,
 * but the UI should surface that voice playback is unavailable so the user
 * isn't waiting for sound that will never play.
 */
export class TTSFallbackToBrowserError extends Error {
  readonly httpStatus: number;
  constructor(httpStatus: number, message: string) {
    super(message);
    this.name = 'TTSFallbackToBrowserError';
    this.httpStatus = httpStatus;
  }
}

// ProsodicTTS: routes through /api/tts (server-side proxy) to avoid CORS and
// keep the ElevenLabs API key server-only (no NEXT_PUBLIC_ exposure).
export class ProsodicTTS {
  // apiKey is accepted for interface compatibility but unused — auth is handled
  // server-side by the proxy route which reads ELEVENLABS_API_KEY.
  constructor(_apiKey?: string) {}

  async speak(text: string, options: TTSOptions, signal?: AbortSignal): Promise<ArrayBuffer> {
    if (isElevenLabsTtsBlocked()) {
      throw new TTSFallbackToBrowserError(
        503,
        'ElevenLabs voice skipped — using browser speech for this session.',
      );
    }

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: options.voice, tone: options.tone }),
      signal,
    });

    if (!response.ok) {
      // The proxy emits structured JSON on its error paths. Parse it once so
      // we can branch on `fallback: 'browser_tts'` and surface a typed error
      // the UI layer can recognize without string-matching.
      let parsedBody: { error?: string; fallback?: string } | null = null;
      let rawBody = '';
      try {
        rawBody = await response.text();
        parsedBody = rawBody ? (JSON.parse(rawBody) as { error?: string; fallback?: string }) : null;
      } catch {
        parsedBody = null;
      }
      console.error('[TTS] Proxy error:', response.status, parsedBody ?? rawBody);
      if (parsedBody?.fallback === 'browser_tts') {
        markElevenLabsBlockedForHttpStatus(
          response.status,
          parsedBody.error ?? `TTS unavailable (${response.status})`,
        );
        throw new TTSFallbackToBrowserError(
          response.status,
          parsedBody.error ?? `TTS unavailable (${response.status})`,
        );
      }
      if (response.status === 429 || response.status === 401) {
        markElevenLabsBlockedForHttpStatus(
          response.status,
          parsedBody?.error ?? `TTS unavailable (${response.status})`,
        );
        throw new TTSFallbackToBrowserError(
          response.status,
          parsedBody?.error ?? `TTS unavailable (${response.status})`,
        );
      }
      throw new Error(`TTS failed (${response.status}): ${parsedBody?.error ?? rawBody}`);
    }

    console.log('[TTS] ✓ Successfully received audio');
    return response.arrayBuffer();
  }
}