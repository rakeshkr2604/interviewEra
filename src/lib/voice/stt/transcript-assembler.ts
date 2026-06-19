/**
 * Pure transcript assembler for the STT pipeline.
 *
 * Single source of truth for a turn's answer text (audit: "never loses
 * transcript data", "never duplicates transcripts"). Finalized segments are
 * appended with consecutive-duplicate suppression (Deepgram can re-emit the
 * same final segment); the interim chunk is held separately and cleared on the
 * next final. `merged()` is what the submit path reads.
 *
 * No browser APIs, no React — fully unit-testable.
 */
export class TranscriptAssembler {
  private finals: string[] = []
  private interim = ''
  private lastFinal = ''

  /** Append a finalized segment, suppressing exact consecutive repeats. */
  appendFinal(segment: string): void {
    const clean = segment.trim()
    if (!clean) return
    if (clean === this.lastFinal) return
    this.finals.push(clean)
    this.lastFinal = clean
    this.interim = ''
  }

  /** Set the current interim (partial) chunk. */
  setInterim(text: string): void {
    this.interim = text.trim()
  }

  /** Joined finalized text only. */
  final(): string {
    return this.finals.join(' ').replace(/\s+/g, ' ').trim()
  }

  /** Finalized + interim — the authoritative answer payload for submit. */
  merged(): string {
    const f = this.final()
    if (!this.interim) return f
    if (!f) return this.interim
    return `${f} ${this.interim}`.replace(/\s+/g, ' ').trim()
  }

  hasContent(): boolean {
    return this.finals.length > 0 || this.interim.length > 0
  }

  /** Restore prior text (e.g. after a transport restart) without re-firing. */
  restore(text: string): void {
    const clean = text.trim()
    this.finals = clean ? [clean] : []
    this.lastFinal = clean
    this.interim = ''
  }

  /** Clear everything for a new turn. */
  reset(): void {
    this.finals = []
    this.interim = ''
    this.lastFinal = ''
  }
}
