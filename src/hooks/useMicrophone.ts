'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { getMicAudioConstraints } from '@/lib/settings/client-preferences';
import {
  registerCaptureAudioContext,
  unregisterCaptureAudioContext,
} from '@/lib/voice/audio-gesture';
import { createPcmCaptureGraph } from '@/lib/voice/audio/pcm-capture-graph';
import { lifecycleLog, lifecycleWarn, voiceDebug, getPlatformContext } from '@/lib/voice/lifecycle-log';

type CleanupFn = () => void;

export interface UseMicrophoneReturn {
  isRecording: boolean;
  startRecording: (onAudioData: (data: ArrayBuffer) => void) => Promise<CleanupFn>;
  stopRecording: () => void;
}

function pipelineCtx(interviewId?: string) {
  return {
    ...getPlatformContext(),
    interview_id: interviewId ?? null,
    ts: Date.now(),
  };
}

async function ensureCaptureContextRunning(ctx: AudioContext, interviewId?: string): Promise<boolean> {
  if (ctx.state === 'closed') return false;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch (err) {
      voiceDebug('AUDIO_CONTEXT_RESUME_FAILED', {
        ...pipelineCtx(interviewId),
        state: ctx.state,
        err: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
  const running = ctx.state === 'running';
  if (running) {
    voiceDebug('AUDIO_CONTEXT_READY', {
      ...pipelineCtx(interviewId),
      state: ctx.state,
      sample_rate: ctx.sampleRate,
    });
  }
  return running;
}

// Captures mic audio at 16 kHz mono, converts Float32 → Int16, and calls
// onAudioData with each PCM chunk — the format Deepgram expects over WebSocket.
// Prefers AudioWorklet (off main thread); ScriptProcessor is the fallback.
export function useMicrophone(interviewId?: string): UseMicrophoneReturn {
  const [isRecording, setIsRecording] = useState(false);
  const cleanupRef = useRef<CleanupFn | null>(null);
  const startInFlightRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);

  const removeVisibilityHandler = useCallback(() => {
    if (typeof document === 'undefined' || !visibilityHandlerRef.current) return;
    document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
    window.removeEventListener('pageshow', visibilityHandlerRef.current);
    visibilityHandlerRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    removeVisibilityHandler();
    const fn = cleanupRef.current;
    cleanupRef.current = null;
    if (fn) {
      try { fn(); } catch (err) {
        lifecycleWarn('mic', 'cleanup_threw', { err: err instanceof Error ? err.message : String(err) });
      }
      lifecycleLog('mic', 'stopped');
    }
  }, [removeVisibilityHandler]);

  const startRecording = useCallback(
    async (onAudioData: (data: ArrayBuffer) => void): Promise<CleanupFn> => {
      voiceDebug('MIC_INIT', { ...pipelineCtx(interviewId), source: 'useMicrophone' });

      if (cleanupRef.current) {
        lifecycleWarn('mic', 'restart_overlapping_session');
        stopRecording();
      }
      if (startInFlightRef.current) {
        lifecycleWarn('mic', 'start_already_in_flight');
        throw new Error('Microphone start already in flight');
      }
      startInFlightRef.current = true;

      let stream: MediaStream | null = null;
      let audioContext: AudioContext | null = null;
      try {
        voiceDebug('MIC_PERMISSION', { ...pipelineCtx(interviewId), source: 'useMicrophone' });
        stream = await navigator.mediaDevices.getUserMedia(getMicAudioConstraints());
        {
          const tracks = stream.getTracks();
          voiceDebug('MIC_STREAM', {
            ...pipelineCtx(interviewId),
            source: 'useMicrophone',
            track_count: tracks.length,
          });
          tracks.forEach((t) => {
            if (t.readyState === 'live') {
              voiceDebug('TRACK_READY', {
                ...pipelineCtx(interviewId),
                label: t.label || '<unknown>',
                muted: t.muted,
              });
            }
            t.onmute = () => voiceDebug('track_muted', { label: t.label || '<unknown>' });
            t.onunmute = () => voiceDebug('track_unmuted', { label: t.label || '<unknown>' });
            t.onended = () => voiceDebug('track_ended', { label: t.label || '<unknown>' });
          });
        }

        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          startInFlightRef.current = false;
          lifecycleWarn('mic', 'start_aborted_unmounted');
          return () => {};
        }

        audioContext = new AudioContext({ sampleRate: 16000 });
        registerCaptureAudioContext(audioContext);

        const contextReady = await ensureCaptureContextRunning(audioContext, interviewId);
        if (!contextReady) {
          throw new Error('Microphone audio context could not start. Tap Retry Mic.');
        }

        let framesProcessed = 0;
        const captureGraph = await createPcmCaptureGraph(
          audioContext,
          stream,
          (buffer) => {
            framesProcessed += 1;
            if (framesProcessed === 1 || framesProcessed % 50 === 0) {
              voiceDebug('CHUNK_CREATED', {
                ...pipelineCtx(interviewId),
                frame: framesProcessed,
                bytes: buffer.byteLength,
              });
              voiceDebug('FRAME_PROCESSED', {
                ...pipelineCtx(interviewId),
                frame: framesProcessed,
              });
            }
            onAudioData(buffer);
          },
          {
            onModeSelected: (mode) => {
              voiceDebug('PCM_CAPTURE_MODE', { ...pipelineCtx(interviewId), mode });
            },
          },
        );

        removeVisibilityHandler();
        const onVisible = () => {
          if (typeof document === 'undefined') return;
          if (document.visibilityState !== 'visible') return;
          if (!audioContext || audioContext.state === 'closed') return;
          void ensureCaptureContextRunning(audioContext, interviewId);
        };
        visibilityHandlerRef.current = onVisible;
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('pageshow', onVisible);

        setIsRecording(true);
        voiceDebug('recorder_started', {
          sample_rate: audioContext.sampleRate,
          capture_mode: captureGraph.mode,
        });

        const capturedStream = stream;
        const capturedCtx = audioContext;
        let cleanedUp = false;
        const cleanup: CleanupFn = () => {
          if (cleanedUp) return;
          cleanedUp = true;
          removeVisibilityHandler();
          try { captureGraph.disconnect(); } catch { /* */ }
          try { capturedStream.getTracks().forEach((t) => t.stop()); } catch { /* */ }
          unregisterCaptureAudioContext(capturedCtx);
          try { capturedCtx.close().catch(() => {}); } catch { /* */ }
          if (mountedRef.current) setIsRecording(false);
          voiceDebug('recorder_stopped', {});
          voiceDebug('stream_destroyed', {});
        };

        cleanupRef.current = cleanup;
        startInFlightRef.current = false;
        lifecycleLog('mic', 'started');
        return cleanup;
      } catch (err) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (audioContext) {
          unregisterCaptureAudioContext(audioContext);
          audioContext.close().catch(() => {});
        }
        removeVisibilityHandler();
        startInFlightRef.current = false;
        lifecycleWarn('mic', 'start_failed', { err: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },
    [stopRecording, removeVisibilityHandler, interviewId],
  );

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      removeVisibilityHandler();
      const fn = cleanupRef.current;
      cleanupRef.current = null;
      if (fn) {
        try { fn(); } catch { /* swallow on unmount */ }
        voiceDebug('cleanup_executed', { source: 'useMicrophone_unmount' });
        lifecycleLog('mic', 'unmount_cleanup_ran');
      }
    };
  }, [removeVisibilityHandler]);

  return { isRecording, startRecording, stopRecording };
}
