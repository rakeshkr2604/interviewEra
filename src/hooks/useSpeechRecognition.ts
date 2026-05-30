'use client';

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';
import { getMicAudioConstraints } from '@/lib/settings/client-preferences';
import {
  mergeFinalTranscript,
  shouldPromoteInterimOnEnd,
  sttResultEventHash,
} from '@/lib/voice/stt-transcript';
import type { SttTelemetryCallback } from '@/lib/voice/stt-telemetry';
import {
  lifecycleLog as scopedLifecycleLog,
  lifecycleWarn as scopedLifecycleWarn,
  voiceDebug,
  voiceLog,
  getPlatformContext,
} from '@/lib/voice/lifecycle-log';

function micFlowLog(event: string, data?: Record<string, unknown>): void {
  console.log(`[mic-flow] ${event}`, { ...getPlatformContext(), ...(data ?? {}) });
}

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

/** Only these reasons may disarm auto-restart during an answer window. */
export type StopListeningReason =
  | 'user_mute'
  | 'answer_submitted'
  | 'question_timeout'
  | 'phase_change'
  | 'permission_revoked'
  | 'fatal_audio_error';

export interface UseSpeechRecognitionOptions {
  /**
   * When true (candidate_answering + voice armed), thinking silence is normal —
   * used for UI only; restart budget still applies (no infinite loops).
   */
  keepArmedDuringAnswerRef?: RefObject<boolean>;
  /** Optional STT telemetry sink (wired from session page). */
  onSttTelemetry?: SttTelemetryCallback;
}

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
  stopListening: (reason?: StopListeningReason) => void;
  /** Re-arm after browser session end without clearing transcript. */
  restartListening: () => void;
  /** Clear restart budget + failure when a new answer window opens. */
  clearStormBudgetForAnswer: () => void;
  /** True when auto-restart budget exhausted for this question. */
  recognitionFailed: boolean;
  /** Reset failure after user taps Retry Mic. */
  clearRecognitionFailure: () => void;
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
// Minimum gap between automatic session restarts (Android reconnect storm fix).
const RESTART_COOLDOWN_MS = 5_000;
const RESTART_DELAY_MS = RESTART_COOLDOWN_MS;
const DEFAULT_SILENCE_WINDOW_MS = 8_000;

/** Max automatic restarts per question — then fail closed with Retry Mic. */
const MAX_RESTARTS_PER_QUESTION = 3;

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

function log(event: string, data?: Record<string, unknown>): void {
  if (data) {
    console.log(`[speech] ${event}`, data);
  } else {
    console.log(`[speech] ${event}`);
  }
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const { keepArmedDuringAnswerRef, onSttTelemetry } = options;
  const emitStt = useCallback(
    (event: Parameters<SttTelemetryCallback>[0], data?: Record<string, unknown>) => {
      onSttTelemetry?.(event, data);
    },
    [onSttTelemetry],
  );
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
  const [recognitionFailed, setRecognitionFailed] = useState(false);

  // ── SINGLE-SOURCE TRANSCRIPT MODEL ─────────────────────────────────────
  // finalTranscriptRef — authoritative finalized text (never duplicated).
  // interimRef — current partial utterance; cleared on final or session end.
  const finalTranscriptRef = useRef<string>('');
  const interimRef = useRef<string>('');
  const lastSpeechAtRef = useRef<number>(0);
  const lastResultHashRef = useRef<string>('');

  // Render mirrors of the refs. Updated synchronously with each ref mutation
  // so the UI reflects new speech, but the refs remain authoritative for the
  // merged-transcript getter that submit() calls.
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const syncRender = useCallback(() => {
    if (!mountedRef.current) return; // stale-event guard
    setTranscript(finalTranscriptRef.current);
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
  /** Automatic restarts consumed this question (reset on clearStormBudgetForAnswer). */
  const restartCountThisQuestionRef = useRef<number>(0);
  const lastRestartAtRef = useRef<number>(0);
  const pendingRestartRef = useRef<boolean>(false);

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
    const finalized = finalTranscriptRef.current.trim();
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
    micFlowLog('permission_requested', { source: 'useSpeechRecognition' });
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMicAudioConstraints());
      const tracks = stream.getTracks();
      voiceDebug('mic_stream_acquired', {
        track_count: tracks.length,
        labels: tracks.map(t => t.label || '<unknown>'),
        readyStates: tracks.map(t => t.readyState),
        muted_flags: tracks.map(t => t.muted),
      });
      micFlowLog('stream_created', { track_count: tracks.length });
      tracks.forEach((track) => track.stop());
      setPermissionState('granted');
      voiceDebug('mic_permission_granted', {});
      voiceLog('mic_permission_granted', {});
      micFlowLog('permission_granted', {});
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

  const clearStormBudgetForAnswer = useCallback(() => {
    restartCountThisQuestionRef.current = 0;
    lastRestartAtRef.current = 0;
    pendingRestartRef.current = false;
    recoveryHistoryRef.current = [];
    lastRecoveryAtRef.current = 0;
    lastResultHashRef.current = '';
    setRecognitionFailed(false);
    setError(null);
  }, []);

  const clearRecognitionFailure = useCallback(() => {
    restartCountThisQuestionRef.current = 0;
    lastRestartAtRef.current = 0;
    pendingRestartRef.current = false;
    setRecognitionFailed(false);
    setError(null);
  }, []);

  const restartListening = useCallback(() => {
    shouldListenRef.current = true;
    setRecognitionFailed(false);
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    pendingRestartRef.current = false;
    voiceDebug('restart_listening', { source: 'restartListening' });
    log('restarted', { reason: 'explicit_restart' });
    emitStt('stt_restart_attempt', { source: 'user_restartListening' });
    beginRecognitionRef.current();
  }, [emitStt]);

  const stopListening = useCallback((reason: StopListeningReason = 'phase_change') => {
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
      reason,
      gen: generationRef.current,
      final_chars: finalTranscriptRef.current.length,
      has_interim: interimRef.current.length > 0,
    });
    log('stopped', {
      reason,
      final_chars: finalTranscriptRef.current.length,
      hasInterim: interimRef.current.length > 0,
    });
    emitStt('stt_session_stopped', { reason, sessionId: generationRef.current });
  }, [detachRecognition, emitStt]);

  const markRestartBudgetExhausted = useCallback((source: string, gen: number) => {
    pendingRestartRef.current = false;
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    setRecognitionFailed(true);
    setRecognitionState('idle');
    setError('Voice connection lost. Tap Retry Mic.');
    emitStt('stt_restart_budget_exhausted', {
      source,
      sessionId: gen,
      restartCount: restartCountThisQuestionRef.current,
    });
    voiceDebug('restart_budget_exhausted', {
      source,
      gen,
      restartCount: restartCountThisQuestionRef.current,
      armed: keepArmedDuringAnswerRef?.current ?? false,
    });
  }, [emitStt, keepArmedDuringAnswerRef]);

  const tryScheduleAutoRestart = useCallback((source: string, gen: number): boolean => {
    if (!shouldListenRef.current || !mountedRef.current) return false;

    const now = Date.now();
    const sinceLast = lastRestartAtRef.current ? now - lastRestartAtRef.current : Infinity;
    if (sinceLast < RESTART_COOLDOWN_MS) {
      emitStt('stt_restart_blocked', {
        source,
        reason: 'cooldown',
        elapsedMs: sinceLast,
        cooldownMs: RESTART_COOLDOWN_MS,
        sessionId: gen,
      });
      const waitMs = RESTART_COOLDOWN_MS - sinceLast;
      pendingRestartRef.current = true;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        pendingRestartRef.current = false;
        if (shouldListenRef.current && mountedRef.current && gen === generationRef.current) {
          tryScheduleAutoRestart(`${source}_after_cooldown`, gen);
        }
      }, waitMs);
      return false;
    }

    if (restartCountThisQuestionRef.current >= MAX_RESTARTS_PER_QUESTION) {
      markRestartBudgetExhausted(source, gen);
      return false;
    }

    restartCountThisQuestionRef.current += 1;
    lastRestartAtRef.current = now;
    pendingRestartRef.current = true;
    emitStt('stt_restart_attempt', {
      source,
      sessionId: gen,
      restartCount: restartCountThisQuestionRef.current,
      maxRestarts: MAX_RESTARTS_PER_QUESTION,
    });

    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      pendingRestartRef.current = false;
      if (shouldListenRef.current && mountedRef.current && gen === generationRef.current) {
        beginRecognitionRef.current();
      }
    }, RESTART_DELAY_MS);
    return true;
  }, [emitStt, markRestartBudgetExhausted]);

  // Legacy alias — visibility resume paths call beginRecognition directly.

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

    lastResultHashRef.current = '';
    voiceDebug('begin_recognition', { gen: myGen });
    emitStt('stt_session_started', { sessionId: myGen });

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
      voiceLog('speech_started', { gen: myGen });
      micFlowLog('recognition_started', { gen: myGen });
      log('started');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return;
      if (myGen !== generationRef.current) {
        emitStt('stt_stale_session_event', {
          kind: 'onresult',
          sessionId: myGen,
          activeSessionId: generationRef.current,
        });
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

      const eventHash = sttResultEventHash(finalChunk, interimChunk);
      if (eventHash && eventHash === lastResultHashRef.current) {
        emitStt('stt_duplicate_result', { sessionId: myGen, hash: eventHash });
        voiceDebug('transcript_ignored', { reason: 'duplicate_event', gen: myGen });
        return;
      }
      if (eventHash) lastResultHashRef.current = eventHash;

      const now = Date.now();
      let changed = false;

      if (finalChunk) {
        const cleaned = finalChunk.trim();
        if (cleaned) {
          const merged = mergeFinalTranscript(finalTranscriptRef.current, cleaned);
          if (merged.action === 'ignore') {
            emitStt('stt_duplicate_result', {
              sessionId: myGen,
              reason: merged.reason,
              incoming_chars: cleaned.length,
            });
            voiceDebug('transcript_ignored', {
              reason: merged.reason,
              gen: myGen,
              is_final: true,
            });
          } else {
            finalTranscriptRef.current = merged.text;
            interimRef.current = '';
            lastSpeechAtRef.current = now;
            changed = true;
            voiceDebug('transcript_received', {
              gen: myGen,
              is_final: true,
              merge_action: merged.action,
              chars: cleaned.length,
              total_chars: finalTranscriptRef.current.length,
            });
            log('final_merged', {
              merge_action: merged.action,
              reason: merged.reason,
              total_chars: finalTranscriptRef.current.length,
            });
          }
        }
      }

      if (interimChunk) {
        const cleaned = interimChunk.trim();
        if (cleaned && cleaned !== interimRef.current) {
          const nFinal = finalTranscriptRef.current.trim().replace(/\s+/g, ' ').toLowerCase();
          const nInterim = cleaned.replace(/\s+/g, ' ').toLowerCase();
          const isDuplicateOfFinal =
            nFinal.length > 0 && (nFinal === nInterim || nFinal.includes(nInterim));
          if (!isDuplicateOfFinal) {
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
      }

      if (changed) {
        setRecognitionState('active');
        voiceLog('speech_result', {
          gen: myGen,
          has_final: Boolean(finalChunk),
          has_interim: Boolean(interimChunk),
          total_chars: finalTranscriptRef.current.length + interimRef.current.length,
        });
        syncRender();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) return; // ignore late errors after unmount
      if (myGen !== generationRef.current) {
        emitStt('stt_stale_session_event', {
          kind: 'onerror',
          sessionId: myGen,
          activeSessionId: generationRef.current,
          error: event.error,
        });
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
        emitStt('stt_stale_session_event', {
          kind: 'onend',
          sessionId: myGen,
          activeSessionId: generationRef.current,
        });
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
        final_chars: finalTranscriptRef.current.length,
      });
      voiceLog('speech_ended', {
        gen: myGen,
        should_listen: shouldListenRef.current,
        final_chars: finalTranscriptRef.current.length,
        had_interim: interimRef.current.length > 0,
      });
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      setRecognitionState('idle');
      const pendingInterim = interimRef.current.trim();
      if (pendingInterim && shouldPromoteInterimOnEnd(finalTranscriptRef.current, pendingInterim)) {
        const promoted = mergeFinalTranscript(finalTranscriptRef.current, pendingInterim);
        if (promoted.action !== 'ignore') {
          finalTranscriptRef.current = promoted.text;
        }
        voiceDebug('interim_promoted_on_end', {
          gen: myGen,
          chars: pendingInterim.length,
          merge_action: promoted.action,
        });
      } else if (pendingInterim) {
        voiceDebug('interim_promotion_skipped', {
          gen: myGen,
          reason: 'duplicate_of_final',
        });
      }
      interimRef.current = '';
      lastResultHashRef.current = '';
      syncRender();

      if (shouldListenRef.current) {
        voiceDebug('retry_triggered', {
          reason: 'auto_recovery_onend',
          gen: myGen,
          restart_count: restartCountThisQuestionRef.current,
        });
        log('restarted', {
          reason: 'auto-recovery',
          final_chars: finalTranscriptRef.current.length,
        });
        tryScheduleAutoRestart('auto_recovery_onend', myGen);
      }
    };

    recognitionRef.current = recognition;
    micFlowLog('recognition_start_called', { gen: myGen });
    try {
      recognition.start();
    } catch (err) {
      const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      voiceDebug('recognition_start_threw', { gen: myGen, error: errMsg });
      micFlowLog('recognition_start_threw', { gen: myGen, error: errMsg });
      // start() throws InvalidStateError if a prior instance is mid-teardown.
      // On iOS Safari / PWA, start() throws SYNCHRONOUSLY every retry because
      // the page lost its gesture token during the permission prompt — without
      // counting these throws toward the restart-storm budget the loop became
      // unbounded: every 350 ms a new webkitSpeechRecognition was allocated +
      // thrown, saturating the main thread and freezing touch events while the
      // timer (setInterval) kept ticking. Visible symptom: "Click mic to enable"
      // stuck idle, hamburger unclickable, page unscrollable.
      //
      // Fix: synchronous throws ARE part of the restart-storm budget. After
      // MAX_RESTARTS_PER_WINDOW throws in RESTART_STORM_WINDOW_MS we stop
      // retrying, flip shouldListenRef off (so any late onend cannot revive
      // the loop) and surface the existing error UI — the candidate can then
      // switch to text input.
      detachRecognition(recognition);
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }

      if (shouldListenRef.current && mountedRef.current) {
        tryScheduleAutoRestart('start_throw_recovery', myGen);
      }
    }
  }, [
    syncRender,
    detachRecognition,
    emitStt,
    tryScheduleAutoRestart,
  ]);

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
    restartCountThisQuestionRef.current = 0;
    recoveryHistoryRef.current = [];
    lastRecoveryAtRef.current = 0;
    lastRestartAtRef.current = 0;
    pendingRestartRef.current = false;
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
      micFlowLog('listening_started', {});
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
    finalTranscriptRef.current = '';
    interimRef.current = '';
    lastSpeechAtRef.current = 0;
    lastResultHashRef.current = '';
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
      if (pendingRestartRef.current) return;
      if (restartCountThisQuestionRef.current >= MAX_RESTARTS_PER_QUESTION) {
        markRestartBudgetExhausted('watchdog_silent_recovery', generationRef.current);
        return;
      }
      tryScheduleAutoRestart('watchdog_silent_recovery', generationRef.current);
    }, STUCK_WATCHDOG_POLL_MS);

    return () => clearInterval(iv);
  }, [recognitionState, markRestartBudgetExhausted, tryScheduleAutoRestart]);

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
      restartCountThisQuestionRef.current = 0;
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
    restartListening,
    clearStormBudgetForAnswer,
    recognitionFailed,
    clearRecognitionFailure,
    resetTranscript,
    getMergedTranscript,
    hasRecentSpeech,
  };
}
