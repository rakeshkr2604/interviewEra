'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProsodicTTS, TTSFallbackToBrowserError } from '@/lib/voice/tts-client';
import type { InterviewerId } from '@/lib/config/interviewers';
import type { InterviewerTone, TTSVoiceKey } from '@/lib/voice/tts-client';
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

/**
 * MediaSource + streaming playback is only attempted where MSE can actually
 * decode ElevenLabs' mp3 stream. iOS Safari/WebKit (all iOS browsers, since
 * they share WebKit) never expose a usable MediaSource for 'audio/mpeg' —
 * `needsAudioGestureUnlock()`'s iOS check would also catch this, but we test
 * the capability directly so the gate stays correct if WebKit ever changes.
 * Those browsers keep using the proven buffered Web Audio path unchanged.
 */
function supportsMseAudioStreaming(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('MediaSource' in window)) return false;
  try {
    return MediaSource.isTypeSupported('audio/mpeg');
  } catch {
    return false;
  }
}

export function useVoicePlayer(voice: TTSVoiceKey | InterviewerId): UseVoicePlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const ttsRef = useRef<ProsodicTTS | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const streamAudioElRef = useRef<HTMLAudioElement | null>(null);
  const streamObjectUrlRef = useRef<string | null>(null);
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

  function teardownStreamAudioEl(): void {
    const el = streamAudioElRef.current;
    if (el) {
      try { el.pause(); } catch { /* already stopped */ }
      el.removeAttribute('src');
      try { el.load(); } catch { /* best-effort cleanup */ }
      streamAudioElRef.current = null;
    }
    if (streamObjectUrlRef.current) {
      URL.revokeObjectURL(streamObjectUrlRef.current);
      streamObjectUrlRef.current = null;
    }
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
    teardownStreamAudioEl();
    if (mountedRef.current) setIsPlaying(false);
    lifecycleLog('voice-player', 'stop', { seq: seqRef.current });
  }, [clearProgressLoop]);

  /** Existing proven path: full ArrayBuffer → decodeAudioData → AudioBufferSourceNode. */
  const playBuffered = useCallback(
    async (
      audioData: ArrayBuffer,
      mySeq: number,
      callbacks: PlaybackCallbacks,
    ): Promise<void> => {
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
    },
    [clearProgressLoop],
  );

  /**
   * Streaming path: pipe the /api/tts response body into a MediaSource
   * SourceBuffer as chunks arrive, so playback can start on the first chunk
   * instead of waiting for the whole response. Falls back to `playBuffered`
   * (using whatever bytes were already read, no re-fetch) if MSE setup or
   * appending fails before anything played — same audible result, just later.
   */
  const playStreamed = useCallback(
    async (
      response: Response,
      mySeq: number,
      callbacks: PlaybackCallbacks,
    ): Promise<void> => {
      if (!response.body) {
        const audioData = await response.arrayBuffer();
        if (mySeq !== seqRef.current || !mountedRef.current) return;
        await playBuffered(audioData, mySeq, callbacks);
        return;
      }

      // A resumed shared AudioContext correlates with the page already having
      // an unlocked autoplay gesture, which HTMLMediaElement.play() also needs.
      const resumed = await resumeSharedInterviewAudioContext();
      if (!resumed) {
        const ctx = getAudioContext();
        if (!ctx || ctx.state !== 'running') {
          callbacks.onPlaybackFailed?.('Audio playback is blocked. Tap Retry Audio.');
          return;
        }
      }
      if (mySeq !== seqRef.current || !mountedRef.current) return;

      const reader = response.body.getReader();
      const collected: Uint8Array[] = [];
      let startedPlaying = false;

      const fallbackToBuffered = async (): Promise<void> => {
        try {
          await reader.cancel();
        } catch { /* already errored */ }
        teardownStreamAudioEl();
        if (startedPlaying || mySeq !== seqRef.current || !mountedRef.current) return;
        const total = collected.reduce((n, c) => n + c.length, 0);
        const merged = new Uint8Array(total);
        let offset = 0;
        for (const chunk of collected) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }
        await playBuffered(merged.buffer, mySeq, callbacks);
      };

      await new Promise<void>((resolve) => {
        const audio = new Audio();
        streamAudioElRef.current = audio;
        const mediaSource = new MediaSource();
        const objectUrl = URL.createObjectURL(mediaSource);
        streamObjectUrlRef.current = objectUrl;
        audio.src = objectUrl;

        let sourceBuffer: SourceBuffer | null = null;
        let streamDone = false;
        const pending: Uint8Array[] = [];
        let settled = false;

        const finishWithFallback = (reason: string) => {
          if (settled) return;
          settled = true;
          lifecycleWarn('voice-player', 'stream_playback_fallback', { mySeq, reason });
          void fallbackToBuffered().finally(resolve);
        };

        const appendNext = () => {
          if (!sourceBuffer || sourceBuffer.updating || settled) return;
          if (pending.length > 0) {
            const chunk = pending.shift()!;
            try {
              sourceBuffer.appendBuffer(chunk as unknown as ArrayBuffer);
            } catch (err) {
              finishWithFallback(err instanceof Error ? err.message : 'append_failed');
            }
            return;
          }
          if (streamDone && mediaSource.readyState === 'open') {
            try { mediaSource.endOfStream(); } catch { /* already ending */ }
          }
        };

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (mySeq !== seqRef.current || !mountedRef.current) {
                void reader.cancel().catch(() => {});
                return;
              }
              if (done) {
                streamDone = true;
                appendNext();
                return;
              }
              if (value) {
                collected.push(value);
                pending.push(value);
                appendNext();
              }
            }
          } catch (err) {
            finishWithFallback(err instanceof Error ? err.message : 'stream_read_failed');
          }
        };

        mediaSource.addEventListener('sourceopen', () => {
          if (settled) return;
          try {
            sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          } catch (err) {
            finishWithFallback(err instanceof Error ? err.message : 'add_source_buffer_failed');
            return;
          }
          sourceBuffer.addEventListener('updateend', appendNext);
          sourceBuffer.addEventListener('error', () => finishWithFallback('source_buffer_error'));
          void pump();
        }, { once: true });

        audio.addEventListener('playing', () => {
          if (settled || mySeq !== seqRef.current || !mountedRef.current) return;
          startedPlaying = true;
          setIsPlaying(true);
          interviewFlowLog('tts', 'elevenlabs_stream_playback_started', { seq: mySeq });
          callbacks.onPlaybackStarted?.();

          const tickProgress = () => {
            if (settled || mySeq !== seqRef.current || !mountedRef.current) return;
            const duration = audio.duration;
            if (Number.isFinite(duration) && duration > 0) {
              setPlaybackProgress(Math.min(1, audio.currentTime / duration));
            }
            if (!audio.ended && streamAudioElRef.current === audio) {
              progressRafRef.current = requestAnimationFrame(tickProgress);
            }
          };
          progressRafRef.current = requestAnimationFrame(tickProgress);
        }, { once: true });

        audio.addEventListener('ended', () => {
          if (settled) return;
          settled = true;
          clearProgressLoop();
          teardownStreamAudioEl();
          if (mountedRef.current && mySeq === seqRef.current) {
            setPlaybackProgress(1);
            setIsPlaying(false);
          }
          lifecycleLog('voice-player', 'stream_speak_end', { seq: mySeq });
          callbacks.onPlaybackComplete?.();
          resolve();
        }, { once: true });

        audio.addEventListener('error', () => {
          finishWithFallback('audio_element_error');
        });

        audio.play().catch((err) => {
          finishWithFallback(err instanceof Error ? err.message : 'play_rejected');
        });
      });
    },
    [playBuffered, clearProgressLoop],
  );

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
        const useStreaming = supportsMseAudioStreaming();

        if (useStreaming) {
          const response = await client.speakStream(text, { voice, tone }, abortController.signal);
          if (mySeq !== seqRef.current || !mountedRef.current) {
            lifecycleLog('voice-player', 'speak_superseded_after_fetch', { mySeq, current: seqRef.current });
            return;
          }
          await playStreamed(response, mySeq, callbacks);
        } else {
          const audioData = await client.speak(text, { voice, tone }, abortController.signal);
          if (mySeq !== seqRef.current || !mountedRef.current) {
            lifecycleLog('voice-player', 'speak_superseded_after_fetch', { mySeq, current: seqRef.current });
            return;
          }
          await playBuffered(audioData, mySeq, callbacks);
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
    [voice, stop, playBuffered, playStreamed],
  );

  // StrictMode remount: cleanup sets mountedRef false; useRef persists across
  // remount — reset true on every mount so speak() is not permanently blocked.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      seqRef.current += 1;
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = null;
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* already stopped */ }
        sourceRef.current = null;
      }
      teardownStreamAudioEl();
      lifecycleLog('voice-player', 'unmounted');
    };
  }, []);

  return { isPlaying, playbackProgress, error, speak, stop };
}
