'use client';

import { useRef, useState, useCallback } from 'react';

type CleanupFn = () => void;

export interface UseMicrophoneReturn {
  isRecording: boolean;
  startRecording: (onAudioData: (data: ArrayBuffer) => void) => Promise<CleanupFn>;
  stopRecording: () => void;
}

// Captures mic audio at 16 kHz mono, converts Float32 → Int16, and calls
// onAudioData with each PCM chunk — the format Deepgram expects over WebSocket.
export function useMicrophone(): UseMicrophoneReturn {
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const cleanupRef = useRef<CleanupFn | null>(null);

  const startRecording = useCallback(
    async (onAudioData: (data: ArrayBuffer) => void): Promise<CleanupFn> => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      // ScriptProcessor is deprecated but still the most compatible cross-browser
      // option for raw PCM access without a worklet setup.
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        onAudioData(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setIsRecording(true);

      const cleanup: CleanupFn = () => {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        audioContext.close().catch(() => {});
        audioContextRef.current = null;
        setIsRecording(false);
      };

      cleanupRef.current = cleanup;
      return cleanup;
    },
    [],
  );

  const stopRecording = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  return { isRecording, startRecording, stopRecording };
}
