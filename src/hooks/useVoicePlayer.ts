'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProsodicTTS, TTSFallbackToBrowserError } from '@/lib/voice/tts-client';
import type { InterviewerVoice, InterviewerTone } from '@/lib/voice/tts-client';
import { lifecycleLog, lifecycleWarn } from '@/lib/voice/lifecycle-log';

export interface UseVoicePlayerReturn {
  isPlaying: boolean;
  /**
   * Last user-surfaceable failure on the ElevenLabs path. Cleared at the start
   * of each speak() call. `null` when no failure since the last successful
   * playback or since hook mount. Renders alongside the existing browser-TTS
   * speechError banner so the user always knows when voice degraded.
   */
  error: string | null;
  speak: (text: string, tone: InterviewerTone, onComplete?: () => void) => Promise<void>;
  stop: () => void;
}

// useVoicePlayer: fetches ElevenLabs audio for a given tone and plays it
// through the Web Audio API.  A single AudioContext is reused across calls;
// only one utterance plays at a time (the previous source is stopped first).
//
// LIFECYCLE OWNERSHIP
// -------------------
// This hook owns:
//   • a single AudioContext (closed on unmount)
//   • the in-flight AudioBufferSourceNode
//   • the "active utterance" generation token
//
// Generation token: every call to speak() or stop() bumps `seqRef.current`. The
// post-await branches and source.onended callback compare their captured `mySeq`
// to the live `seqRef.current`; if they differ, the callback was superseded by
// a newer speak/stop and is ignored. This makes overlapping speak() calls and
// the natural-end-vs-stop race deterministic without re-architecting playback.
export function useVoicePlayer(voice: InterviewerVoice): UseVoicePlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  // User-visible error state. Distinct from the silent logs we already emit —
  // the previous version swallowed failures here, leaving the user staring at
  // a frozen avatar with no idea voice had broken. We always still call
  // onComplete (release the phase machine), but the UI now surfaces what
  // happened.
  const [error, setError] = useState<string | null>(null);
  const ttsRef = useRef<ProsodicTTS | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  // Monotonic id of the current utterance — see header comment.
  const seqRef = useRef<number>(0);
  // False once unmount cleanup has run — async branches use this to skip
  // setState calls on a torn-down component.
  const mountedRef = useRef<boolean>(true);

  function getClient(): ProsodicTTS {
    if (!ttsRef.current) {
      ttsRef.current = new ProsodicTTS();
    }
    return ttsRef.current;
  }

  function getAudioContext(): AudioContext | null {
    if (!mountedRef.current) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  // Stop the current source without firing onComplete. Idempotent — safe to
  // call repeatedly (e.g. on Submit + Skip + unmount in rapid succession).
  const stop = useCallback(() => {
    // Bump seq FIRST so any in-flight speak() awaits or queued onended fall
    // into the "superseded" branch and become no-ops.
    seqRef.current += 1;
    if (sourceRef.current) {
      // We deliberately leave onended attached — the handler is now generation-
      // gated and will simply ignore the event. Nulling here would race with
      // the natural-end of a buffer that ended within the same microtask.
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (mountedRef.current) setIsPlaying(false);
    lifecycleLog('voice-player', 'stop', { seq: seqRef.current });
  }, []);

  const speak = useCallback(
    async (text: string, tone: InterviewerTone, onComplete?: () => void) => {
      const client = getClient();
      // Cancel any currently-playing audio and claim a fresh generation.
      stop();
      const mySeq = ++seqRef.current;
      if (!mountedRef.current) {
        // Unmounted before we even started — fire onComplete defensively so the
        // caller's phase machine doesn't deadlock waiting for a TTS that will
        // never play.
        lifecycleWarn('voice-player', 'speak_aborted_unmounted', { seq: mySeq });
        onComplete?.();
        return;
      }

      // Reset error at the start of every speak — a successful playback should
      // dismiss any stale banner from a previous question.
      setError(null);
      setIsPlaying(true);
      lifecycleLog('voice-player', 'speak_start', { seq: mySeq, textLen: text.length, tone });

      try {
        const audioData = await client.speak(text, { voice, tone });
        if (mySeq !== seqRef.current || !mountedRef.current) {
          lifecycleLog('voice-player', 'speak_superseded_after_fetch', { mySeq, current: seqRef.current });
          onComplete?.();
          return;
        }

        const ctx = getAudioContext();
        if (!ctx) {
          lifecycleWarn('voice-player', 'speak_no_context', { mySeq });
          onComplete?.();
          return;
        }
        // Resume context if suspended by browser autoplay policy
        if (ctx.state === 'suspended') await ctx.resume();
        if (mySeq !== seqRef.current || !mountedRef.current) {
          lifecycleLog('voice-player', 'speak_superseded_after_resume', { mySeq, current: seqRef.current });
          onComplete?.();
          return;
        }

        const buffer = await ctx.decodeAudioData(audioData);
        if (mySeq !== seqRef.current || !mountedRef.current) {
          lifecycleLog('voice-player', 'speak_superseded_after_decode', { mySeq, current: seqRef.current });
          onComplete?.();
          return;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        sourceRef.current = source;

        source.onended = () => {
          // Only the generation that started this source may finalize it.
          // Any stop() call between speak_start and natural end bumps the seq
          // and converts this onended into a silent no-op.
          if (mySeq !== seqRef.current) {
            lifecycleLog('voice-player', 'onended_superseded', { mySeq, current: seqRef.current });
            return;
          }
          if (sourceRef.current === source) sourceRef.current = null;
          if (mountedRef.current) setIsPlaying(false);
          lifecycleLog('voice-player', 'speak_end', { seq: mySeq });
          onComplete?.();
        };

        source.start();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        lifecycleWarn('voice-player', 'speak_failed', { mySeq, err: message });
        if (mountedRef.current && mySeq === seqRef.current) setIsPlaying(false);

        // Branch on error type so the UI surfaces an accurate, actionable
        // message. Three classes:
        //
        //   1. TTSFallbackToBrowserError — server explicitly signaled that
        //      browser TTS should take over (quota/upstream/timeout). Treat as
        //      a SOFT failure: the interview continues, the user sees a
        //      neutral "Voice playback unavailable" notice rather than a red
        //      error.
        //
        //   2. AudioContext decode/resume failure — typically autoplay policy
        //      or codec issue. User-facing message hints at the cause.
        //
        //   3. Anything else — network, connect, etc. Generic message.
        //
        // All branches still call onComplete so the phase machine releases —
        // a TTS error must NEVER deadlock the interview, regardless of class.
        if (mountedRef.current && mySeq === seqRef.current) {
          if (err instanceof TTSFallbackToBrowserError) {
            setError(
              err.httpStatus === 429
                ? 'Voice playback limit reached. Interview continues without voice.'
                : 'Voice service unavailable right now. Interview continues without voice.',
            );
          } else if (message.includes('decode') || message.includes('AudioContext') || message.includes('autoplay')) {
            setError('Audio playback is blocked. Click anywhere on the page, then try the next question.');
          } else {
            setError('Voice playback failed. Interview continues without voice.');
          }
        }
        onComplete?.();
      }
    },
    [voice, stop],
  );

  // Close AudioContext on unmount to prevent Chrome context accumulation.
  // Chrome enforces a hard limit (~6 simultaneous contexts); leaking them
  // causes TTS and mic capture to fail silently after several questions.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Invalidate any in-flight speak()/onended.
      seqRef.current += 1;
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch { /* already stopped */ }
        sourceRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      lifecycleLog('voice-player', 'unmounted');
    };
  }, []); // intentionally empty — runs only on unmount

  return { isPlaying, error, speak, stop };
}
