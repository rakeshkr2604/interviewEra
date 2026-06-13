'use client';

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';
import { getMicAudioConstraints } from '@/lib/settings/client-preferences';
import { getWebSpeechUnsupportedMessage } from '@/lib/voice/browser-capabilities';
import { resolveSttLocale } from '@/lib/voice/speech-locale';
import { releaseAudioForMicCaptureSync } from '@/lib/voice/audio-gesture';
import {
  mergeFinalTranscript,
  shouldPromoteInterimOnEnd,
  sttResultEventHash,
} from '@/lib/voice/stt-transcript';
import type { SttTelemetryCallback } from '@/lib/voice/stt-telemetry';
import { sttTelemetryPayload } from '@/lib/voice/stt-telemetry';
import {
  lifecycleLog as scopedLifecycleLog,
  lifecycleWarn as scopedLifecycleWarn,
  voiceDebug,
  voiceLog,
  getPlatformContext,
} from '@/lib/voice/lifecycle-log';
import {
  isSttInputDebugEnabled,
  logMicTracksBeforeRecognitionStart,
  markSttInputDebugFlag,
  resetSttInputDebugFlags,
  sttInputTrace,
  stopSttInputLevelMeter,
} from '@/lib/voice/stt-input-debug';

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
  onaudiostart?: (() => void) | null;
  onaudioend?: (() => void) | null;
  onsoundstart?: (() => void) | null;
  onsoundend?: (() => void) | null;
  onspeechstart?: (() => void) | null;
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
  | 'fatal_audio_error'
  | 'bootstrap_stuck_starting'
  | 'user_retry_stuck_starting';

export interface WebSpeechStalledPayload {
  noSpeechStreak: number;
}

export interface UseSpeechRecognitionOptions {
  /**
   * When true (candidate_answering + voice armed), thinking silence is normal —
   * used for UI only; restart budget still applies (no infinite loops).
   */
  keepArmedDuringAnswerRef?: RefObject<boolean>;
  /** Optional STT telemetry sink (wired from session page). */
  onSttTelemetry?: SttTelemetryCallback;
  /** Stop TTS + release audio focus before mic capture (post-avatar on Android). */
  prepareForMicCapture?: () => void | Promise<void>;
  /** Fired when Web Speech repeatedly returns no-speech with zero transcript. */
  onWebSpeechStalled?: (payload: WebSpeechStalledPayload) => void;
}

export interface UseSpeechRecognitionReturn {
  /**
   * Tri-state lifecycle flag — see SpeechRecognitionState for semantics.
   * UI should gate "Listening…" labels on `recognitionState === 'active'`.
   */
  recognitionState: SpeechRecognitionState;
  /**
   * True only after the browser fires `onstart` for the current capture
   * session — stays true through armed auto-restarts until `stopListening`.
   * Use for mic toggle UI; do NOT treat `recognitionState !== 'idle'` as
   * "mic on" (that includes pre-onstart 'starting' and optimistic 'active').
   */
  isCapturing: boolean;
  /** @deprecated Prefer `isCapturing` for mic on/off UI. Alias of `isCapturing`. */
  isListening: boolean;
  /** Joined finalized chunks (for display). NEVER overwritten while listening. */
  transcript: string;
  /** Current interim chunk (italicized in UI). Reset only on next final or explicit reset. */
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  permissionState: 'unknown' | 'granted' | 'prompt' | 'denied' | 'requesting';
  startListening: () => Promise<boolean>;
  /** Call synchronously from click/tap — starts recognition before any await. */
  startListeningFromUserGesture: () => boolean;
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
  /** Restore finalized text after page refresh (does not start the mic). */
  restoreTranscript: (text: string) => void;
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
// Silence restarts (browser onend after a pause) use a short delay so the mic
// feels continuous; error restarts keep a longer cooldown to prevent storms.
const RESTART_COOLDOWN_SILENCE_MS = 400;
const RESTART_COOLDOWN_ARMED_MS = 250;
const RESTART_COOLDOWN_ERROR_MS = 3_000;
const RESTART_DELAY_SILENCE_MS = RESTART_COOLDOWN_SILENCE_MS;
/** Armed answer window — restart quickly after browser onend (pause between phrases). */
const RESTART_DELAY_ARMED_MS = 50;
const RESTART_DELAY_ERROR_MS = RESTART_COOLDOWN_ERROR_MS;
/** Consecutive no-speech errors with zero transcript before surfacing mic help. */
const ARMED_NO_SPEECH_STREAK_HINT = 8;
/** Trigger optional Deepgram fallback (via onWebSpeechStalled). */
const WEB_SPEECH_STALL_FALLBACK_STREAK = 4;
const DEFAULT_SILENCE_WINDOW_MS = 8_000;

/** Max failed start()/permission recovery attempts per question — silence restarts are unlimited. */
const MAX_ERROR_RESTARTS_PER_QUESTION = 3;
const STARTING_STALL_RECOVERY_MS = 12_000;
/** Armed answer — recover faster when onstart never fires. */
const STARTING_STALL_RECOVERY_ARMED_MS = 4_000;
/** Armed + active but zero transcript — silent pipeline rebuild. */
const ACTIVE_NO_TRANSCRIPT_ARMED_MS = 6_000;

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
/** Longer threshold while armed — candidates routinely pause 15–45s to think. */
const STUCK_WATCHDOG_ARMED_THRESHOLD_MS = 45_000;
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
  const { keepArmedDuringAnswerRef, onSttTelemetry, prepareForMicCapture, onWebSpeechStalled } = options;
  const onWebSpeechStalledRef = useRef(onWebSpeechStalled);
  onWebSpeechStalledRef.current = onWebSpeechStalled;
  const isAnswerMicArmed = useCallback((): boolean => {
    return keepArmedDuringAnswerRef?.current === true
  }, [keepArmedDuringAnswerRef])
  const emitStt = useCallback(
    (event: Parameters<SttTelemetryCallback>[0], data?: Record<string, unknown>) => {
      onSttTelemetry?.(event, sttTelemetryPayload(data));
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
  const isCapturingRef = useRef(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const setCapturing = useCallback((value: boolean) => {
    isCapturingRef.current = value;
    if (mountedRef.current) setIsCapturing(value);
  }, []);
  const isListening = isCapturing;
  const [error, setError] = useState<string | null>(
    () => (typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))
      ? null
      : getWebSpeechUnsupportedMessage()
  );
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'prompt' | 'denied' | 'requesting'>('unknown');
  const permissionStateRef = useRef(permissionState);
  permissionStateRef.current = permissionState;
  const [recognitionFailed, setRecognitionFailed] = useState(false);

  // ── SINGLE-SOURCE TRANSCRIPT MODEL ─────────────────────────────────────
  // finalTranscriptRef — authoritative finalized text (never duplicated).
  // interimRef — current partial utterance; cleared on final or session end.
  const finalTranscriptRef = useRef<string>('');
  const interimRef = useRef<string>('');
  const lastSpeechAtRef = useRef<number>(0);
  /** Updated only when transcript refs gain text — used for silent-pipeline recovery. */
  const lastTranscriptAtRef = useRef<number>(0);
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
  /** Failed start()/permission attempts this question (silence onend restarts do NOT increment). */
  const errorRestartCountThisQuestionRef = useRef<number>(0);
  const lastRestartAtRef = useRef<number>(0);
  const pendingRestartRef = useRef<boolean>(false);
  const startingSinceRef = useRef<number>(0);
  const armedNoSpeechStreakRef = useRef<number>(0);
  const webSpeechStalledFiredRef = useRef<boolean>(false);
  const micKeepAliveStreamRef = useRef<MediaStream | null>(null);
  const recognitionStateRef = useRef<SpeechRecognitionState>('idle');
  recognitionStateRef.current = recognitionState;

  const releaseMicKeepAliveStream = useCallback((): void => {
    const stream = micKeepAliveStreamRef.current;
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
    micKeepAliveStreamRef.current = null;
  }, []);

  // Idempotent teardown for a SpeechRecognition instance. Detaches every
  // handler BEFORE stopping so late events the browser dispatches after
  // stop() are silently dropped — they can no longer enter our setState
  // path. Used by both beginRecognition (swap) and unmount.
  const detachRecognition = useCallback((r: SpeechRecognitionInstance | null): void => {
    if (!r) return;
    r.onstart = null;
    r.onaudiostart = null;
    r.onaudioend = null;
    r.onsoundstart = null;
    r.onsoundend = null;
    r.onspeechstart = null;
    r.onresult = null;
    r.onerror = null;
    r.onend = null;
    try { r.stop(); } catch { /* */ }
    if (isSttInputDebugEnabled()) {
      sttInputTrace('stop', { reason: 'detachRecognition' });
    }
  }, []);

  const getMergedTranscript = useCallback((): string => {
    const finalized = finalTranscriptRef.current.trim();
    const interim = interimRef.current.trim();
    if (!finalized && !interim) return '';
    if (!finalized) return interim;
    if (!interim) return finalized;
    return `${finalized} ${interim}`;
  }, []);

  const hasTranscriptContent = useCallback((): boolean => {
    return (
      finalTranscriptRef.current.trim().length > 0 ||
      interimRef.current.trim().length > 0
    );
  }, []);

  const hasRecentSpeech = useCallback((windowMs: number = DEFAULT_SILENCE_WINDOW_MS): boolean => {
    if (lastSpeechAtRef.current === 0) return false;
    return Date.now() - lastSpeechAtRef.current < windowMs;
  }, []);

  const ensureMicKeepAliveStream = useCallback(async (): Promise<boolean> => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionState('denied');
      setError('Microphone is not available in this browser.');
      return false;
    }

    const existing = micKeepAliveStreamRef.current;
    if (existing?.getTracks().some((track) => track.readyState === 'live')) {
      return true;
    }
    if (existing) {
      releaseMicKeepAliveStream();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMicAudioConstraints());
      const tracks = stream.getTracks();
      micKeepAliveStreamRef.current = stream;
      voiceDebug('mic_stream_acquired', {
        track_count: tracks.length,
        labels: tracks.map((t) => t.label || '<unknown>'),
        readyStates: tracks.map((t) => t.readyState),
        muted_flags: tracks.map((t) => t.muted),
        keep_alive: true,
      });
      micFlowLog('stream_created', { track_count: tracks.length, keep_alive: true });
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
  }, [releaseMicKeepAliveStream]);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    setPermissionState('requesting');
    hasRequestedMicRef.current = true;
    voiceDebug('mic_permission_requested', { source: 'useSpeechRecognition' });
    micFlowLog('permission_requested', { source: 'useSpeechRecognition' });
    return ensureMicKeepAliveStream();
  }, [ensureMicKeepAliveStream]);

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
    errorRestartCountThisQuestionRef.current = 0;
    lastRestartAtRef.current = 0;
    pendingRestartRef.current = false;
    startingSinceRef.current = 0;
    recoveryHistoryRef.current = [];
    lastRecoveryAtRef.current = 0;
    lastResultHashRef.current = '';
    armedNoSpeechStreakRef.current = 0;
    webSpeechStalledFiredRef.current = false;
    setRecognitionFailed(false);
    setError(null);
  }, []);

  const maybeFireWebSpeechStalled = useCallback((streak: number) => {
    // Never auto-fallback mid-answer — switching engines stops Web Speech and
    // feels like the mic "gave up" while the candidate is still speaking.
    if (isAnswerMicArmed()) return;
    if (streak < WEB_SPEECH_STALL_FALLBACK_STREAK) return;
    if (webSpeechStalledFiredRef.current) return;
    webSpeechStalledFiredRef.current = true;
    voiceDebug('web_speech_stalled', { no_speech_streak: streak });
    onWebSpeechStalledRef.current?.({ noSpeechStreak: streak });
  }, [isAnswerMicArmed]);

  const clearRecognitionFailure = useCallback(() => {
    errorRestartCountThisQuestionRef.current = 0;
    lastRestartAtRef.current = 0;
    pendingRestartRef.current = false;
    startingSinceRef.current = 0;
    armedNoSpeechStreakRef.current = 0;
    webSpeechStalledFiredRef.current = false;
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
    releaseMicKeepAliveStream();
    if (isSttInputDebugEnabled()) {
      void stopSttInputLevelMeter();
      sttInputTrace('stop_listening', { reason, sessionId: generationRef.current });
    }
    setCapturing(false);
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
  }, [detachRecognition, emitStt, releaseMicKeepAliveStream, setCapturing]);

  const markRestartBudgetExhausted = useCallback((source: string, gen: number) => {
    pendingRestartRef.current = false;
    shouldListenRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    setRecognitionFailed(true);
    setCapturing(false);
    setRecognitionState('idle');
    setError('Voice connection lost. Tap Retry Mic.');
    emitStt('stt_restart_exhausted', {
      source,
      sessionId: gen,
      errorRestartCount: errorRestartCountThisQuestionRef.current,
    });
    emitStt('stt_restart_budget_exhausted', {
      source,
      sessionId: gen,
      errorRestartCount: errorRestartCountThisQuestionRef.current,
    });
    voiceDebug('restart_budget_exhausted', {
      source,
      gen,
      errorRestartCount: errorRestartCountThisQuestionRef.current,
      armed: keepArmedDuringAnswerRef?.current ?? false,
    });
  }, [emitStt, keepArmedDuringAnswerRef, setCapturing]);

  type RestartKind = 'silence' | 'error';

  const tryScheduleAutoRestart = useCallback((
    source: string,
    gen: number,
    kind: RestartKind = 'silence',
  ): boolean => {
    if (!shouldListenRef.current || !mountedRef.current) return false;

    const armed = isAnswerMicArmed();
    const cooldownMs =
      kind === 'error'
        ? RESTART_COOLDOWN_ERROR_MS
        : armed
          ? RESTART_COOLDOWN_ARMED_MS
          : RESTART_COOLDOWN_SILENCE_MS;
    const delayMs =
      kind === 'error'
        ? RESTART_DELAY_ERROR_MS
        : armed
          ? RESTART_DELAY_ARMED_MS
          : RESTART_DELAY_SILENCE_MS;

    const now = Date.now();
    const sinceLast = lastRestartAtRef.current ? now - lastRestartAtRef.current : Infinity;
    if (sinceLast < cooldownMs) {
      emitStt('stt_restart_blocked', {
        source,
        kind,
        reason: 'cooldown',
        elapsedMs: sinceLast,
        cooldownMs,
        sessionId: gen,
      });
      const waitMs = cooldownMs - sinceLast;
      pendingRestartRef.current = true;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        pendingRestartRef.current = false;
        if (shouldListenRef.current && mountedRef.current && gen === generationRef.current) {
          tryScheduleAutoRestart(`${source}_after_cooldown`, gen, kind);
        }
      }, waitMs);
      return false;
    }

    if (kind === 'error') {
      if (errorRestartCountThisQuestionRef.current >= MAX_ERROR_RESTARTS_PER_QUESTION) {
        markRestartBudgetExhausted(source, gen);
        return false;
      }
      errorRestartCountThisQuestionRef.current += 1;
    }

    lastRestartAtRef.current = now;
    pendingRestartRef.current = true;
    emitStt('stt_restart_attempt', {
      source,
      kind,
      sessionId: gen,
      errorRestartCount: errorRestartCountThisQuestionRef.current,
      maxErrorRestarts: MAX_ERROR_RESTARTS_PER_QUESTION,
    });

    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(() => {
      pendingRestartRef.current = false;
      if (shouldListenRef.current && mountedRef.current && gen === generationRef.current) {
        beginRecognitionRef.current();
      }
    }, delayMs);
    return true;
  }, [emitStt, isAnswerMicArmed, markRestartBudgetExhausted]);

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

    // During the answer window the mic stays ON until stopListening().
    if (!shouldListenRef.current) {
      setRecognitionState('idle');
    } else if (isCapturingRef.current) {
      setRecognitionState('active');
    } else if (isAnswerMicArmed()) {
      setRecognitionState('starting');
      startingSinceRef.current = Date.now();
    } else if (recognitionStateRef.current !== 'active') {
      setRecognitionState('starting');
      startingSinceRef.current = Date.now();
    }

    const recognition = new Cls();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = resolveSttLocale();

    lastResultHashRef.current = '';
    voiceDebug('begin_recognition', { gen: myGen });
    emitStt('stt_session_started', { sessionId: myGen });
    if (isSttInputDebugEnabled()) {
      resetSttInputDebugFlags(myGen);
      sttInputTrace('start', { sessionId: myGen });
    }

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
      // Mic session is open; transcript events promote to 'active'.
      setCapturing(true);
      setRecognitionState('starting');
      startingSinceRef.current = Date.now();
      emitStt('stt_onstart', { sessionId: myGen });
      emitStt('stt_start_success', { sessionId: myGen, phase: 'onstart' });
      sttInputTrace('onstart', { sessionId: myGen });
      voiceDebug('recognition_started', { gen: myGen });
      voiceLog('speech_started', { gen: myGen });
      micFlowLog('recognition_started', { gen: myGen });
      log('started');
    };

    recognition.onaudiostart = () => {
      if (!mountedRef.current || myGen !== generationRef.current) return;
      emitStt('stt_onaudiostart', { sessionId: myGen });
      sttInputTrace('onaudiostart', { sessionId: myGen });
      markSttInputDebugFlag('onaudiostart', myGen);
    };

    recognition.onaudioend = () => {
      if (!mountedRef.current || myGen !== generationRef.current) return;
      sttInputTrace('onaudioend', { sessionId: myGen });
      markSttInputDebugFlag('onaudioend', myGen);
    };

    recognition.onsoundstart = () => {
      if (!mountedRef.current || myGen !== generationRef.current) return;
      sttInputTrace('onsoundstart', { sessionId: myGen });
      markSttInputDebugFlag('onsoundstart', myGen);
    };

    recognition.onsoundend = () => {
      if (!mountedRef.current || myGen !== generationRef.current) return;
      sttInputTrace('onsoundend', { sessionId: myGen });
      markSttInputDebugFlag('onsoundend', myGen);
    };

    recognition.onspeechstart = () => {
      if (!mountedRef.current || myGen !== generationRef.current) return;
      emitStt('stt_onspeechstart', { sessionId: myGen });
      sttInputTrace('onspeechstart', { sessionId: myGen });
      markSttInputDebugFlag('onspeechstart', myGen);
      armedNoSpeechStreakRef.current = 0;
      setCapturing(true);
      setRecognitionState('active');
      // Do not bump lastSpeechAt here — only real transcript events count for
      // "recent speech" and stuck recovery. onspeechstart alone can fire while
      // the audio pipeline delivers zero onresult events (Chrome/Edge silent STT).
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
        const piece = r[0]?.transcript ?? '';
        if (r.isFinal) finalChunk += piece;
        else interimChunk += piece;
      }

      // Chromium sometimes reports a stale resultIndex with text only at index 0
      // or the last slot — recover so speech is not dropped while "Listening…".
      if (!finalChunk.trim() && !interimChunk.trim() && event.results.length > 0) {
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i];
          const piece = r[0]?.transcript ?? '';
          if (!piece.trim()) continue;
          if (r.isFinal) finalChunk += piece;
          else interimChunk = piece;
        }
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
        armedNoSpeechStreakRef.current = 0;
        setCapturing(true);
        setRecognitionState('active');
        startingSinceRef.current = 0;
        lastTranscriptAtRef.current = now;
        lastSpeechAtRef.current = now;
        emitStt('stt_onresult', {
          sessionId: myGen,
          has_final: Boolean(finalChunk),
          has_interim: Boolean(interimChunk),
          total_chars: finalTranscriptRef.current.length + interimRef.current.length,
        });
        sttInputTrace('onresult', {
          sessionId: myGen,
          has_final: Boolean(finalChunk),
          has_interim: Boolean(interimChunk),
        });
        markSttInputDebugFlag('onresult', myGen);
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
      emitStt('stt_onerror', { sessionId: myGen, error: event.error });
      sttInputTrace('onerror', { sessionId: myGen, error: event.error });
      // 'no-speech' (user paused), 'aborted' (we stopped it), and 'network'
      // (transient between restarts) are normal lifecycle events — let onend
      // handle recovery, don't surface them as red errors to the user.
      if (event.error === 'no-speech') {
        log('benign_error', { error: 'no-speech' });
        const hasLiveText =
          finalTranscriptRef.current.length > 0 ||
          interimRef.current.trim().length > 0;
        if (!hasLiveText) {
          armedNoSpeechStreakRef.current += 1;
          maybeFireWebSpeechStalled(armedNoSpeechStreakRef.current);
          if (
            isAnswerMicArmed() &&
            armedNoSpeechStreakRef.current >= ARMED_NO_SPEECH_STREAK_HINT
          ) {
            setError(
              'Microphone is open but not picking up speech. Check Windows sound settings (input device + level), or use AI Voice / Type answer.',
            );
          }
        } else if (isAnswerMicArmed()) {
          // Pause between phrases — keep streak cleared so we never fallback mid-answer.
          armedNoSpeechStreakRef.current = 0;
        }
        if (!isAnswerMicArmed()) {
          recognition.stop();
        }
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
        'service-not-allowed': getWebSpeechUnsupportedMessage(),
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
      emitStt('stt_onend', {
        sessionId: myGen,
        should_listen: shouldListenRef.current,
        final_chars: finalTranscriptRef.current.length,
      });
      sttInputTrace('onend', {
        sessionId: myGen,
        should_listen: shouldListenRef.current,
      });
      startingSinceRef.current = 0;
      voiceLog('speech_ended', {
        gen: myGen,
        should_listen: shouldListenRef.current,
        final_chars: finalTranscriptRef.current.length,
        had_interim: interimRef.current.length > 0,
      });
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
      if (shouldListenRef.current) {
        const hasAnySpeech =
          lastSpeechAtRef.current > 0 ||
          finalTranscriptRef.current.length > 0 ||
          interimRef.current.trim().length > 0;
        setRecognitionState(hasAnySpeech ? 'active' : 'starting');
      } else {
        setCapturing(false);
        setRecognitionState('idle');
      }
      const pendingInterim = interimRef.current.trim();
      if (pendingInterim && shouldPromoteInterimOnEnd(finalTranscriptRef.current, pendingInterim)) {
        const promoted = mergeFinalTranscript(finalTranscriptRef.current, pendingInterim);
        if (promoted.action !== 'ignore') {
          finalTranscriptRef.current = promoted.text;
          lastTranscriptAtRef.current = Date.now();
          lastSpeechAtRef.current = Date.now();
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
          reason: isAnswerMicArmed() ? 'armed_continuous_onend' : 'auto_recovery_onend',
          gen: myGen,
          error_restart_count: errorRestartCountThisQuestionRef.current,
          no_speech_streak: armedNoSpeechStreakRef.current,
        });
        if (!isAnswerMicArmed()) {
          log('restarted', {
            reason: 'auto-recovery',
            final_chars: finalTranscriptRef.current.length,
            error_restart_count: errorRestartCountThisQuestionRef.current,
          });
        }
        tryScheduleAutoRestart(
          isAnswerMicArmed() ? 'armed_continuous_onend' : 'auto_recovery_onend',
          myGen,
          'silence',
        );
      }
    };

    recognitionRef.current = recognition;
    // Web Speech opens its own mic capture on Chrome — holding getUserMedia
    // concurrently causes silent input and immediate no-speech errors.
    if (isSttInputDebugEnabled()) {
      logMicTracksBeforeRecognitionStart(micKeepAliveStreamRef.current, myGen);
    }
    releaseMicKeepAliveStream();
    micFlowLog('recognition_start_called', { gen: myGen });
    try {
      recognition.start();
    } catch (err) {
      const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      emitStt('stt_start_failed', { sessionId: myGen, error: errMsg, phase: 'start_throw' });
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
        tryScheduleAutoRestart('start_throw_recovery', myGen, 'error');
      }
    }
  }, [
    syncRender,
    detachRecognition,
    emitStt,
    tryScheduleAutoRestart,
    isAnswerMicArmed,
    maybeFireWebSpeechStalled,
    releaseMicKeepAliveStream,
  ]);

  useEffect(() => {
    beginRecognitionRef.current = beginRecognition;
  }, [beginRecognition]);

  const resetForNewListenSession = useCallback(() => {
    setError(null);
    errorRestartCountThisQuestionRef.current = 0;
    recoveryHistoryRef.current = [];
    lastRecoveryAtRef.current = 0;
    lastRestartAtRef.current = 0;
    pendingRestartRef.current = false;
    startingSinceRef.current = 0;
    interimRef.current = '';
    syncRender();
  }, [syncRender]);

  const armRecognitionSync = useCallback(() => {
    releaseAudioForMicCaptureSync();
    shouldListenRef.current = true;
    micFlowLog('listening_started', { source: 'user_gesture_sync' });
    beginRecognition();
  }, [beginRecognition]);

  const startListeningFromUserGesture = useCallback((): boolean => {
    if (!isSupported) return false;
    if (startInFlightRef.current) {
      voiceDebug('start_listening_ignored_in_flight', { source: 'user_gesture' });
      return false;
    }
    startInFlightRef.current = true;
    voiceDebug('start_listening_from_gesture', {});
    emitStt('stt_start_requested', { source: 'user_gesture' });
    resetForNewListenSession();

    if (permissionStateRef.current === 'denied') {
      setError('Microphone permission denied. Click Retry to request again.');
      startInFlightRef.current = false;
      return false;
    }

    if (hasRequestedMicRef.current && permissionStateRef.current === 'granted') {
      void (async () => {
        try {
          const streamOk = await ensureMicKeepAliveStream();
          if (!streamOk || !mountedRef.current) {
            emitStt('stt_start_failed', { reason: 'keep_alive_stream_failed' });
            if (mountedRef.current) setError('Unable to open microphone. Try Retry or Type answer.');
            return;
          }
          armRecognitionSync();
        } finally {
          startInFlightRef.current = false;
        }
      })();
      return true;
    }

    setPermissionState('requesting');
    void (async () => {
      try {
        const granted = await requestMicPermission();
        hasRequestedMicRef.current = true;
        if (!granted || !mountedRef.current) {
          emitStt('stt_start_failed', { reason: 'permission_denied' });
          if (mountedRef.current) setError('Microphone still blocked');
          return;
        }
        armRecognitionSync();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        emitStt('stt_start_failed', { reason: 'user_gesture_throw', error: msg });
      } finally {
        startInFlightRef.current = false;
      }
    })();
    return true;
  }, [isSupported, emitStt, resetForNewListenSession, armRecognitionSync, requestMicPermission, ensureMicKeepAliveStream]);

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
    voiceDebug('start_listening_called', { source: 'async_retry' });
    emitStt('stt_start_requested', { source: 'startListening' });
    resetForNewListenSession();

    try {
      if (prepareForMicCapture) {
        await prepareForMicCapture();
      }

      const knownPermissionState = await getPermissionState();
      emitStt('stt_permission_state', { state: knownPermissionState });
      if (knownPermissionState === 'denied') {
        setPermissionState('denied');
        setError('Microphone permission denied. Click Retry to request again.');
        return false;
      }

      if (knownPermissionState !== 'granted' || !hasRequestedMicRef.current) {
        const granted = await requestMicPermission();
        hasRequestedMicRef.current = true;
        if (!granted) {
          emitStt('stt_start_failed', { reason: 'permission_denied' });
          setError('Microphone still blocked');
          return false;
        }
      } else {
        const streamOk = await ensureMicKeepAliveStream();
        if (!streamOk) {
          emitStt('stt_start_failed', { reason: 'keep_alive_stream_failed' });
          setError('Unable to open microphone. Try Retry or Type answer.');
          return false;
        }
      }

      shouldListenRef.current = true;
      micFlowLog('listening_started', {});
      beginRecognition();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emitStt('stt_start_failed', { reason: 'start_listening_throw', error: msg });
      return false;
    } finally {
      startInFlightRef.current = false;
    }
  }, [isSupported, getPermissionState, requestMicPermission, ensureMicKeepAliveStream, beginRecognition, resetForNewListenSession, emitStt, prepareForMicCapture]);

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
    lastTranscriptAtRef.current = 0;
    lastResultHashRef.current = '';
    syncRender();
    voiceDebug('transcript_reset', {});
    log('reset');
  }, [syncRender]);

  const restoreTranscript = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      finalTranscriptRef.current = trimmed;
      interimRef.current = '';
      lastSpeechAtRef.current = trimmed ? Date.now() : 0;
      lastTranscriptAtRef.current = trimmed ? Date.now() : 0;
      lastResultHashRef.current = '';
      syncRender();
      voiceDebug('transcript_restored', { chars: trimmed.length });
      log('transcript_restored', { chars: trimmed.length });
    },
    [syncRender],
  );

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
    if (isAnswerMicArmed()) return;

    const iv = setInterval(() => {
      if (!mountedRef.current || !shouldListenRef.current) return;
      if (recognitionState !== 'active') return;

      const now = Date.now();
      const stuckThresholdMs =
        keepArmedDuringAnswerRef?.current === true
          ? STUCK_WATCHDOG_ARMED_THRESHOLD_MS
          : STUCK_WATCHDOG_THRESHOLD_MS;
      const sinceLastSpeech = now - lastSpeechAtRef.current;
      if (lastSpeechAtRef.current === 0 || sinceLastSpeech < stuckThresholdMs) {
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
      tryScheduleAutoRestart('watchdog_silent_recovery', generationRef.current, 'silence');
    }, STUCK_WATCHDOG_POLL_MS);

    return () => clearInterval(iv);
  }, [recognitionState, tryScheduleAutoRestart, keepArmedDuringAnswerRef, isAnswerMicArmed]);

  // Android often reaches onstart but delays (or never delivers) first onresult.
  // Do NOT skip recovery just because isCapturing is true — onstart sets that
  // flag before any transcript exists, which previously stranded "Listening…"
  // with an empty answer box for the entire question.
  useEffect(() => {
    if (recognitionState !== 'starting') return;

    const iv = setInterval(() => {
      if (recognitionStateRef.current !== 'starting') return;
      if (!shouldListenRef.current || !mountedRef.current) return;
      if (pendingRestartRef.current) return;
      if (hasTranscriptContent()) return;

      const since = startingSinceRef.current ? Date.now() - startingSinceRef.current : 0;
      const stallMs = isAnswerMicArmed()
        ? STARTING_STALL_RECOVERY_ARMED_MS
        : STARTING_STALL_RECOVERY_MS;
      if (since < stallMs) return;

      voiceDebug('starting_stall_recovery', {
        elapsed_ms: since,
        armed: isAnswerMicArmed(),
        capturing: isCapturingRef.current,
      });
      emitStt('stt_restart_attempt', {
        source: 'starting_stall_recovery',
        kind: 'silence',
        sessionId: generationRef.current,
        elapsedMs: since,
      });
      tryScheduleAutoRestart('starting_stall_recovery', generationRef.current, 'silence');
    }, 3_000);

    return () => clearInterval(iv);
  }, [recognitionState, emitStt, tryScheduleAutoRestart, isAnswerMicArmed, hasTranscriptContent]);

  // Armed answer window: mic shows "Listening…" (active) but browser STT never
  // delivers onresult — rebuild the recognition instance silently.
  useEffect(() => {
    if (recognitionState !== 'active') return;
    if (!isAnswerMicArmed()) return;

    const iv = setInterval(() => {
      if (recognitionStateRef.current !== 'active') return;
      if (!shouldListenRef.current || !mountedRef.current) return;
      if (!isAnswerMicArmed()) return;
      if (pendingRestartRef.current) return;
      if (hasTranscriptContent()) return;

      const anchor = startingSinceRef.current || lastTranscriptAtRef.current;
      if (!anchor) return;
      const elapsed = Date.now() - anchor;
      if (elapsed < ACTIVE_NO_TRANSCRIPT_ARMED_MS) return;

      voiceDebug('active_no_transcript_recovery', { elapsed_ms: elapsed });
      emitStt('stt_restart_attempt', {
        source: 'active_no_transcript_recovery',
        kind: 'silence',
        sessionId: generationRef.current,
        elapsedMs: elapsed,
      });
      tryScheduleAutoRestart('active_no_transcript_recovery', generationRef.current, 'silence');
    }, 2_000);

    return () => clearInterval(iv);
  }, [recognitionState, emitStt, tryScheduleAutoRestart, isAnswerMicArmed, hasTranscriptContent]);

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
      releaseMicKeepAliveStream();
      if (isSttInputDebugEnabled()) {
        void stopSttInputLevelMeter();
      }
      // Reset rate-limit history so a StrictMode remount (dev only) gets a
      // clean slate. The fresh mount's refs are new objects anyway; this
      // line is belt-and-suspenders for static analyzers that flag refs
      // surviving an unmount.
      errorRestartCountThisQuestionRef.current = 0;
      recoveryHistoryRef.current = [];
      lastRecoveryAtRef.current = 0;
      voiceDebug('cleanup_executed', { source: 'useSpeechRecognition_unmount' });
      scopedLifecycleLog('speech', 'unmounted');
    };
  }, [detachRecognition, releaseMicKeepAliveStream]);

  return {
    recognitionState,
    isCapturing,
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    permissionState,
    startListening,
    startListeningFromUserGesture,
    retryPermission,
    stopListening,
    restartListening,
    clearStormBudgetForAnswer,
    recognitionFailed,
    clearRecognitionFailure,
    resetTranscript,
    restoreTranscript,
    getMergedTranscript,
    hasRecentSpeech,
  };
}
