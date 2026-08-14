import { describe, expect, it } from 'vitest'
import { splitIntoSpeechChunks } from '@/lib/voice/tts/speech-chunker'

describe('TTS P0 Optimization Benchmarks', () => {
  const shortText = 'Great response! Let us move on to the next question.'
  const mediumText =
    'That is a solid explanation of microservices architecture. ' +
    'Now, how do you manage distributed transactions across service boundaries without introducing tight coupling?'
  const longText =
    'Your approach to load balancing and database read replicas is very clear. ' +
    'However, when dealing with extreme traffic spikes, database connections can easily get exhausted. ' +
    'Can you walk me through your connection pooling strategy and how you handle circuit breaking when a downstream database becomes degraded?'

  it('benchmark chunking for short text (~50 chars)', () => {
    const chunks = splitIntoSpeechChunks(shortText)
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0].length).toBeLessThanOrEqual(55)
  })

  it('benchmark chunking for medium text (~160 chars)', () => {
    const chunks = splitIntoSpeechChunks(mediumText)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].length).toBeLessThanOrEqual(65)
  })

  it('benchmark chunking for long text (~330 chars)', () => {
    const chunks = splitIntoSpeechChunks(longText)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0].length).toBeLessThanOrEqual(75)
  })
})
