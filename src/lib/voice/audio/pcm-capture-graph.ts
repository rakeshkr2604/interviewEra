/**
 * Float32 mono samples → 16-bit PCM ArrayBuffer (little-endian).
 * Shared by ScriptProcessor and AudioWorklet capture paths.
 */
export function float32ToInt16Pcm(input: Float32Array): ArrayBuffer {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out.buffer
}

export type PcmCaptureMode = 'audio_worklet' | 'script_processor'

export interface PcmCaptureGraph {
  mode: PcmCaptureMode
  disconnect: () => void
}

const WORKLET_PROCESSOR_NAME = 'pcm-capture-processor'
const DEFAULT_FRAME_SIZE = 4096

const WORKLET_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length > 0) {
      this.port.postMessage(channel);
    }
    return true;
  }
}
registerProcessor('${WORKLET_PROCESSOR_NAME}', PcmCaptureProcessor);
`

export function supportsAudioWorkletCapture(ctx: AudioContext): boolean {
  return typeof ctx.audioWorklet?.addModule === 'function'
}

/**
 * Build a silent mic capture graph that emits 16 kHz mono Int16 PCM frames.
 * Prefers AudioWorklet (off main thread); falls back to ScriptProcessor.
 */
export async function createPcmCaptureGraph(
  ctx: AudioContext,
  stream: MediaStream,
  onPcm: (data: ArrayBuffer) => void,
  opts?: {
    frameSize?: number
    onModeSelected?: (mode: PcmCaptureMode) => void
  },
): Promise<PcmCaptureGraph> {
  const frameSize = opts?.frameSize ?? DEFAULT_FRAME_SIZE
  const source = ctx.createMediaStreamSource(stream)
  const silentSink = ctx.createGain()
  silentSink.gain.value = 0
  silentSink.connect(ctx.destination)

  const emitPcm = (float32: Float32Array) => {
    onPcm(float32ToInt16Pcm(float32))
  }

  if (supportsAudioWorkletCapture(ctx)) {
    try {
      const blob = new Blob([WORKLET_SOURCE], { type: 'application/javascript' })
      const moduleUrl = URL.createObjectURL(blob)
      try {
        await ctx.audioWorklet.addModule(moduleUrl)
      } finally {
        URL.revokeObjectURL(moduleUrl)
      }

      const worklet = new AudioWorkletNode(ctx, WORKLET_PROCESSOR_NAME)
      const onMessage = (event: MessageEvent<Float32Array>) => {
        const samples = event.data
        if (samples?.length) emitPcm(samples)
      }
      worklet.port.onmessage = onMessage
      source.connect(worklet)
      worklet.connect(silentSink)

      opts?.onModeSelected?.('audio_worklet')
      return {
        mode: 'audio_worklet',
        disconnect: () => {
          worklet.port.onmessage = null
          try { worklet.disconnect() } catch { /* */ }
          try { source.disconnect() } catch { /* */ }
          try { silentSink.disconnect() } catch { /* */ }
        },
      }
    } catch {
      // Fall through to ScriptProcessor when worklet module load fails.
    }
  }

  const processor = ctx.createScriptProcessor(frameSize, 1, 1)
  processor.onaudioprocess = (e: AudioProcessingEvent) => {
    emitPcm(e.inputBuffer.getChannelData(0))
  }
  source.connect(processor)
  processor.connect(silentSink)

  opts?.onModeSelected?.('script_processor')
  return {
    mode: 'script_processor',
    disconnect: () => {
      processor.onaudioprocess = null
      try { processor.disconnect() } catch { /* */ }
      try { source.disconnect() } catch { /* */ }
      try { silentSink.disconnect() } catch { /* */ }
    },
  }
}
