/**
 * SCRIPT_H P1 — stream LLM JSON, emit first natural speech sentence over SSE,
 * then return the full raw JSON for canonical parse/validate/persist.
 */

import { completeInterviewChatStream } from '@/lib/ai/interview-completion'
import { SentenceStreamBuffer } from '@/lib/interview/followup-stream'
import { JsonSpeechExtractor } from '@/lib/interview/json-speech-extractor'
import type OpenAI from 'openai'

export function isLlmTtsStreamingEnabled(): boolean {
  return (
    process.env.VOICE_LLM_TTS_STREAMING === 'true' ||
    process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING === 'true'
  )
}

export function wantsScriptTurnSse(request: Request): boolean {
  const accept = request.headers.get('accept') ?? ''
  return isLlmTtsStreamingEnabled() && accept.includes('text/event-stream')
}

export function encodeSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export type ScriptTurnStreamResult = {
  rawJson: string
  firstSentence: string | null
  firstTokenAt: number | null
  firstSentenceAt: number | null
}

/**
 * Consume the LLM token stream, emit at most the first natural sentence from
 * the decoded `speech` value, and accumulate the complete raw JSON text.
 */
export async function streamScriptTurnLlm(options: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
  signal?: AbortSignal
  onSentence?: (sentence: string, index: number) => void
  onFirstToken?: () => void
}): Promise<ScriptTurnStreamResult> {
  let rawJson = ''
  let firstSentence: string | null = null
  let firstTokenAt: number | null = null
  let firstSentenceAt: number | null = null
  let sentenceEmitted = false

  const sentenceBuffer = new SentenceStreamBuffer((sentence, index) => {
    if (sentenceEmitted || index !== 0) return
    sentenceEmitted = true
    firstSentence = sentence
    firstSentenceAt = Date.now()
    options.onSentence?.(sentence, 0)
  }, { minSentenceChars: 6 })

  const extractor = new JsonSpeechExtractor((text) => {
    sentenceBuffer.append(text)
  })

  const stream = completeInterviewChatStream({
    messages: options.messages,
    temperature: 0.7,
    operation: 'script_turn_generation',
    jsonMode: true,
    signal: options.signal,
  })

  for await (const token of stream) {
    if (options.signal?.aborted) break
    if (firstTokenAt == null) {
      firstTokenAt = Date.now()
      options.onFirstToken?.()
    }
    rawJson += token
    if (extractor.status !== 'speech_complete' && extractor.status !== 'aborted') {
      extractor.append(token)
    }
    // Once the JSON speech string closes, flush any remaining plain text so
    // short utterances ("Ready?") still emit sentence 0 before the rest of
    // the JSON object finishes streaming.
    if (!sentenceEmitted && extractor.status === 'speech_complete') {
      sentenceBuffer.flush()
    }
  }

  if (!sentenceEmitted && extractor.speechSoFar.trim()) {
    sentenceBuffer.flush()
  }

  return { rawJson, firstSentence, firstTokenAt, firstSentenceAt }
}
