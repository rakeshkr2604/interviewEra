import { describe, expect, it } from 'vitest'
import { splitIntoSpeechChunks } from '@/lib/voice/tts/speech-chunker'

describe('splitIntoSpeechChunks', () => {
  it('returns empty for blank input', () => {
    expect(splitIntoSpeechChunks('')).toEqual([])
    expect(splitIntoSpeechChunks('   ')).toEqual([])
  })

  it('returns the whole text when there is no terminal punctuation', () => {
    expect(splitIntoSpeechChunks('tell me about yourself')).toEqual([
      'tell me about yourself',
    ])
  })

  it('merges short sentences up to the min length', () => {
    // Each is short, so they merge into one chunk.
    const chunks = splitIntoSpeechChunks('Hi. Welcome. Ready?')
    expect(chunks).toEqual(['Hi. Welcome. Ready?'])
  })

  it('splits long multi-sentence text into multiple chunks', () => {
    const long =
      'Describe a challenging project you worked on recently and explain the architecture you chose. ' +
      'Then walk me through how you handled scaling and the trade-offs you accepted along the way. ' +
      'Finally, tell me what you would do differently if you started over today with more resources.'
    const chunks = splitIntoSpeechChunks(long)
    expect(chunks.length).toBeGreaterThan(1)
    // Reassembling preserves content (modulo whitespace).
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toBe(long.replace(/\s+/g, ' ').trim())
  })

  it('preserves terminal punctuation on chunks', () => {
    const chunks = splitIntoSpeechChunks(
      'This is the first reasonably long sentence that exceeds the minimum length threshold. ' +
        'And this is the second reasonably long sentence that also exceeds the threshold nicely.',
    )
    expect(chunks[0].endsWith('.')).toBe(true)
  })

  it('normalizes whitespace', () => {
    expect(splitIntoSpeechChunks('hello    world\n\n')).toEqual(['hello world'])
  })

  it('emits an over-long single sentence whole', () => {
    const big = 'word '.repeat(120).trim() // ~600 chars, no punctuation
    const chunks = splitIntoSpeechChunks(big)
    expect(chunks).toEqual([big])
  })
})
