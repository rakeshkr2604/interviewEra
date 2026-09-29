/**
 * Sentence stream buffer for LLM → TTS streaming.
 * Overlaps LLM text generation with TTS synthesis by detecting completed natural
 * sentences on `.`, `?`, `!` boundaries.
 */

const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'vs',
  'eg',
  'ie',
  'etc',
  'st',
  'approx',
  'no',
  'vol',
  'dept',
]);

export class SentenceStreamBuffer {
  private buffer = '';
  private sentenceIndex = 0;
  private readonly minSentenceChars: number;

  constructor(
    private readonly onSentence: (sentence: string, index: number) => void,
    opts?: { minSentenceChars?: number },
  ) {
    this.minSentenceChars = opts?.minSentenceChars ?? 15;
  }

  append(chunk: string): void {
    this.buffer += chunk;
    this.scan();
  }

  private scan(): void {
    let searchStart = 0;

    while (searchStart < this.buffer.length) {
      const matchIndex = this.buffer.slice(searchStart).search(/[.!?\n]/);
      if (matchIndex === -1) break;

      const pos = searchStart + matchIndex;
      const char = this.buffer[pos];
      const nextChar = this.buffer[pos + 1];
      const isEnd = pos === this.buffer.length - 1;
      const hasSpaceAfter = isEnd || /\s/.test(nextChar);

      if (!hasSpaceAfter) {
        searchStart = pos + 1;
        continue;
      }

      if (char === '.') {
        const wordMatch = this.buffer.slice(0, pos).match(/\b([A-Za-z]+)$/);
        const prevWord = wordMatch ? wordMatch[1].toLowerCase() : '';
        if (ABBREVIATIONS.has(prevWord)) {
          searchStart = pos + 1;
          continue;
        }

        const prevChar = this.buffer[pos - 1];
        if (/\d/.test(prevChar ?? '') && /\d/.test(nextChar ?? '')) {
          searchStart = pos + 1;
          continue;
        }
      }

      const sentenceText = this.buffer.slice(0, pos + 1).trim();
      const remaining = this.buffer.slice(pos + 1);

      if (sentenceText.length >= this.minSentenceChars) {
        const idx = this.sentenceIndex++;
        this.buffer = remaining;
        searchStart = 0;
        this.onSentence(sentenceText, idx);
      } else {
        searchStart = pos + 1;
      }
    }
  }

  flush(): void {
    const trimmed = this.buffer.trim();
    if (trimmed) {
      const idx = this.sentenceIndex++;
      this.buffer = '';
      this.onSentence(trimmed, idx);
    }
  }
}
