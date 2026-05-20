'use client';

import { useCallback, useRef, useState } from 'react';
import { ProsodicTTS } from '@/lib/voice/tts-client';
import type { InterviewerVoice, InterviewerTone } from '@/lib/voice/tts-client';

export interface UseVoicePlayerReturn {
  isPlaying: boolean;
  speak: (text: string, tone: InterviewerTone, onComplete?: () => void) => Promise<void>;
  stop: () => void;
}

// useVoicePlayer: fetches ElevenLabs audio for a given tone and plays it
// through the Web Audio API.  A single AudioContext is reused across calls;
// only one utterance plays at a time (the previous source is stopped first).
export function useVoicePlayer(voice: InterviewerVoice): UseVoicePlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const ttsRef = useRef<ProsodicTTS | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  function getClient(): ProsodicTTS {
    if (!ttsRef.current) {
      ttsRef.current = new ProsodicTTS();
    }
    return ttsRef.current;
  }

  function getAudioContext(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  const stop = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.onended = null;
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string, tone: InterviewerTone, onComplete?: () => void) => {
      const client = getClient();
      stop(); // cancel any currently-playing audio
      setIsPlaying(true);

      try {
        const audioData = await client.speak(text, { voice, tone });

        const ctx = getAudioContext();
        // Resume context if suspended by browser autoplay policy
        if (ctx.state === 'suspended') await ctx.resume();

        const buffer = await ctx.decodeAudioData(audioData);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        sourceRef.current = source;

        source.onended = () => {
          sourceRef.current = null;
          setIsPlaying(false);
          onComplete?.();
        };

        source.start();
      } catch (err) {
        console.error('[useVoicePlayer] Playback failed:', err);
        setIsPlaying(false);
        // Still call onComplete so the interview flow isn't blocked by a TTS error
        onComplete?.();
      }
    },
    [voice, stop],
  );

  return { isPlaying, speak, stop };
}
