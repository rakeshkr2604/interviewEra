// ─────────────────────────────────────────────────────────────────────────────
// Unified interview telemetry layer.
//
// This is the SINGLE source of truth for interview-flow observability. It
// replaces the fragmented `[INTERVIEW]` / `[VOICE]` / `[interview-startup]` /
// `[mic-flow]` / `[session:lifecycle]` prefixes that previously logged
// inconsistent, context-poor lines that were impossible to correlate in
// production (Vercel logs only see HTTP status; mobile client failures were
// invisible).
//
// CONTRACT — every emitted event carries these MANDATORY fields:
//   • interviewId      — correlates all events for one interview
//   • questionIndex    — which question the candidate is on
//   • phase            — runtime SessionPhase at emit time
//   • platform         — ios | android | desktop | ssr
//   • browser          — safari | chrome | edge | firefox | other | ssr
//   • pwa              — standalone-mode boolean
//   • timestamp        — ISO-8601 wallclock
//   • ts               — epoch ms (sortable / diffable)
//   • runId            — per-page-load id so multiple attempts are separable
//   • sessionElapsedMs — ms since the telemetry module loaded
//
// Structured event TYPES (the audit's required schema):
//   INTERVIEW_FLOW, VOICE, TIMER, SUBMIT, EVALUATION, QUESTION_ADVANCE,
//   PHASE_TIMEOUT, RECOVERY, REPORT_GENERATION
//
// Critical events (submit failures, stuck states, phase timeouts, recovery)
// are additionally BEACONED to `/api/product-events` so they survive in the
// server log even when the device's console is unreachable — this is what
// makes mobile bugs debuggable in production. Beacons use `navigator.sendBeacon`
// so they survive page unload (refresh / backgrounding / navigation).
// ─────────────────────────────────────────────────────────────────────────────

import { getPlatformContext } from '@/lib/voice/lifecycle-log';

export type InterviewEventType =
  | 'INTERVIEW_FLOW'
  | 'VOICE'
  | 'TIMER'
  | 'SUBMIT'
  | 'EVALUATION'
  | 'QUESTION_ADVANCE'
  | 'PHASE_TIMEOUT'
  | 'RECOVERY'
  | 'REPORT_GENERATION';

export interface InterviewTelemetryContext {
  interviewId: string;
  questionIndex: number;
  phase: string;
}

export interface InterviewTelemetryOptions {
  /**
   * When true the event is also POSTed to `/api/product-events` so it lands in
   * the server log. Reserve for events that matter when the client console is
   * unreachable: submit failures, stuck states, phase timeouts, recoveries,
   * report-generation outcomes.
   */
  critical?: boolean;
  /**
   * Console severity. 'warn'/'error' route to console.warn/error so they are
   * visually distinct and picked up by error-aggregation tooling. Defaults to
   * 'info'.
   */
  level?: 'info' | 'warn' | 'error';
}

type TelemetryData = Record<string, unknown>;

const RUN_ID = makeRunId();

const TELEMETRY_EPOCH =
  typeof performance !== 'undefined' ? performance.now() : Date.now();

function makeRunId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID().slice(0, 8);
    }
  } catch {
    /* fall through */
  }
  return Math.random().toString(36).slice(2, 10);
}

function nowElapsedMs(): number {
  const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return Math.round(t - TELEMETRY_EPOCH);
}

/** The fully-resolved, mandatory-field-complete event shape that gets logged. */
export interface InterviewTelemetryEvent extends TelemetryData {
  type: InterviewEventType;
  event: string;
  interviewId: string;
  questionIndex: number;
  phase: string;
  platform: string;
  browser: string;
  pwa: boolean;
  timestamp: string;
  ts: number;
  runId: string;
  sessionElapsedMs: number;
}

function buildEvent(
  type: InterviewEventType,
  event: string,
  ctx: InterviewTelemetryContext,
  data?: TelemetryData,
): InterviewTelemetryEvent {
  const platform = getPlatformContext();
  const ts = Date.now();
  return {
    type,
    event,
    interviewId: ctx.interviewId,
    questionIndex: ctx.questionIndex,
    phase: ctx.phase,
    platform: platform.platform,
    browser: platform.browser,
    pwa: platform.pwa,
    timestamp: new Date(ts).toISOString(),
    ts,
    runId: RUN_ID,
    sessionElapsedMs: nowElapsedMs(),
    ...(data ?? {}),
  };
}

const PRODUCT_EVENTS_ENDPOINT = '/api/product-events';

/**
 * Best-effort fire-and-forget beacon to the server telemetry sink. Never throws,
 * never blocks, and survives page unload via sendBeacon. Falls back to a keepalive
 * fetch when sendBeacon is unavailable (older Safari) — keepalive lets the request
 * outlive the document during refresh/navigation.
 */
function beacon(payload: InterviewTelemetryEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // text/plain avoids a CORS preflight and is accepted by the route.
      const blob = new Blob([body], { type: 'text/plain;charset=UTF-8' });
      const ok = navigator.sendBeacon(PRODUCT_EVENTS_ENDPOINT, blob);
      if (ok) return;
    }
    // Fallback: keepalive fetch (survives unload in modern browsers).
    void fetch(PRODUCT_EVENTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* telemetry must never surface an error to the user */
    });
  } catch {
    /* swallow — telemetry is strictly best-effort */
  }
}

/**
 * Emit one structured interview telemetry event.
 *
 * @example
 *   interviewTelemetry('SUBMIT', 'submit_failed', ctx, { source: 'timer' }, { critical: true, level: 'error' })
 */
export function interviewTelemetry(
  type: InterviewEventType,
  event: string,
  ctx: InterviewTelemetryContext,
  data?: TelemetryData,
  options?: InterviewTelemetryOptions,
): void {
  const payload = buildEvent(type, event, ctx, data);
  const tag = `[${type}] ${event}`;
  const level = options?.level ?? 'info';

  // Always log to console — low volume, greppable, survives in Vercel logs and
  // session replays. The single `[TYPE] event {json}` shape is uniform across
  // every call site.
  if (level === 'error') console.error(tag, payload);
  else if (level === 'warn') console.warn(tag, payload);
  else console.log(tag, payload);

  if (options?.critical) beacon(payload);
}

/** Per-page-load session id included in every telemetry event. */
export function getInterviewTelemetryRunId(): string {
  return RUN_ID;
}
