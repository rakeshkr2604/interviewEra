'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getMicAudioConstraints } from '@/lib/settings/client-preferences';

// Minimal Web Speech API typings (not present in all TS DOM lib versions)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  /** Joined finalized chunks (for display). NEVER overwritten while listening. */
  transcript: string;
  /** Current interim chunk (italicized in UI). Reset only on next final or explicit reset. */
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  permissionState: 'unknown' | 'granted' | 'prompt' | 'denied' | 'requesting';
  startListening: () => Promise<boolean>;
  retryPermission: () => Promise<boolean>;
  stopListening: () => void;
  resetTranscript: () => void;
  /**
   * Snapshot of finalized chunks + interim, joined and trimmed.
   * Read from refs — survives stale-closure timing of state updates so the
   * submit handler always sees the latest words even if the user clicks
   * milliseconds after the last interim arrived.
   */
  getMergedTranscript: () => string;
  /**
   * True if a speech event (interim or final) was observed in the last
   * `windowMs` milliseconds. Use for "mic stuck" warnings instead of a
   * wall-clock timer that ignores actual mic activity.
   */
  hasRecentSpeech: (windowMs?: number) => boolean;
}

// Browser SpeechRecognition naturally ends after pauses/silence. We do NOT
// impose our own stop timer — the answer timer is purely informational UX and
// must never terminate the mic. `onend` transparently restarts recognition
// while the candidate is still answering.
const RESTART_DELAY_MS = 250;
const DEFAULT_SILENCE_WINDOW_MS = 8_000;

function log(event: string, data?: Record<string, unknown>): void {
  if (data) {
    console.log(`[speech] ${event}`, data);
  } else {
    console.log(`[speech] ${event}`);
  }
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported] = useState(
    () => typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  );
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(
    () => (typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))
      ? null
      : 'Speech recognition not supported in this browser. Use Chrome or Edge.'
  );
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'prompt' | 'denied' | 'requesting'>('unknown');

  // ── APPEND-ONLY TRANSCRIPT MODEL ────────────────────────────────────────
  // Finalized chunks live in a ref array — append-only, never overwritten.
  // Interim lives in a ref string — replaced on each interim event, cleared
  // only by explicit reset or by being absorbed into a final chunk.
  //
  // The refs are the SOURCE OF TRUTH for submit-time reads (no stale-closure
  // race with React state). The mirrored state below drives re-renders.
  const transcriptChunksRef = useRef<string[]>([]);
  const interimRef = useRef<string>('');
  const lastSpeechAtRef = useRef<number>(0);

  // Render mirrors of the refs. Updated synchronously with each ref mutation
  // so the UI reflects new speech, but the refs remain authoritative for the
  // merged-transcript getter that submit() calls.
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const syncRender = useCallback(() => {
    setTranscript(transcriptChunksRef.current.join(' '));
    setInterimTranscript(interimRef.current);
  }, []);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRequestedMicRef = useRef(false);
  const shouldListenRef = useRef(false);
  const beginRecognitionRef = useRef<() => void>(() => {});

  const getMergedTranscript = useCallback((): string => {
    const finalized = transcriptChunksRef.current.join(' ').trim();
    const interim = interimRef.current.trim();
    if (!finalized && !interim) return '';
    if (!finalized) return interim;
    if (!interim) return finalized;
    return `${finalized} ${interim}`;
  }, []);

  const hasRecentSpeech = useCallback((windowMs: number = DEFAULT_SILENCE_WINDOW_MS): boolean => {
    if (lastSpeechAtRef.current === 0) return false;
    return Date.now() - lastSpeechAtRef.current < windowMs;
  }, []);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionState('denied');
      setError('Microphone is not available in this browser.');
      return false;
    }

    setPermissionState('requesting');
    hasRequestedMicRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMicAudioConstraints());
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState('granted');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error';
      console.error('[speech] getUserMedia failed:', message);

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionState('denied');
        setError('Microphone permission denied. Click Retry to request again.');
        return false;
      }

      if (err instanceof DOMException && err.name === 'NotFoundError') {
        setPermissionState('denied');
        setError('No microphone device found. Please connect a mic and try again.');
        return false;
      }

      if (err instanceof DOMException && err.name === 'NotReadableError') {
        setPermissionState('prompt');
        setError('Microphone is busy in another app. Close other apps and retry.');
        return false;
      }

      setPermissionState('prompt');
      setError('Unable to access microphone right now. Please retry.');
      return false;
    }
  }, []);

  const getPermissionState = useCallback(async (): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> => {
    if (!navigator?.permissions?.query) return 'unknown';
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permission.state === 'granted' || permission.state === 'prompt' || permission.state === 'denied') {
        return permission.state;
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);

  const stopListening = useCallback(() => {
    // Intentional stop — disable auto-recovery so onend does NOT restart.
    // CRITICAL: do NOT clear transcriptChunksRef here. The submit handler
    // calls stopListening() then reads getMergedTranscript() — if we cleared
    // the chunks the answer would vanish.
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setIsListening(false);
    log('stopped', { chunks: transcriptChunksRef.current.length, hasInterim: interimRef.current.length > 0 });
  }, []);

  // Build + start a fresh recognition instance. Reused for the initial start
  // AND for invisible auto-recovery when the browser ends the session. It
  // NEVER clears accumulated chunks, so speech survives restarts.
  const beginRecognition = useCallback((): void => {
    const Cls = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Cls) return;

    const recognition = new Cls();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      log('started');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }

      const now = Date.now();
      let changed = false;

      if (finalChunk) {
        const cleaned = finalChunk.trim();
        if (cleaned) {
          transcriptChunksRef.current.push(cleaned);
          // A final chunk absorbs the in-flight interim — clear it so we don't
          // render the same words twice (once italic, once final).
          interimRef.current = '';
          lastSpeechAtRef.current = now;
          changed = true;
          log('final_chunk_added', {
            chunk: cleaned,
            chunk_count: transcriptChunksRef.current.length,
            total_chars: transcriptChunksRef.current.join(' ').length,
          });
        }
      }

      if (interimChunk) {
        const cleaned = interimChunk.trim();
        if (cleaned !== interimRef.current) {
          interimRef.current = cleaned;
          lastSpeechAtRef.current = now;
          changed = true;
          log('interim_updated', { interim: cleaned });
        }
      }

      if (changed) syncRender();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // 'no-speech' (user paused), 'aborted' (we stopped it), and 'network'
      // (transient between restarts) are normal lifecycle events — let onend
      // handle recovery, don't surface them as red errors to the user.
      if (event.error === 'no-speech') {
        log('benign_error', { error: 'no-speech' });
        recognition.stop();
        return;
      }
      if (event.error === 'aborted') {
        log('benign_error', { error: 'aborted' });
        return;
      }
      if (event.error === 'network') {
        log('benign_error', { error: 'network' });
        recognition.stop();
        return;
      }
      // audio-capture: device momentarily unavailable (sleep/wake, focus
      // steal by another tab, USB blip). onend will auto-restart while
      // shouldListenRef is true. Don't surface as a red error to the user.
      if (event.error === 'audio-capture') {
        console.warn('[speech] benign_error', { error: 'audio-capture', note: 'transient device unavail; restarting' });
        recognition.stop();
        return;
      }

      console.error('[speech] Recognition error:', event.error);

      const messages: Record<string, string> = {
        'not-allowed': 'Microphone permission denied',
        'audio-capture': 'No microphone detected. Please connect a microphone and try again.',
        'service-not-allowed': 'Speech service unavailable. Try Chrome or Edge.',
      };
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionState('denied');
      }
      setError(messages[event.error] ?? `Microphone error (${event.error}). Please check permissions and try again.`);
    };

    recognition.onend = () => {
      setIsListening(false);
      // CRITICAL: do NOT clear transcriptChunksRef here. The browser ends the
      // session on pause/silence/timeout, and we auto-restart below — clearing
      // would wipe the answer mid-sentence. Interim is cleared because a new
      // session starts fresh; finalized chunks persist as the answer-so-far.
      interimRef.current = '';
      syncRender();

      if (shouldListenRef.current) {
        log('restarted', { reason: 'auto-recovery', chunks: transcriptChunksRef.current.length });
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current) beginRecognitionRef.current();
        }, RESTART_DELAY_MS);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // start() throws InvalidStateError if a prior instance is mid-teardown;
      // retry shortly so recovery still succeeds.
      if (shouldListenRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current) beginRecognitionRef.current();
        }, RESTART_DELAY_MS);
      }
    }
  }, [syncRender]);

  useEffect(() => {
    beginRecognitionRef.current = beginRecognition;
  }, [beginRecognition]);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setError(null);
    // NOTE: transcript chunks are intentionally NOT cleared here — only
    // resetTranscript() (called by the page on a new question/retry) clears
    // them. This keeps the answer intact across automatic recognition restarts
    // within one answer.
    interimRef.current = '';
    syncRender();

    const knownPermissionState = await getPermissionState();
    if (knownPermissionState === 'denied') {
      setPermissionState('denied');
      setError('Microphone permission denied. Click Retry to request again.');
    }

    if (knownPermissionState !== 'granted' || !hasRequestedMicRef.current) {
      const granted = await requestMicPermission();
      hasRequestedMicRef.current = true;
      if (!granted) {
        setError('Microphone still blocked');
        return false;
      }
    } else {
      setPermissionState('granted');
    }

    shouldListenRef.current = true;
    beginRecognition();
    return true;
  }, [isSupported, getPermissionState, requestMicPermission, beginRecognition, syncRender]);

  const retryPermission = useCallback(async (): Promise<boolean> => {
    setError(null);
    const granted = await requestMicPermission();
    if (!granted) {
      setError('Microphone still blocked');
      return false;
    }
    return startListening();
  }, [requestMicPermission, startListening]);

  const resetTranscript = useCallback(() => {
    transcriptChunksRef.current = [];
    interimRef.current = '';
    lastSpeechAtRef.current = 0;
    syncRender();
    log('reset');
  }, [syncRender]);

  // ── Mobile Safari / PWA defensive handling ──────────────────────────────
  // iOS pauses recognition when the tab/PWA loses visibility (incoming call,
  // app switcher). On return, restart recognition if we should still be
  // listening. Transcript chunks are preserved across the pause.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && shouldListenRef.current && !recognitionRef.current) {
        log('visibility_resume');
        beginRecognitionRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    permissionState,
    startListening,
    retryPermission,
    stopListening,
    resetTranscript,
    getMergedTranscript,
    hasRecentSpeech,
  };
}
