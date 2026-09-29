import { describe, expect, it } from 'vitest'
import {
  JsonSpeechExtractor,
  remainingSpeechAfterPrefix,
  speechPrefixMatchesCanonical,
} from '@/lib/interview/json-speech-extractor'
import { SentenceStreamBuffer } from '@/lib/interview/sentence-stream-buffer'

function collectSpeech(chunks: string[]): { text: string; status: string } {
  let text = ''
  const extractor = new JsonSpeechExtractor((c) => {
    text += c
  })
  for (const chunk of chunks) extractor.append(chunk)
  return { text, status: extractor.status }
}

describe('JsonSpeechExtractor', () => {
  it('extracts a normal speech string', () => {
    const { text, status } = collectSpeech([
      '{"speech":"Hello there, welcome to the interview.","phase":"warmup"}',
    ])
    expect(text).toBe('Hello there, welcome to the interview.')
    expect(status).toBe('speech_complete')
  })

  it('handles escaped quotes', () => {
    const { text } = collectSpeech(['{"speech":"He said \\"hello\\" to me."}'])
    expect(text).toBe('He said "hello" to me.')
  })

  it('handles escaped backslashes', () => {
    const { text } = collectSpeech(['{"speech":"path C:\\\\Users\\\\me"}'])
    expect(text).toBe('path C:\\Users\\me')
  })

  it('handles escaped newlines', () => {
    const { text } = collectSpeech(['{"speech":"line one\\nline two"}'])
    expect(text).toBe('line one\nline two')
  })

  it('handles unicode escapes', () => {
    const { text } = collectSpeech(['{"speech":"nice \\u2603 day"}'])
    expect(text).toBe('nice ☃ day')
  })

  it('handles chunks split in the middle of "speech"', () => {
    const { text, status } = collectSpeech([
      '{"spe',
      'ech":"Welcome back to practice."}',
    ])
    expect(text).toBe('Welcome back to practice.')
    expect(status).toBe('speech_complete')
  })

  it('handles chunks split inside an escape sequence', () => {
    const { text } = collectSpeech([
      '{"speech":"He said \\',
      '"hello\\" then left."}',
    ])
    expect(text).toBe('He said "hello" then left.')
  })

  it('handles chunks split inside unicode escape', () => {
    const { text } = collectSpeech(['{"speech":"\\u26', '03 ok"}'])
    expect(text).toBe('☃ ok')
  })

  it('emits incrementally across chunks', () => {
    const parts: string[] = []
    const extractor = new JsonSpeechExtractor((c) => parts.push(c))
    extractor.append('{"speech":"Hel')
    extractor.append('lo world."}')
    expect(parts.join('')).toBe('Hello world.')
  })

  it('does not emit before the speech property', () => {
    const parts: string[] = []
    const extractor = new JsonSpeechExtractor((c) => parts.push(c))
    extractor.append('{"phase":"core","is_question":true')
    expect(parts).toEqual([])
    expect(extractor.status).toBe('seeking')
  })

  it('skips a prior property and still extracts speech', () => {
    const { text } = collectSpeech([
      '{"phase":"core","speech":"Tell me about a conflict at work."}',
    ])
    expect(text).toBe('Tell me about a conflict at work.')
  })

  it('does not emit garbage from a non-speech string value containing speech text', () => {
    const parts: string[] = []
    const extractor = new JsonSpeechExtractor((c) => parts.push(c))
    extractor.append('{"display_question":"What about \\"speech\\" here?"')
    expect(parts).toEqual([])
  })

  it('handles empty speech', () => {
    const { text, status } = collectSpeech(['{"speech":""}'])
    expect(text).toBe('')
    expect(status).toBe('speech_complete')
  })

  it('aborts on malformed leading content', () => {
    const { status } = collectSpeech(['not-json'])
    expect(status).toBe('aborted')
  })

  it('feeds SentenceStreamBuffer with plain text only (sentence across chunks)', () => {
    const sentences: string[] = []
    const buffer = new SentenceStreamBuffer((s) => sentences.push(s), { minSentenceChars: 10 })
    const extractor = new JsonSpeechExtractor((c) => buffer.append(c))

    extractor.append('{"speech":"That is a solid answer. ')
    expect(sentences).toEqual(['That is a solid answer.'])

    extractor.append('Can you share a specific example from your last internship?"}')
    buffer.flush()
    expect(sentences).toEqual([
      'That is a solid answer.',
      'Can you share a specific example from your last internship?',
    ])
    expect(sentences.every((s) => !s.includes('{') && !s.includes('speech'))).toBe(true)
  })

  it('supports multiple sentences in speech for buffer consumers', () => {
    const sentences: string[] = []
    const buffer = new SentenceStreamBuffer((s) => sentences.push(s), { minSentenceChars: 8 })
    const extractor = new JsonSpeechExtractor((c) => buffer.append(c))
    extractor.append(
      '{"speech":"First sentence here. Second sentence follows. Third one ends it."}',
    )
    buffer.flush()
    expect(sentences.length).toBeGreaterThanOrEqual(2)
    expect(sentences[0]).toBe('First sentence here.')
  })
})

describe('remainingSpeechAfterPrefix', () => {
  it('returns the tail after an exact spoken prefix', () => {
    expect(
      remainingSpeechAfterPrefix(
        'First sentence here. Second sentence follows.',
        'First sentence here.',
      ),
    ).toBe('Second sentence follows.')
  })

  it('returns empty when the full speech equals the spoken prefix', () => {
    expect(remainingSpeechAfterPrefix('Only one sentence.', 'Only one sentence.')).toBe('')
  })

  it('does not invent remaining text when prefix is missing', () => {
    expect(remainingSpeechAfterPrefix('Hello there.', 'Goodbye.')).toBe('')
  })

  it('tolerates whitespace drift', () => {
    expect(
      remainingSpeechAfterPrefix(
        'First  sentence here.  Second follows.',
        'First sentence here.',
      ),
    ).toBe('Second follows.')
  })
})

describe('speechPrefixMatchesCanonical', () => {
  it('accepts a true leading sentence', () => {
    expect(
      speechPrefixMatchesCanonical(
        'Alright — let’s dig into the interview questions.',
        'Alright — let’s dig into the interview questions.',
      ),
    ).toBe(true)
  })

  it('rejects a previous-turn warmup sentence against canned core entry', () => {
    expect(
      speechPrefixMatchesCanonical(
        "Alright — let's dig into the interview questions.",
        'Good. Today is a easy technical interview for Software Engineer.',
      ),
    ).toBe(false)
  })
})
