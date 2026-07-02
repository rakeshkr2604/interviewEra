/**
 * Ring buffer for PCM frames captured before the Deepgram WebSocket reaches OPEN.
 * Prevents losing opening syllables during the CONNECTING window.
 *
 * Capacity defaults to ~3s of 16 kHz mono int16 (~96 KB).
 */
export class PcmSendBuffer {
  private readonly chunks: ArrayBuffer[] = []
  private totalBytes = 0

  constructor(private readonly maxBytes = 96_000) {}

  get queuedBytes(): number {
    return this.totalBytes
  }

  get queuedChunks(): number {
    return this.chunks.length
  }

  /** Store a frame; drops oldest data when over capacity. */
  enqueue(data: ArrayBuffer): void {
    if (data.byteLength === 0) return
    this.chunks.push(data)
    this.totalBytes += data.byteLength
    while (this.totalBytes > this.maxBytes && this.chunks.length > 0) {
      const dropped = this.chunks.shift()!
      this.totalBytes -= dropped.byteLength
    }
  }

  /** Send all queued frames in order; returns count flushed. */
  flush(send: (data: ArrayBuffer) => void): number {
    let count = 0
    while (this.chunks.length > 0) {
      const chunk = this.chunks.shift()!
      this.totalBytes -= chunk.byteLength
      send(chunk)
      count += 1
    }
    return count
  }

  clear(): void {
    this.chunks.length = 0
    this.totalBytes = 0
  }
}
