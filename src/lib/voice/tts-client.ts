import {
  isElevenLabsTtsBlocked,
  markElevenLabsBlockedForHttpStatus,
  markElevenLabsTtsBlocked,
} from '@/lib/voice/elevenlabs-tts-gate';

import type { InterviewerId } from '@/lib/config/interviewers';

export type InterviewerVoice = 'male' | 'female';
export type TTSVoiceKey = InterviewerVoice | InterviewerId;
export type InterviewerTone = 'encouraging' | 'neutral' | 'challenging';

export interface TTSOptions {
  voice: TTSVoiceKey;
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
    const response = await this.fetchTts(text, options, signal);
    console.log('[TTS] ✓ Successfully received audio');
    return response.arrayBuffer();
  }

  /**
   * Same request/error handling as `speak()`, but returns the raw streaming
   * Response instead of buffering it — lets the caller start playback before
   * the full audio has downloaded (time-to-first-audio, not full-generation-time).
   */
  async speakStream(text: string, options: TTSOptions, signal?: AbortSignal): Promise<Response> {
    return this.fetchTts(text, options, signal);
  }

  private async fetchTts(text: string, options: TTSOptions, signal?: AbortSignal): Promise<Response> {
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

      const isSessionAuthFailure = parsedBody?.error === 'Unauthorized';
      const shouldFallbackToBrowser =
        parsedBody?.fallback === 'browser_tts' ||
        response.status === 429 ||
        response.status === 401 ||
        response.status === 502;

      if (shouldFallbackToBrowser) {
        if (!isSessionAuthFailure) {
          const reason = parsedBody?.error ?? `TTS unavailable (${response.status})`;
          // Missing server config will not heal mid-session — block ElevenLabs
          // for the tab instead of retrying /api/tts every 60s.
          if (response.status === 503 && parsedBody?.error === 'TTS not configured') {
            markElevenLabsTtsBlocked(reason);
          } else {
            markElevenLabsBlockedForHttpStatus(response.status, reason);
          }
        }
        console.warn(
          '[TTS] Browser speech fallback:',
          response.status,
          parsedBody?.error ?? (rawBody || '(empty body)'),
        );
        throw new TTSFallbackToBrowserError(
          response.status,
          isSessionAuthFailure
            ? 'Voice service needs a fresh login — using browser speech for now.'
            : (parsedBody?.error ?? `TTS unavailable (${response.status})`),
        );
      }

      console.error('[TTS] Proxy error:', response.status, parsedBody ?? rawBody);
      throw new Error(`TTS failed (${response.status}): ${parsedBody?.error ?? rawBody}`);
    }

    return response;
  }
}