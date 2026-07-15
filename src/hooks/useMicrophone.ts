'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  registerCaptureAudioContext,
  unregisterCaptureAudioContext,
} from '@/lib/voice/audio-gesture';
import { createPcmCaptureGraph } from '@/lib/voice/audio/pcm-capture-graph';
import {
  buildMicErrorContext,
  lifecycleLog,
  lifecycleWarn,
  micFlowLog,
  voiceDebug,
  getPlatformContext,
} from '@/lib/voice/lifecycle-log';
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import {
  micCaptureCoordinator,
  type MicCaptureLostReason,
} from '@/lib/voice/mic-capture-coordinator'
import { emitMicPipelineTelemetry } from '@/lib/voice/mic-pipeline-telemetry';
import { voicePipelineDiagnostics } from '@/lib/voice/voice-pipeline-diagnostics';

type CleanupFn = () => void;

export interface UseMicrophoneOptions {
  /** Fired when the OS/browser ends or mutes the capture track mid-session. */
  onCaptureLost?: (reason: MicCaptureLostReason) => void;
  telemetryCtx?: InterviewTelemetryContext;
}

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
        ...buildMicErrorContext(err),
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
    micFlowLog('audiocontext_ready', {
      state: ctx.state,
      sample_rate: ctx.sampleRate,
      interview_id: interviewId ?? null,
    });
  }
  return running;
}

// Captures mic audio at 16 kHz mono, converts Float32 → Int16, and calls
// onAudioData with each PCM chunk — the format Deepgram expects over WebSocket.
// Prefers AudioWorklet (off main thread); ScriptProcessor is the fallback.
export function useMicrophone(
  interviewId?: string,
  options?: UseMicrophoneOptions,
): UseMicrophoneReturn {
  const [isRecording, setIsRecording] = useState(false);
  const cleanupRef = useRef<CleanupFn | null>(null);
  const startInFlightRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onCaptureLostRef = useRef(options?.onCaptureLost);
  const telemetryCtxRef = useRef(options?.telemetryCtx);
  onCaptureLostRef.current = options?.onCaptureLost;
  telemetryCtxRef.current = options?.telemetryCtx;

  const removeVisibilityHandler = useCallback(() => {
    if (typeof document === 'undefined' || !visibilityHandlerRef.current) return;
    document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
    window.removeEventListener('pageshow', visibilityHandlerRef.current);
    visibilityHandlerRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    removeVisibilityHandler();
    const fn = cleanupRef.current;
    cleanupRef.current = null;
    if (fn) {
      try { fn(); } catch (err) {
        lifecycleWarn('mic', 'cleanup_threw', buildMicErrorContext(err));
      }
      lifecycleLog('mic', 'stopped');
    }
  }, [removeVisibilityHandler]);

  const startRecording = useCallback(
    async (onAudioData: (data: ArrayBuffer) => void): Promise<CleanupFn> => {
      micFlowLog('mic_init_started', { ...pipelineCtx(interviewId), source: 'useMicrophone' });

      if (cleanupRef.current) {
        lifecycleWarn('mic', 'restart_overlapping_session');
        stopRecording();
      }
      if (startInFlightRef.current) {
        lifecycleWarn('mic', 'start_already_in_flight');
        throw new Error('Microphone start already in flight');
      }
      startInFlightRef.current = true;

      const abortController = new AbortController();
      abortRef.current = abortController;

      let stream: MediaStream | null = null;
      let audioContext: AudioContext | null = null;
      let captureLostHandled = false;

      const handleCaptureLost = (reason: MicCaptureLostReason) => {
        if (captureLostHandled) return;
        captureLostHandled = true;
        micFlowLog('mic_capture_lost', {
          ...pipelineCtx(interviewId),
          reason,
          source: 'useMicrophone',
        });
        stopRecording();
        onCaptureLostRef.current?.(reason);
      };

      try {
        micFlowLog('mic_permission_requested', { ...pipelineCtx(interviewId), source: 'useMicrophone' });
        if (telemetryCtxRef.current) {
          emitMicPipelineTelemetry('mic_permission_requested', telemetryCtxRef.current, {
            owner: 'pcm',
          });
        }

        stream = await micCaptureCoordinator.acquire({
          owner: 'pcm',
          interviewId,
          signal: abortController.signal,
          telemetryCtx: telemetryCtxRef.current,
          onCaptureLost: handleCaptureLost,
        });

        const tracks = stream.getTracks();
        micFlowLog('mic_stream_ready', {
          ...pipelineCtx(interviewId),
          source: 'useMicrophone',
          track_count: tracks.length,
          tracks: tracks.map((t) => ({
            label: t.label || '<unknown>',
            ready_state: t.readyState,
            muted: t.muted,
          })),
        });

        if (!mountedRef.current) {
          micCaptureCoordinator.release('pcm');
          startInFlightRef.current = false;
          abortRef.current = null;
          lifecycleWarn('mic', 'start_aborted_unmounted');
          // Throw instead of returning an empty cleanup so the caller
          // (DeepgramSessionController) knows the mic did not start and can
          // retry or fall back, rather than treating a no-op cleanup as success
          // and silently producing a connected-but-deaf voice session.
          throw new Error('Mic start aborted: component unmounted during initialisation');
        }

        audioContext = new AudioContext({ sampleRate: 16000 });
        registerCaptureAudioContext(audioContext);
        micFlowLog('audiocontext_created', {
          interview_id: interviewId ?? null,
          sample_rate: audioContext.sampleRate,
          state: audioContext.state,
        });

        const contextReady = await ensureCaptureContextRunning(audioContext, interviewId);
        if (!contextReady) {
          throw new Error('Microphone audio context could not start. Tap Retry Mic.');
        }
        voicePipelineDiagnostics.recordAudioContext(audioContext.state, audioContext.sampleRate);

        let framesProcessed = 0;
        const captureGraph = await createPcmCaptureGraph(
          audioContext,
          stream,
          (buffer) => {
            framesProcessed += 1;
            voicePipelineDiagnostics.recordPcmFrame(buffer);
            if (framesProcessed === 1 || framesProcessed % 50 === 0) {
              voiceDebug('CHUNK_CREATED', {
                ...pipelineCtx(interviewId),
                frame: framesProcessed,
                bytes: buffer.byteLength,
              });
            }
            onAudioData(buffer);
          },
          {
            onModeSelected: (mode) => {
              micFlowLog('pcm_capture_mode', { ...pipelineCtx(interviewId), mode });
              voicePipelineDiagnostics.recordCaptureMode(mode);
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

        if (mountedRef.current) setIsRecording(true);
        micFlowLog('recorder_started', {
          sample_rate: audioContext.sampleRate,
          capture_mode: captureGraph.mode,
          interview_id: interviewId ?? null,
        });

        const capturedCtx = audioContext;
        let cleanedUp = false;
        const cleanup: CleanupFn = () => {
          if (cleanedUp) return;
          cleanedUp = true;
          captureLostHandled = true;
          removeVisibilityHandler();
          try { captureGraph.disconnect(); } catch { /* */ }
          micCaptureCoordinator.release('pcm');
          unregisterCaptureAudioContext(capturedCtx);
          try { capturedCtx.close().catch(() => {}); } catch { /* */ }
          if (mountedRef.current) setIsRecording(false);
          micFlowLog('cleanup_completed', { source: 'useMicrophone', interview_id: interviewId ?? null });
        };

        cleanupRef.current = cleanup;
        startInFlightRef.current = false;
        abortRef.current = null;
        lifecycleLog('mic', 'started');
        return cleanup;
      } catch (err) {
        if (stream) micCaptureCoordinator.release('pcm');
        if (audioContext) {
          unregisterCaptureAudioContext(audioContext);
          audioContext.close().catch(() => {});
        }
        removeVisibilityHandler();
        startInFlightRef.current = false;
        abortRef.current = null;
        lifecycleWarn('mic', 'start_failed', buildMicErrorContext(err, pipelineCtx(interviewId)));
        throw err;
      }
    },
    [stopRecording, removeVisibilityHandler, interviewId],
  );

  // StrictMode remount fix — mirror useSpeechRecognition / useVoicePlayer.
  useEffect(() => {
    mountedRef.current = true;
    voiceDebug('mount_flag_reset', { source: 'useMicrophone_mount' });
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      abortRef.current = null;
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
