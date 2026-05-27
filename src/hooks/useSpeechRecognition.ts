'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getMicAudioConstraints } from '@/lib/settings/client-preferences';
import {
  lifecycleLog as scopedLifecycleLog,
  lifecycleWarn as scopedLifecycleWarn,
  voiceDebug,
} from '@/lib/voice/lifecycle-log';

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

/**
 * Tri-state recognition lifecycle.
 *
 *  - `idle`     — no recognition session is running (initial or post-stop)
 *  - `starting` — recognition.start() called, browser may have fired `onstart`,
 *                 but NO transcript event has arrived yet. The mic is technically
 *                 open but the audio pipeline has not been verified.
 *  - `active`   — at least one interim or final transcript has been received
 *                 during the current session. This is the only state in which
 *                 the UI is allowed to render "Listening…".
 *
 * The 'starting' state exists specifically to prevent the false-positive
 * "Listening…" label that used to appear immediately on `onstart`, before the
 * audio pipeline was confirmed to be delivering frames.
 */
export type SpeechRecognitionState = 'idle' | 'starting' | 'active';

export interface UseSpeechRecognitionReturn {
  /**
   * Tri-state lifecycle flag — see SpeechRecognitionState for semantics.
   * UI should gate "Listening…" labels on `recognitionState === 'active'`.
   */
  recognitionState: SpeechRecognitionState;
  /**
   * Backwards-compatible "is any non-idle state" boolean. Use this for
   * control-flow toggles (start/stop/teardown). Use `recognitionState`
   * for UI labels — `isListening` is true during 'starting' too.
   */
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

// ── Failsafe-recovery / restart-storm tuning ──────────────────────────────
// Watchdog: if `recognitionState` stays at 'active' but no transcript event
// (interim OR final) lands for STUCK_THRESHOLD_MS, the audio pipeline is
// considered silently stuck — typical causes are Bluetooth headset
// disconnect, OS-level mic mute, focus-stolen by another app, browser audio
// service crash. We perform a SILENT teardown + rebuild, rate-limited so a
// genuinely broken device can never become a retry storm. Recovery succeeds
// for the user as soon as a single transcript event lands on the rebuilt
// session; if it does not, the existing stuck-mic escape UI in the session
// page still surfaces the manual Retry mic button.
const STUCK_WATCHDOG_THRESHOLD_MS = 10_000;
const STUCK_WATCHDOG_POLL_MS = 2_000;
const MIN_RECOVERY_GAP_MS = 15_000;
const MAX_RECOVERIES_PER_WINDOW = 3;
const RECOVERY_WINDOW_MS = 60_000;

// Restart-storm guard for the natural `onend` → `setTimeout` auto-restart
// loop. The browser ending the session on silence is normal; we restart
// every ~250 ms. But a persistently-broken audio device (USB unplug, OS
// permission revoked mid-session) can produce a synchronous error-then-end
// loop at the 250 ms cadence. After MAX_RESTARTS_PER_WINDOW restarts in
// RESTART_STORM_WINDOW_MS, we bail out: shouldListen flips false, the user
// sees the existing error UI and can click Retry. The history clears on
// every successful transcript event (proving the pipeline is alive) and on
// every user-initiated `startListening()`.
const MAX_RESTARTS_PER_WINDOW = 5;
const RESTART_STORM_WINDOW_MS = 10_000;

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
  // Tri-state lifecycle. UI gates "Listening…" on `'active'` only — the
  // 'starting' window (between onstart and the first transcript event) is
  // when the false-positive used to show.
  const [recognitionState, setRecognitionState] = useState<SpeechRecognitionState>('idle');
  // Backward-compat boolean. True for any non-idle state so existing
  // toggle/teardown branches (`if (isListening) stopListening()`) still fire.
  const isListening = recognitionState !== 'idle';
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
    if (!mountedRef.current) return; // stale-event guard
    setTranscript(transcriptChunksRef.current.join(' '));
    setInterimTranscript(interimRef.current);
  }, []);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRequestedMicRef = useRef(false);
  const shouldListenRef = useRef(false);
  const beginRecognitionRef = useRef<() => void>(() => {});
  // Belt-and-suspenders alongside shouldListenRef: gate every async callback
  // that touches React state. shouldListenRef governs the auto-restart loop;
  // mountedRef governs anything that calls setState. They are independent —
  // a benign onend that fires post-unmount must not setState even though
  // shouldListenRef already prevents a restart.
  const mountedRef = useRef<boolean>(true);
  // ── Generation token for multi-instance stale-handler protection ────────
  // Browser SpeechRecognition takes 100–500ms to fully tear down after stop(),
  // and beginRecognition can race with the previous instance's async onend.
  // Each beginRecognition() bumps `generationRef`; every event handler closes
  // over `myGen` and bails if it no longer matches the current generation.
  // Without this, an orphaned instance from question N can fire onresult
  // after question N+1's resetTranscript ran, flipping state to 'active'
  // while leaving transcriptChunksRef empty — the exact "Listening… with
  // empty transcript box" symptom this fix targets.
  const generationRef = useRef<number>(0);
  // Prevents overlapping startListening() calls. Without this, a rapid
  // toggle-mic + post-TTS auto-start can create two recognition instances
  // back-to-back, the second of which throws InvalidStateError because the
  // first is still in browser shutdown.
  const startInFlightRef = useRef<boolean>(false);
  // Watchdog rate-limiting state. `lastRecoveryAtRef` enforces the min gap
  // between two silent recoveries; `recoveryHistoryRef` is a sliding window
  // for the per-minute cap. Both are reset by stopListening / unmount so a
  // new session starts with a clean slate.
  const lastRecoveryAtRef = useRef<number>(0);
  const recoveryHistoryRef = useRef<number[]>([]);
  // Restart-storm guard state. Cleared on transcript success (the pipeline
  // is alive) and on user-initiated startListening (manual fresh start).
  const restartHistoryRef = useRef<number[]>([]);

  // Idempotent teardown for a SpeechRecognition instance. Detaches every
  // handler BEFORE stopping so late events the browser dispatches after
  // stop() are silently dropped — they can no longer enter our setState
  // path. Used by both beginRecognition (swap) and unmount.
  const detachRecognition = useCallback((r: SpeechRecognitionInstance | null): void => {
    if (!r) return;
    r.onstart = null;
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    try { r.stop(); } catch { /* */ }
  }, []);

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
    voiceDebug('mic_permission_requested', { source: 'useSpeechRecognition' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMicAudioConstraints());
      const tracks = stream.getTracks();
      voiceDebug('mic_stream_acquired', {
        track_count: tracks.length,
        labels: tracks.map(t => t.label || '<unknown>'),
        readyStates: tracks.map(t => t.readyState),
        muted_flags: tracks.map(t => t.muted),
      });
      tracks.forEach((track) => track.stop());
      setPermissionState('granted');
      voiceDebug('mic_permission_granted', {});
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
    // Bump generation BEFORE detaching/stopping so any in-flight events
    // (onresult delivered in the next microtask) are dropped by the
    // myGen!==generationRef.current gate in each handler.
    generationRef.current += 1;
    const r = recognitionRef.current;
    recognitionRef.current = null;
    detachRecognition(r);
    setRecognitionState('idle');
    voiceDebug('stop_listening_called', {
      gen: generationRef.current,
      chunks: transcriptChunksRef.current.length,
      has_interim: interimRef.current.length > 0,
    });
    log('stopped', { chunks: transcriptChunksRef.current.length, hasInterim: interimRef.current.length > 0 });
  }, [detachRecognition]);

  // Build + start a fresh recognition instance. Reused for the initial start
  // AND for invisible auto-recovery when the browser ends the session. It
  // NEVER clears accumulated chunks, so speech survives restarts.
  const beginRecognition = useCallback((): void => {
    const Cls = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Cls) return;

    // SINGLE-OWNER INVARIANT. Any previous instance MUST be detached + stopped
    // before we create a new one. Without this, the previous instance's
    // handlers stay bound to the same refs and fire interleaving onresult /
    // onend events for a new question's session — the root cause of the
    // "Listening… with empty transcript" bug. Generation-bump + detach
    // together guarantee no stale events ever land in our setState path.
    const prev = recognitionRef.current;
    if (prev) {
      voiceDebug('previous_recognition_torn_down', { reason: 'begin_recognition_overlap' });
      recognitionRef.current = null;
      detachRecognition(prev);
    }

    // Bump generation BEFORE binding handlers so myGen captures the new id.
    const myGen = ++generationRef.current;

    // Reset state to 'idle' synchronously. If a previous instance flipped
    // state to 'active' and we did not transition back to 'idle' (e.g. an
    // orphaned onresult fired between stop() and now), the next instance's
    // onstart would still set 'starting' — but during the gap the UI could
    // show stale "Listening…". Force-resetting here closes that window.
    setRecognitionState('idle');

    const recognition = new Cls();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    voiceDebug('begin_recognition', { gen: myGen });

    recognition.onstart = () => {
      if (!mountedRef.current) {
        // Recognition started after the component unmounted — stop it immediately
        // and let our cleanup take over. shouldListenRef being false is not enough
        // because start() races with stop() on the SpeechRecognition object.
        try { recognition.stop(); } catch { /* */ }
        scopedLifecycleWarn('speech', 'onstart_after_unmount');
        voiceDebug('recognition_started_ignored', { reason: 'unmounted', gen: myGen });
        return;
      }
      if (myGen !== generationRef.current) {
        // Superseded — a new beginRecognition() or stopListening() ran before
        // the browser dispatched onstart. Drop silently; the live instance
        // owns the lifecycle from here.
        try { recognition.stop(); } catch { /* */ }
        voiceDebug('recognition_started_ignored', {
          reason: 'stale_gen',
          gen: myGen,
          current_gen: generationRef.current,
        });
        return;
      }
      // Enter 'starting' — UI must NOT show "Listening…" yet because no
      // transcript has been observed. Transition to 'active' happens inside
      // onresult on the first interim/final event.
      setRecognitionState('starting');
      voiceDebug('recognition_started', { gen: myGen });
      log('started');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return; // stale event on torn-down instance
      if (myGen !== generationRef.current) {
        // Late onresult from a superseded instance. Dropping it is what keeps
        // the transcript refs aligned with the live recognition session and
        // prevents the previous question's audio from flipping state to
        // 'active' for the new question.
        voiceDebug('transcript_ignored', {
          reason: 'stale_gen',
          gen: myGen,
          current_gen: generationRef.current,
        });
        return;
      }
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
          voiceDebug('transcript_received', {
            gen: myGen,
            is_final: true,
            chars: cleaned.length,
            chunk_count: transcriptChunksRef.current.length,
          });
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
          voiceDebug('transcript_received', {
            gen: myGen,
            is_final: false,
            chars: cleaned.length,
          });
          log('interim_updated', { interim: cleaned });
        }
      }

      // Verified audio pipeline: any transcript event proves frames are flowing.
      // Promote the lifecycle from 'starting' → 'active' so the UI is now
      // allowed to render "Listening…". React bails on no-op state writes so
      // this stays cheap even when called every interim.
      if (changed) {
        setRecognitionState('active');
        // Success resets the storm guard — the pipeline has just proven it
        // works, so any prior restart attempts are no longer pathological.
        restartHistoryRef.current = [];
        syncRender();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) return; // ignore late errors after unmount
      if (myGen !== generationRef.current) {
        voiceDebug('recognition_errored_ignored', {
          reason: 'stale_gen',
          gen: myGen,
          current_gen: generationRef.current,
          error: event.error,
        });
        return;
      }
      voiceDebug('recognition_errored', { gen: myGen, error: event.error });
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
      if (!mountedRef.current) {
        // The unmount-cleanup effect has already set shouldListenRef=false and
        // cleared restartTimerRef, but be explicit: never restart after unmount.
        scopedLifecycleLog('speech', 'onend_after_unmount_ignored');
        voiceDebug('recognition_ended_ignored', { reason: 'unmounted', gen: myGen });
        return;
      }
      // If this instance has been superseded, do NOT touch state or schedule
      // a restart — the live instance owns those transitions now.
      if (myGen !== generationRef.current) {
        voiceDebug('recognition_ended_ignored', {
          reason: 'stale_gen',
          gen: myGen,
          current_gen: generationRef.current,
        });
        return;
      }
      voiceDebug('recognition_ended', {
        gen: myGen,
        should_listen: shouldListenRef.current,
        chunks: transcriptChunksRef.current.length,
      });
      // Null out our reference so the visibility-resume effect can detect
      // "no live instance" and recover. Until this fix, the ref was never
      // cleared after onend, making visibility recovery dead code.
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      // Lifecycle resets to idle on every session end. Auto-restart (below)
      // will transition idle → starting → active again — the UI gap is
      // intentional so "Listening…" never lingers during the restart window.
      setRecognitionState('idle');
      // CRITICAL: do NOT clear transcriptChunksRef here. The browser ends the
      // session on pause/silence/timeout, and we auto-restart below — clearing
      // would wipe the answer mid-sentence. Interim is cleared because a new
      // session starts fresh; finalized chunks persist as the answer-so-far.
      interimRef.current = '';
      syncRender();

      if (shouldListenRef.current) {
        // Restart-storm guard: a pathologically broken audio device (USB
        // unplug, OS permission revoked mid-session, audio service crash)
        // can produce a tight onerror → onend → restart → onerror loop at
        // the 250 ms cadence. Cap restarts in a short window; on overflow,
        // bail out so the existing error UI can surface the manual Retry
        // path instead of burning CPU silently.
        const now = Date.now();
        restartHistoryRef.current = restartHistoryRef.current.filter(
          (t) => now - t < RESTART_STORM_WINDOW_MS,
        );
        if (restartHistoryRef.current.length >= MAX_RESTARTS_PER_WINDOW) {
          voiceDebug('restart_storm_giveup', {
            gen: myGen,
            recent_restart_count: restartHistoryRef.current.length,
            window_ms: RESTART_STORM_WINDOW_MS,
          });
          shouldListenRef.current = false;
          setError('Microphone keeps failing. Please check your mic permissions and click Retry.');
          return;
        }
        restartHistoryRef.current.push(now);

        voiceDebug('retry_triggered', {
          reason: 'auto_recovery_onend',
          gen: myGen,
          restart_count_in_window: restartHistoryRef.current.length,
        });
        log('restarted', { reason: 'auto-recovery', chunks: transcriptChunksRef.current.length });
        restartTimerRef.current = setTimeout(() => {
          // Triple-gate the resurrection: shouldListenRef (intentional stop),
          // mountedRef (component still alive), and the ref-stored callback
          // (latest implementation).
          if (shouldListenRef.current && mountedRef.current) {
            beginRecognitionRef.current();
          } else {
            scopedLifecycleLog('speech', 'restart_timer_suppressed', {
              shouldListen: shouldListenRef.current,
              mounted: mountedRef.current,
            });
          }
        }, RESTART_DELAY_MS);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      voiceDebug('recognition_start_threw', {
        gen: myGen,
        error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
      // start() throws InvalidStateError if a prior instance is mid-teardown.
      // Detach the dead instance NOW so its (still-bound) handlers can never
      // fire, then schedule a single delayed retry. Without the detach, the
      // dead instance could deliver onerror/onend later and pollute state.
      detachRecognition(recognition);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      if (shouldListenRef.current && mountedRef.current) {
        // Slightly longer delay than RESTART_DELAY_MS — the browser needs the
        // previous instance to fully release before start() succeeds.
        restartTimerRef.current = setTimeout(() => {
          if (shouldListenRef.current && mountedRef.current) {
            beginRecognitionRef.current();
          }
        }, 350);
      }
    }
  }, [syncRender, detachRecognition]);

  useEffect(() => {
    beginRecognitionRef.current = beginRecognition;
  }, [beginRecognition]);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    // In-flight guard. Without this, a rapid second call (e.g. post-TTS
    // auto-start arriving while a manual toggle-mic is still awaiting
    // getPermissionState) can fire two beginRecognition() calls back-to-back.
    if (startInFlightRef.current) {
      voiceDebug('start_listening_ignored_in_flight', {});
      return false;
    }
    startInFlightRef.current = true;
    voiceDebug('start_listening_called', {});
    setError(null);
    // Fresh user-initiated session: clear the recovery / storm history so a
    // previous question's failed attempts cannot trip the rate-limit on the
    // very first restart of this new session.
    restartHistoryRef.current = [];
    recoveryHistoryRef.current = [];
    lastRecoveryAtRef.current = 0;
    // NOTE: transcript chunks are intentionally NOT cleared here — only
    // resetTranscript() (called by the page on a new question/retry) clears
    // them. This keeps the answer intact across automatic recognition restarts
    // within one answer.
    interimRef.current = '';
    syncRender();

    try {
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
    } finally {
      startInFlightRef.current = false;
    }
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
    voiceDebug('transcript_reset', {});
    log('reset');
  }, [syncRender]);

  // ── Mobile Safari / PWA defensive handling ──────────────────────────────
  // iOS pauses recognition when the tab/PWA loses visibility (incoming call,
  // app switcher). On return, restart recognition if we should still be
  // listening. Transcript chunks are preserved across the pause.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      voiceDebug('tab_visibility_changed', {
        state: document.visibilityState,
        should_listen: shouldListenRef.current,
        has_live_recognition: !!recognitionRef.current,
      });
      if (
        document.visibilityState === 'visible' &&
        shouldListenRef.current &&
        mountedRef.current &&
        !recognitionRef.current
      ) {
        voiceDebug('retry_triggered', { reason: 'visibility_resume' });
        log('visibility_resume');
        beginRecognitionRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // ── Failsafe watchdog: silent recovery when 'active' but stuck ──────────
  // Runs ONLY while `recognitionState === 'active'`. The state transition
  // is what arms / disarms the polling — 'starting' (no transcript yet) is
  // intentionally NOT watchdog'd because a freshly-opened mic legitimately
  // has no audio activity until the user speaks.
  //
  // When 'active' is reached, `lastSpeechAtRef` is non-zero (the transcript
  // event that flipped state to 'active' updated it). If the timestamp ages
  // past STUCK_WATCHDOG_THRESHOLD_MS while state is still 'active', the
  // browser's audio pipeline has gone silent without firing onend — usually
  // a Bluetooth disconnect, OS mic mute, or audio-service stall.
  //
  // Recovery is RATE-LIMITED:
  //   • at least MIN_RECOVERY_GAP_MS between two recoveries,
  //   • no more than MAX_RECOVERIES_PER_WINDOW in RECOVERY_WINDOW_MS.
  // When the cap is hit, the watchdog stops auto-rebuilding; the session
  // page's existing stuck-mic escape UI surfaces the manual Retry button.
  //
  // Recovery itself calls `beginRecognitionRef.current()`. That single call
  // tears down the (possibly orphaned) live recognizer via the
  // generation-token path and constructs a fresh one in its place — there
  // is no scenario where the watchdog can produce duplicate recognizers
  // because beginRecognition is the same swap-in-place primitive used by
  // the natural restart loop. Accumulated transcript chunks are preserved.
  useEffect(() => {
    if (recognitionState !== 'active') return;

    const iv = setInterval(() => {
      if (!mountedRef.current || !shouldListenRef.current) return;
      if (recognitionState !== 'active') return;

      const now = Date.now();
      const sinceLastSpeech = now - lastSpeechAtRef.current;
      if (lastSpeechAtRef.current === 0 || sinceLastSpeech < STUCK_WATCHDOG_THRESHOLD_MS) {
        return;
      }

      // Hard floor between recoveries: ignore even if the threshold has
      // been crossed.
      if (now - lastRecoveryAtRef.current < MIN_RECOVERY_GAP_MS) {
        return;
      }

      // Sliding-window cap.
      recoveryHistoryRef.current = recoveryHistoryRef.current.filter(
        (t) => now - t < RECOVERY_WINDOW_MS,
      );
      if (recoveryHistoryRef.current.length >= MAX_RECOVERIES_PER_WINDOW) {
        voiceDebug('watchdog_capped', {
          recoveries_in_window: recoveryHistoryRef.current.length,
          window_ms: RECOVERY_WINDOW_MS,
        });
        // Do not setError or flip shouldListen — the stuck-mic escape UI
        // in the session page already surfaces a Retry mic button using
        // hasRecentSpeech() < window. Surfacing a second error here would
        // double-notify the user.
        return;
      }

      lastRecoveryAtRef.current = now;
      recoveryHistoryRef.current.push(now);
      voiceDebug('watchdog_silent_recovery', {
        elapsed_since_speech_ms: sinceLastSpeech,
        recovery_count: recoveryHistoryRef.current.length,
      });
      // Single, rate-limited rebuild. beginRecognitionRef bumps the
      // generation, detaches the live instance, and constructs a fresh one
      // — exactly the same primitive as the natural onend restart path.
      beginRecognitionRef.current();
    }, STUCK_WATCHDOG_POLL_MS);

    return () => clearInterval(iv);
  }, [recognitionState]);

  // ── StrictMode remount fix ───────────────────────────────────────────────
  // React StrictMode (dev) performs a mount → unmount → remount cycle. The
  // unmount cleanup sets mountedRef.current = false, but useRef preserves the
  // same object across the remount — so mountedRef.current stays false forever.
  // Resetting it to true HERE (on every mount/remount) ensures the remounted
  // instance has a valid mounted flag for all async callbacks.
  useEffect(() => {
    mountedRef.current = true;
    voiceDebug('mount_flag_reset', { source: 'useSpeechRecognition_mount' });
  }, []);

  // Deterministic unmount teardown. Ordering matters:
  //   1. mark unmounted (gates every async callback) and disable auto-restart
  //   2. cancel any pending restart timer (no resurrection)
  //   3. detach handlers on the active recognition instance — late events
  //      after stop() still bubble in some browsers, and an instance whose
  //      ref is gone cannot setState
  //   4. stop the instance and drop the ref
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      shouldListenRef.current = false;
      // Bump generation so any in-flight handler fired during teardown is
      // dropped by the stale-gate.
      generationRef.current += 1;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      const r = recognitionRef.current;
      recognitionRef.current = null;
      detachRecognition(r);
      // Reset rate-limit history so a StrictMode remount (dev only) gets a
      // clean slate. The fresh mount's refs are new objects anyway; this
      // line is belt-and-suspenders for static analyzers that flag refs
      // surviving an unmount.
      restartHistoryRef.current = [];
      recoveryHistoryRef.current = [];
      lastRecoveryAtRef.current = 0;
      voiceDebug('cleanup_executed', { source: 'useSpeechRecognition_unmount' });
      scopedLifecycleLog('speech', 'unmounted');
    };
  }, [detachRecognition]);

  return {
    recognitionState,
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
