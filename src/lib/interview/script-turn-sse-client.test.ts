import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  consumeScriptTurnSse,
  isClientLlmTtsStreamingEnabled,
  remainingSpeechAfterPrefix,
} from '@/lib/interview/script-turn-sse-client'
import {
  encodeSseEvent,
  isLlmTtsStreamingEnabled,
  streamScriptTurnLlm,
  wantsScriptTurnSse,
} from '@/lib/interview/script-turn-stream'

vi.mock('@/lib/ai/interview-completion', () => ({
  completeInterviewChatStream: vi.fn(),
}))

import { completeInterviewChatStream } from '@/lib/ai/interview-completion'

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
}

async function* tokenStream(chunks: string[]): AsyncGenerator<string> {
  for (const c of chunks) yield c
}

describe('script-turn SSE helpers', () => {
  it('encodes standard SSE frames', () => {
    expect(encodeSseEvent('sentence', { index: 0, speech: 'Hello.' })).toBe(
      'event: sentence\ndata: {"index":0,"speech":"Hello."}\n\n',
    )
  })

  it('consumes sentence then complete without replaying sentence on complete', async () => {
    const sentences: string[] = []
    let completeSpeech = ''
    const body = sseStream([
      encodeSseEvent('sentence', {
        index: 0,
        speech: 'That is a thoughtful answer.',
      }),
      encodeSseEvent('complete', {
        turn: {
          speech: 'That is a thoughtful answer. Can you share one example?',
          is_question: true,
          phase: 'core',
        },
        turnIndex: 3,
        interviewId: '00000000-0000-0000-0000-000000000001',
        questionNumber: 1,
      }),
    ])

    const payload = await consumeScriptTurnSse(body, {
      onSentence: (speech) => sentences.push(speech),
      onComplete: (p) => {
        completeSpeech = p.turn.speech
      },
    })

    expect(sentences).toEqual(['That is a thoughtful answer.'])
    expect(payload?.turn.speech).toBe(
      'That is a thoughtful answer. Can you share one example?',
    )

    const remaining = remainingSpeechAfterPrefix(completeSpeech, sentences[0]!)
    expect(remaining).toBe('Can you share one example?')
    expect(remaining.startsWith('That is a thoughtful answer.')).toBe(false)
  })

  it('sentence identity fields do not block dispatch; extra keys are ignored by the parser', async () => {
    const sentences: string[] = []
    const body = sseStream([
      encodeSseEvent('sentence', {
        index: 0,
        speech: 'Alright — let\'s dig into the interview questions.',
        turnIndex: 3,
        interviewId: '00000000-0000-0000-0000-000000000001',
      }),
      encodeSseEvent('complete', {
        turn: {
          speech: 'Alright — let\'s dig into the interview questions.',
          is_question: false,
          phase: 'core',
        },
        turnIndex: 3,
        interviewId: '00000000-0000-0000-0000-000000000001',
        questionNumber: 0,
      }),
    ])
    await consumeScriptTurnSse(body, { onSentence: (s) => sentences.push(s) })
    expect(sentences).toEqual(["Alright — let's dig into the interview questions."])
  })

  it('C: ignores duplicate sentence events', async () => {
    const sentences: string[] = []
    const body = sseStream([
      encodeSseEvent('sentence', { index: 0, speech: 'Hello there friend.' }),
      encodeSseEvent('sentence', { index: 0, speech: 'Hello there friend.' }),
      encodeSseEvent('complete', {
        turn: { speech: 'Hello there friend. Next?', is_question: true, phase: 'core' },
        turnIndex: 2,
        interviewId: '00000000-0000-0000-0000-000000000001',
        questionNumber: 1,
      }),
    ])
    await consumeScriptTurnSse(body, { onSentence: (s) => sentences.push(s) })
    expect(sentences).toEqual(['Hello there friend.'])
  })

  it('B: ignores sentence after complete', async () => {
    const sentences: string[] = []
    const completes: number[] = []
    const body = sseStream([
      encodeSseEvent('complete', {
        turn: { speech: 'Ready?', is_question: true, phase: 'warmup' },
        turnIndex: 1,
        interviewId: '00000000-0000-0000-0000-000000000001',
        questionNumber: 0,
      }),
      encodeSseEvent('sentence', { index: 0, speech: 'Ready?' }),
    ])
    await consumeScriptTurnSse(body, {
      onSentence: (s) => sentences.push(s),
      onComplete: () => completes.push(1),
    })
    expect(completes).toHaveLength(1)
    expect(sentences).toEqual([])
  })

  it('D: ignores duplicate complete events', async () => {
    const completes: string[] = []
    const body = sseStream([
      encodeSseEvent('complete', {
        turn: { speech: 'One.', is_question: true, phase: 'core' },
        turnIndex: 2,
        interviewId: '00000000-0000-0000-0000-000000000001',
        questionNumber: 1,
      }),
      encodeSseEvent('complete', {
        turn: { speech: 'Two.', is_question: true, phase: 'core' },
        turnIndex: 3,
        interviewId: '00000000-0000-0000-0000-000000000001',
        questionNumber: 2,
      }),
    ])
    const payload = await consumeScriptTurnSse(body, {
      onComplete: (p) => completes.push(p.turn.speech),
    })
    expect(completes).toEqual(['One.'])
    expect(payload?.turn.speech).toBe('One.')
  })

  it('throws on error event after optional sentence', async () => {
    const body = sseStream([
      encodeSseEvent('sentence', { index: 0, speech: 'Hello there friend.' }),
      encodeSseEvent('error', { error: 'invalid_turn_output', field: 'speech' }),
    ])
    await expect(consumeScriptTurnSse(body, {})).rejects.toThrow('invalid_turn_output')
  })

  it('wantsScriptTurnSse requires flag + Accept', () => {
    const prev = process.env.VOICE_LLM_TTS_STREAMING
    const prevPublic = process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING
    try {
      process.env.VOICE_LLM_TTS_STREAMING = 'false'
      delete process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING
      expect(isLlmTtsStreamingEnabled()).toBe(false)
      expect(
        wantsScriptTurnSse(
          new Request('http://localhost/api/interview/script/turn', {
            headers: { Accept: 'text/event-stream' },
          }),
        ),
      ).toBe(false)

      process.env.VOICE_LLM_TTS_STREAMING = 'true'
      expect(isLlmTtsStreamingEnabled()).toBe(true)
      expect(
        wantsScriptTurnSse(
          new Request('http://localhost/api/interview/script/turn', {
            headers: { Accept: 'application/json' },
          }),
        ),
      ).toBe(false)
      expect(
        wantsScriptTurnSse(
          new Request('http://localhost/api/interview/script/turn', {
            headers: { Accept: 'text/event-stream' },
          }),
        ),
      ).toBe(true)

      process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING = 'true'
      expect(isClientLlmTtsStreamingEnabled()).toBe(true)
      process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING = 'false'
      expect(isClientLlmTtsStreamingEnabled()).toBe(false)
    } finally {
      if (prev === undefined) delete process.env.VOICE_LLM_TTS_STREAMING
      else process.env.VOICE_LLM_TTS_STREAMING = prev
      if (prevPublic === undefined) delete process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING
      else process.env.NEXT_PUBLIC_VOICE_LLM_TTS_STREAMING = prevPublic
    }
  })
})

describe('streamScriptTurnLlm', () => {
  beforeEach(() => {
    vi.mocked(completeInterviewChatStream).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('emits first sentence before the full JSON finishes', async () => {
    const sentences: string[] = []
    let yielded = ''

    vi.mocked(completeInterviewChatStream).mockImplementation(async function* () {
      const chunks = [
        '{"speech":"That is a solid answer. ',
        'Can you share one specific example?",',
        '"phase":"core","is_question":true}',
      ]
      for (const c of chunks) {
        yielded += c
        yield c
      }
    })

    let yieldedWhenSentence = ''
    const result = await streamScriptTurnLlm({
      messages: [{ role: 'user', content: 'hi' }],
      onSentence: (s) => {
        sentences.push(s)
        yieldedWhenSentence = yielded
      },
    })

    expect(sentences).toEqual(['That is a solid answer.'])
    expect(result.firstSentence).toBe('That is a solid answer.')
    expect(result.rawJson).toContain('"phase":"core"')
    expect(yieldedWhenSentence.length).toBeGreaterThan(0)
    expect(yieldedWhenSentence.length).toBeLessThan(result.rawJson.length)
  })

  it('handles escaped quotes and chunk splits inside speech', async () => {
    const sentences: string[] = []
    vi.mocked(completeInterviewChatStream).mockReturnValue(
      tokenStream([
        '{"spe',
        'ech":"He said \\',
        '"hello\\" then left. Next question?",',
        '"phase":"core"}',
      ]),
    )

    const result = await streamScriptTurnLlm({
      messages: [{ role: 'user', content: 'hi' }],
      onSentence: (s) => sentences.push(s),
    })

    expect(result.firstSentence).toContain('He said "hello" then left.')
    expect(sentences[0]).toContain('"hello"')
    expect(result.rawJson).toContain('"phase":"core"')
  })

  it('flushes short speech without waiting for trailing JSON fields', async () => {
    const sentences: string[] = []
    vi.mocked(completeInterviewChatStream).mockReturnValue(
      tokenStream([
        '{"speech":"Ready?",',
        '"phase":"warmup","is_question":true}',
      ]),
    )

    await streamScriptTurnLlm({
      messages: [{ role: 'user', content: 'hi' }],
      onSentence: (s) => sentences.push(s),
    })

    expect(sentences[0]).toBe('Ready?')
  })
})
