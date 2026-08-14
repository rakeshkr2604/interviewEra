/**
 * Client helpers for SCRIPT_H P1 LLM→TTS first-sentence streaming.
 */

import { remainingSpeechAfterPrefix } from '@/lib/interview/json-speech-extractor'
import type { ScriptTurnOutput } from '@/types/script-interview'

export type ScriptTurnApiResponse = {
  turn: ScriptTurnOutput
  turnIndex: number
  interviewId: string
  questionNumber: number
}

export type ScriptTurnSseHandlers = {
  onSentence?: (speech: string, index: number) => void
  onComplete?: (payload: ScriptTurnApiResponse) => void
  onError?: (error: { error?: string; message?: string; field?: string }) => void
}

export function isClientLlmTtsStreamingEnabled(): boolean {
  // Next only inlines NEXT_PUBLIC_* into the browser bundle. A missing/stale
  // client value must not permanently disable P1 — when allowEarlyTts is set,
  // the client still sends Accept: text/event-stream and the server flag
  // (VOICE_LLM_TTS_STREAMING) is authoritative.
  return process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING === 'true'
}

/**
 * Parse an SSE byte stream from /api/interview/script/turn.
 * Returns the complete payload, or null if the stream ended without complete
 * (caller should fall back to non-streaming).
 */
export async function consumeScriptTurnSse(
  body: ReadableStream<Uint8Array>,
  handlers: ScriptTurnSseHandlers,
  signal?: AbortSignal,
): Promise<ScriptTurnApiResponse | null> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completePayload: ScriptTurnApiResponse | null = null
  let streamError: { error?: string; message?: string; field?: string } | null = null
  let sentenceEmitted = false
  let completeEmitted = false

  const abort = () => {
    void reader.cancel().catch(() => {})
  }
  if (signal) {
    if (signal.aborted) {
      abort()
      throw new DOMException('Aborted', 'AbortError')
    }
    signal.addEventListener('abort', abort, { once: true })
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''

      for (const block of blocks) {
        if (!block.trim()) continue
        const lines = block.split('\n')
        let event = ''
        let data = ''
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) data = line.slice(5).trim()
        }
        if (!event || !data) continue

        if (event === 'sentence') {
          // Complete already won — ignore late/duplicate sentence (same turn).
          if (completeEmitted || sentenceEmitted) continue
          try {
            const parsed = JSON.parse(data) as { index?: number; speech?: string }
            if (typeof parsed.speech === 'string' && parsed.speech.trim()) {
              sentenceEmitted = true
              handlers.onSentence?.(parsed.speech, parsed.index ?? 0)
            }
          } catch {
            /* ignore malformed sentence event */
          }
        } else if (event === 'complete') {
          if (completeEmitted) continue
          try {
            completePayload = JSON.parse(data) as ScriptTurnApiResponse
            completeEmitted = true
            handlers.onComplete?.(completePayload)
          } catch {
            /* ignore */
          }
        } else if (event === 'error') {
          try {
            streamError = JSON.parse(data) as {
              error?: string
              message?: string
              field?: string
            }
            handlers.onError?.(streamError)
          } catch {
            streamError = { error: 'stream_error' }
            handlers.onError?.(streamError)
          }
        }
      }
    }
  } finally {
    if (signal) signal.removeEventListener('abort', abort)
  }

  if (streamError) {
    const msg =
      streamError.error === 'invalid_turn_output'
        ? 'invalid_turn_output'
        : streamError.message || streamError.error || 'stream_error'
    throw new Error(msg)
  }

  return completePayload
}

export { remainingSpeechAfterPrefix }
