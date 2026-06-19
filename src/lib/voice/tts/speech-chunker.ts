/**
 * Pure text → speech-chunk splitter for low-latency TTS (audit Phase 5 —
 * "streaming playback ASAP"). Splitting on sentence boundaries lets the
 * pipeline play the first sentence while later sentences are still being
 * synthesized, cutting time-to-first-audio.
 *
 * Rules:
 *  - Split on sentence-terminal punctuation (. ! ? …) and newlines.
 *  - Merge fragments shorter than `minChars` into the previous chunk so we
 *    don't fire a request per comma (choppy audio + request storms).
 *  - Never split inside a word; an over-long sentence is emitted whole.
 */
export interface ChunkOptions {
  minChars?: number
  maxChars?: number
}

const DEFAULT_MIN = 60
const DEFAULT_MAX = 280

export function splitIntoSpeechChunks(input: string, opts?: ChunkOptions): string[] {
  const text = input.replace(/\s+/g, ' ').trim()
  if (!text) return []

  const minChars = opts?.minChars ?? DEFAULT_MIN
  const maxChars = opts?.maxChars ?? DEFAULT_MAX

  // Split keeping the terminator attached to the preceding sentence.
  const sentences = text.match(/[^.!?…\n]+[.!?…]*\s*/g) ?? [text]

  const chunks: string[] = []
  let buffer = ''

  const flush = () => {
    const trimmed = buffer.trim()
    if (trimmed) chunks.push(trimmed)
    buffer = ''
  }

  for (const raw of sentences) {
    const sentence = raw.trim()
    if (!sentence) continue

    if (!buffer) {
      buffer = sentence
    } else if (buffer.length < minChars) {
      // Only coalesce while the buffer is still too short — keep chunks small
      // so the first audio plays fast (streaming), not greedily filled.
      buffer = `${buffer} ${sentence}`
    } else {
      flush()
      buffer = sentence
    }

    if (buffer.length >= maxChars) flush()
  }
  flush()

  return chunks
}
