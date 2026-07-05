// Lightweight structured lifecycle logger for the realtime audio pipeline.
// Used by useVoicePlayer / useMicrophone / useSpeechRecognition / StreamingSTT
// and the interview session page. Production-safe: thin wrapper around console
// so logs survive in Vercel logs but cost nothing in render time.
//
// Convention: tag = `[<scope>:lifecycle] <event>`. Greppable in one shot:
//   `grep -E "\[(voice-player|mic|speech|stt|session):lifecycle\]"`
//
// Keep emissions to TRANSITIONS, REJECTIONS and CLEANUP — not per-chunk.

export type LifecycleScope =
  | 'voice-player'
  | 'mic'
  | 'speech'
  | 'stt'
  | 'session';

type LogData = Record<string, unknown>;

function emit(level: 'log' | 'warn', scope: LifecycleScope, event: string, data?: LogData): void {
  const tag = `[${scope}:lifecycle] ${event}`;
  if (level === 'warn') {
    if (data) console.warn(tag, data);
    else console.warn(tag);
    return;
  }
  if (data) console.log(tag, data);
  else console.log(tag);
}

export function lifecycleLog(scope: LifecycleScope, event: string, data?: LogData): void {
  emit('log', scope, event, data);
}

export function lifecycleWarn(scope: LifecycleScope, event: string, data?: LogData): void {
  emit('warn', scope, event, data);
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured voice-pipeline debug logger.
//
// Emits `[VOICE_DEBUG] event_name {json}` for every lifecycle transition in
// the recognition / Deepgram / mic chain. This is the single source of truth
// for production debugging of the "Listening but no transcript" failure mode.
//
// PRODUCTION SAFETY GATE
// ----------------------
// In production (`NODE_ENV === 'production'`) the function is a NO-OP unless
// the operator has opted in by setting `localStorage.VOICE_DEBUG = '1'` in
// the browser console. This means:
//   • zero console spam for normal users in prod,
//   • zero CPU cost (early return + cheap env check, no JSON.stringify),
//   • support agents / engineers can flip the flag in a live session to
//     watch the pipeline without redeploying.
// In dev / preview builds the logs are always on.
//
// All call sites — useSpeechRecognition, useMicrophone, stt-client, session
// page — go through THIS function, so flipping production observability is
// a one-line change here. There are no scattered console.logs to chase.
// ─────────────────────────────────────────────────────────────────────────────

// Resolved once at module load. NODE_ENV is statically replaced by the
// bundler in client code so the production build literally dead-codes the
// debug emissions when the localStorage opt-in is absent.
const VOICE_DEBUG_ALWAYS_ON = process.env.NODE_ENV !== 'production';

function voiceDebugEnabled(): boolean {
  if (VOICE_DEBUG_ALWAYS_ON) return true;
  // Production: opt-in via `localStorage.setItem('VOICE_DEBUG', '1')`.
  // Wrapped in try/catch because localStorage can throw in sandboxed
  // iframes / Safari private mode.
  try {
    return typeof window !== 'undefined'
      && window.localStorage?.getItem('VOICE_DEBUG') === '1';
  } catch {
    return false;
  }
}

export function voiceDebug(event: string, data?: LogData): void {
  if (!voiceDebugEnabled()) return;
  if (data) console.log(`[VOICE_DEBUG] ${event}`, data);
  else console.log(`[VOICE_DEBUG] ${event}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Interview-startup structured logger.
//
// Single greppable prefix `[interview-startup]` covering the full path from
// session page mount → first answerable phase. Used to diagnose the iOS Safari
// / iOS PWA "stuck in Preparing…" failure mode where TTS callbacks never fire
// and the timer never starts. Auto-injects platform/browser/PWA + a wallclock
// elapsed-ms relative to module load so log lines stand on their own.
//
// Always-on (these are low-volume transition events, ~6 per interview start).
// ─────────────────────────────────────────────────────────────────────────────

interface PlatformContext {
  platform: 'ios' | 'android' | 'desktop' | 'ssr';
  browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'other' | 'ssr';
  pwa: boolean;
}

let cachedPlatform: PlatformContext | null = null;

export function getPlatformContext(): PlatformContext {
  if (cachedPlatform) return cachedPlatform;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    cachedPlatform = { platform: 'ssr', browser: 'ssr', pwa: false };
    return cachedPlatform;
  }
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports as Mac. Touch-points sniff is the standard fallback.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document);
  const isAndroid = /Android/i.test(ua);
  const isChrome = /Chrome|CriOS/.test(ua) && !/Edg|OPR/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  // Safari sniff must run AFTER chrome since Chrome's UA contains "Safari".
  const isSafari = !isChrome && !isEdge && !isFirefox && /Safari/.test(ua);
  let pwa = false;
  try {
    pwa =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    pwa = false;
  }
  cachedPlatform = {
    platform: isIOS ? 'ios' : isAndroid ? 'android' : 'desktop',
    browser: isSafari ? 'safari' : isChrome ? 'chrome' : isEdge ? 'edge' : isFirefox ? 'firefox' : 'other',
    pwa,
  };
  return cachedPlatform;
}

const STARTUP_EPOCH = typeof performance !== 'undefined' ? performance.now() : Date.now();

export function interviewStartupLog(event: string, data?: LogData): void {
  const ctx = getPlatformContext();
  const elapsedMs = Math.round(
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) - STARTUP_EPOCH,
  );
  const payload = { ...ctx, elapsedMs, ...(data ?? {}) };
  console.log(`[interview-startup] ${event}`, payload);
}

// ─────────────────────────────────────────────────────────────────────────────
// Always-on production voice + interview transition logs.
// Low-volume, greppable in browser console and session replays.
// ─────────────────────────────────────────────────────────────────────────────

export function voiceLog(event: string, data?: LogData): void {
  const payload = { ...getPlatformContext(), ...(data ?? {}) };
  console.log(`[VOICE] ${event}`, payload);
}

export function interviewLog(event: string, data?: LogData): void {
  const payload = { ...getPlatformContext(), ...(data ?? {}) };
  console.log(`[INTERVIEW] ${event}`, payload);
}

/** Always-on mic pipeline transitions (permission, acquire, release, track state). */
export function micFlowLog(event: string, data?: LogData): void {
  const payload = { ...getPlatformContext(), ts: Date.now(), ...(data ?? {}) };
  console.log(`[mic-flow] ${event}`, payload);
}

/** Structured mic error context for production diagnostics. */
export function buildMicErrorContext(
  err: unknown,
  extra?: LogData,
): LogData {
  const base: LogData = { ...getPlatformContext(), ...(extra ?? {}) };
  if (err instanceof DOMException) {
    return { ...base, error_name: err.name, error_message: err.message };
  }
  if (err instanceof Error) {
    return { ...base, error_name: err.name, error_message: err.message };
  }
  return { ...base, error_message: String(err) };
}
