'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProsodicTTS, TTSFallbackToBrowserError } from '@/lib/voice/tts-client';
import type { InterviewerVoice, InterviewerTone } from '@/lib/voice/tts-client';
import { lifecycleLog, lifecycleWarn } from '@/lib/voice/lifecycle-log';
import {
  getSharedInterviewAudioContext,
  resumeSharedInterviewAudioContext,
} from '@/lib/voice/audio-gesture';
import { interviewFlowLog } from '@/lib/voice/interview-flow-log';
import { normalizePlaybackArg, type PlaybackCallbacks } from '@/lib/voice/playback-callbacks';

export interface UseVoicePlayerReturn {
  isPlaying: boolean;
  /** 0–1 progress during ElevenLabs playback (drives caption/lipsync timing). */
  playbackProgress: number;
  error: string | null;
  speak: (
    text: string,
    tone: InterviewerTone,
    callbacks?: (() => void) | PlaybackCallbacks,
  ) => Promise<void>;
  stop: () => void;
}

export function useVoicePlayer(voice: InterviewerVoice): UseVoicePlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ttsRef = useRef<ProsodicTTS | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const seqRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);
  const fetchAbortRef = useRef<AbortController | null>(null);

  const clearProgressLoop = useCallback(() => {
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    setPlaybackProgress(0);
  }, []);

  function getClient(): ProsodicTTS {
    if (!ttsRef.current) {
      ttsRef.current = new ProsodicTTS();
    }
    return ttsRef.current;
  }

  function getAudioContext(): AudioContext | null {
    if (!mountedRef.current) return null;
    return getSharedInterviewAudioContext();
  }

  const stop = useCallback(() => {
    seqRef.current += 1;
    fetchAbortRef.current?.abort();
    fetchAbortRef.current = null;
    clearProgressLoop();
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (mountedRef.current) setIsPlaying(false);
    lifecycleLog('voice-player', 'stop', { seq: seqRef.current });
  }, [clearProgressLoop]);

  const speak = useCallback(
    async (text: string, tone: InterviewerTone, callbacksArg?: (() => void) | PlaybackCallbacks) => {
      const callbacks = normalizePlaybackArg(callbacksArg);
      const client = getClient();
      stop();
      const mySeq = ++seqRef.current;
      if (!mountedRef.current) {
        lifecycleWarn('voice-player', 'speak_aborted_unmounted', { seq: mySeq });
        callbacks.onPlaybackFailed?.('Voice player unavailable.');
        return;
      }

      setError(null);
      lifecycleLog('voice-player', 'speak_start', { seq: mySeq, textLen: text.length, tone });

      const abortController = new AbortController();
      fetchAbortRef.current = abortController;

      try {
        const audioData = await client.speak(text, { voice, tone }, abortController.signal);
        if (mySeq !== seqRef.current || !mountedRef.current) {
          lifecycleLog('voice-player', 'speak_superseded_after_fetch', { mySeq, current: seqRef.current });
          return;
        }

        const ctx = getAudioContext();
        if (!ctx) {
          lifecycleWarn('voice-player', 'speak_no_context', { mySeq });
          callbacks.onPlaybackFailed?.('Audio context unavailable.');
          return;
        }
        const resumed = await resumeSharedInterviewAudioContext();
        if (!resumed && ctx.state !== 'running') {
          callbacks.onPlaybackFailed?.('Audio playback is blocked. Tap Retry Audio.');
          return;
        }
        if (mySeq !== seqRef.current || !mountedRef.current) {
          lifecycleLog('voice-player', 'speak_superseded_after_resume', { mySeq, current: seqRef.current });
          return;
        }

        const buffer = await ctx.decodeAudioData(audioData);
        if (mySeq !== seqRef.current || !mountedRef.current) {
          lifecycleLog('voice-player', 'speak_superseded_after_decode', { mySeq, current: seqRef.current });
          return;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        sourceRef.current = source;

        source.onended = () => {
          if (mySeq !== seqRef.current) {
            lifecycleLog('voice-player', 'onended_superseded', { mySeq, current: seqRef.current });
            return;
          }
          if (sourceRef.current === source) sourceRef.current = null;
          clearProgressLoop();
          if (mountedRef.current) {
            setPlaybackProgress(1);
            setIsPlaying(false);
          }
          lifecycleLog('voice-player', 'speak_end', { seq: mySeq });
          callbacks.onPlaybackComplete?.();
        };

        const startAt = ctx.currentTime;
        const duration = buffer.duration;

        const tickProgress = () => {
          if (mySeq !== seqRef.current || !mountedRef.current) return;
          const elapsed = Math.max(0, ctx.currentTime - startAt);
          const p = duration > 0 ? Math.min(1, elapsed / duration) : 0;
          setPlaybackProgress(p);
          if (p < 1 && sourceRef.current === source) {
            progressRafRef.current = requestAnimationFrame(tickProgress);
          }
        };

        source.start(0);
        if (mountedRef.current && mySeq === seqRef.current) {
          setIsPlaying(true);
          setPlaybackProgress(0);
          progressRafRef.current = requestAnimationFrame(tickProgress);
          interviewFlowLog('tts', 'elevenlabs_playback_started', { seq: mySeq, durationSec: duration });
          callbacks.onPlaybackStarted?.();
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          lifecycleLog('voice-player', 'speak_aborted', { mySeq });
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        lifecycleWarn('voice-player', 'speak_failed', { mySeq, err: message });
        if (mountedRef.current && mySeq === seqRef.current) setIsPlaying(false);

        let failMessage = 'Voice playback failed.';
        if (mountedRef.current && mySeq === seqRef.current) {
          if (err instanceof TTSFallbackToBrowserError) {
            failMessage =
              err.httpStatus === 429
                ? 'Voice playback limit reached.'
                : 'Voice service unavailable right now.';
            setError(failMessage);
          } else if (message.includes('decode') || message.includes('AudioContext') || message.includes('autoplay')) {
            failMessage = 'Audio playback is blocked. Tap Retry Audio on this question.';
            setError(failMessage);
          } else {
            setError(failMessage);
          }
        }
        callbacks.onPlaybackFailed?.(failMessage);
      } finally {
        if (fetchAbortRef.current === abortController) {
          fetchAbortRef.current = null;
        }
      }
    },
    [voice, stop, clearProgressLoop],
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      seqRef.current += 1;
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* already stopped */ }
        sourceRef.current = null;
      }
      lifecycleLog('voice-player', 'unmounted');
    };
  }, []);

  return { isPlaying, playbackProgress, error, speak, stop };
}
