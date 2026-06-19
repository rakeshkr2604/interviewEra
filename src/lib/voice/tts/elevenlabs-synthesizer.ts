'use client'

/**
 * Production TTS synthesizer: ElevenLabs via the server-side /api/tts proxy
 * (key stays server-only). Thin adapter over `ProsodicTTS` that maps the
 * existing `TTSFallbackToBrowserError` to the pipeline-local `TtsFallbackError`
 * so the pipeline stays free of browser-only imports.
 *
 * Connection reuse: a single ProsodicTTS instance is retained per pipeline so
 * keep-alive HTTP connections to the proxy are reused across utterances
 * (audit Phase 5 — "connection reuse").
 */
import { ProsodicTTS, TTSFallbackToBrowserError, type TTSOptions } from '@/lib/voice/tts-client'
import { TtsFallbackError, type TtsSynthesizer } from '@/lib/voice/tts/tts-pipeline'

export function createElevenLabsSynthesizer(): TtsSynthesizer {
  const client = new ProsodicTTS()
  return {
    async speak(text: string, options: TTSOptions, signal: AbortSignal): Promise<ArrayBuffer> {
      try {
        return await client.speak(text, options, signal)
      } catch (err) {
        if (err instanceof TTSFallbackToBrowserError) {
          throw new TtsFallbackError(err.message, err.httpStatus)
        }
        throw err
      }
    },
  }
}
