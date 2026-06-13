'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { getMicAudioConstraints } from '@/lib/settings/client-preferences';
import { lifecycleLog, lifecycleWarn, voiceDebug } from '@/lib/voice/lifecycle-log';

type CleanupFn = () => void;

export interface UseMicrophoneReturn {
  isRecording: boolean;
  startRecording: (onAudioData: (data: ArrayBuffer) => void) => Promise<CleanupFn>;
  stopRecording: () => void;
}

// Captures mic audio at 16 kHz mono, converts Float32 → Int16, and calls
// onAudioData with each PCM chunk — the format Deepgram expects over WebSocket.
//
// LIFECYCLE OWNERSHIP
// -------------------
// This hook owns: the MediaStream, the dedicated AudioContext (16 kHz), the
// ScriptProcessor + source node. ONLY ONE capture session may be live at a
// time per hook instance — a second startRecording() call while a previous
// session is alive will tear the previous down first (single-owner invariant).
//
// Unmount cleanup runs the latest cleanup unconditionally so navigation during
// recording cannot leak a microphone track or AudioContext to the next page.
export function useMicrophone(): UseMicrophoneReturn {
  const [isRecording, setIsRecording] = useState(false);
  const cleanupRef = useRef<CleanupFn | null>(null);
  const startInFlightRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const stopRecording = useCallback(() => {
    const fn = cleanupRef.current;
    cleanupRef.current = null;
    if (fn) {
      try { fn(); } catch (err) {
        lifecycleWarn('mic', 'cleanup_threw', { err: err instanceof Error ? err.message : String(err) });
      }
      lifecycleLog('mic', 'stopped');
    }
  }, []);

  const startRecording = useCallback(
    async (onAudioData: (data: ArrayBuffer) => void): Promise<CleanupFn> => {
      // Double-start guard. The session page can call startDgListening twice
      // (TTS-complete callback + a manual mic button) within the same tick.
      // The second caller wins; the first session is torn down first so we
      // never end up with two getUserMedia() streams competing for the mic.
      if (cleanupRef.current) {
        lifecycleWarn('mic', 'restart_overlapping_session');
        stopRecording();
      }
      if (startInFlightRef.current) {
        lifecycleWarn('mic', 'start_already_in_flight');
        // Wait for the in-flight start to finish before issuing a new one.
        // Simpler than a queue: tell the caller to try again.
        throw new Error('Microphone start already in flight');
      }
      startInFlightRef.current = true;

      let stream: MediaStream | null = null;
      let audioContext: AudioContext | null = null;
      try {
        voiceDebug('mic_permission_requested', { source: 'useMicrophone' });
        stream = await navigator.mediaDevices.getUserMedia(getMicAudioConstraints());
        {
          const tracks = stream.getTracks();
          voiceDebug('mic_stream_acquired', {
            source: 'useMicrophone',
            track_count: tracks.length,
            labels: tracks.map(t => t.label || '<unknown>'),
            readyStates: tracks.map(t => t.readyState),
            muted_flags: tracks.map(t => t.muted),
          });
          // Tab-mute / device-unplug surfaces here. The recorder pipeline can
          // be alive while the underlying track is silently muted by the OS
          // (focus loss, mic toggle key, sleep). Logging on transition lets
          // the trace pinpoint exactly when audio frames stopped flowing.
          tracks.forEach((t) => {
            t.onmute = () => voiceDebug('track_muted', { label: t.label || '<unknown>' });
            t.onunmute = () => voiceDebug('track_unmuted', { label: t.label || '<unknown>' });
            t.onended = () => voiceDebug('track_ended', { label: t.label || '<unknown>' });
          });
        }

        // If the component unmounted while getUserMedia was awaiting permission,
        // release the freshly-granted stream immediately — never hand it to a
        // dead component.
        if (!mountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          startInFlightRef.current = false;
          lifecycleWarn('mic', 'start_aborted_unmounted');
          // Return a no-op cleanup so the caller's `await cleanup()` path is safe.
          return () => {};
        }

        audioContext = new AudioContext({ sampleRate: 16000 });

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
        // ScriptProcessor must be wired into the graph to fire, but must not
        // play mic audio through speakers (causes echo / focus fights on mobile).
        const silentSink = audioContext.createGain();
        silentSink.gain.value = 0;
        processor.connect(silentSink);
        silentSink.connect(audioContext.destination);
        setIsRecording(true);
        voiceDebug('recorder_started', { sample_rate: audioContext.sampleRate });

        // Capture into locals so the cleanup closure doesn't hold the function's
        // outer-scope refs (avoids any later assignment subtlety).
        const capturedStream = stream;
        const capturedCtx = audioContext;
        let cleanedUp = false;
        const cleanup: CleanupFn = () => {
          if (cleanedUp) return; // Idempotent: stop + unmount + double-call are all safe.
          cleanedUp = true;
          try { processor.disconnect(); } catch { /* */ }
          try { source.disconnect(); } catch { /* */ }
          try { silentSink.disconnect(); } catch { /* */ }
          try { capturedStream.getTracks().forEach((t) => t.stop()); } catch { /* */ }
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
        // Partial-init unwind: release anything we already acquired before the
        // throw so the caller doesn't have to know which step failed.
        if (stream) stream.getTracks().forEach((t) => t.stop());
        if (audioContext) audioContext.close().catch(() => {});
        startInFlightRef.current = false;
        lifecycleWarn('mic', 'start_failed', { err: err instanceof Error ? err.message : String(err) });
        throw err;
      }
    },
    [stopRecording],
  );

  // Single source of truth for teardown: any unmount path closes the live
  // recording, even if the caller forgot to call its cleanup.
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const fn = cleanupRef.current;
      cleanupRef.current = null;
      if (fn) {
        try { fn(); } catch { /* swallow on unmount */ }
        voiceDebug('cleanup_executed', { source: 'useMicrophone_unmount' });
        lifecycleLog('mic', 'unmount_cleanup_ran');
      }
    };
  }, []);

  return { isRecording, startRecording, stopRecording };
}
