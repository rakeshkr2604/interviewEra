// ─────────────────────────────────────────────────────────────────────────────
// Client telemetry sink — `/api/product-events`.
//
// Receives critical interview-flow telemetry beacons from the browser
// (interviewTelemetry({ critical: true })) so mobile failures are visible in
// the SERVER log even when the device console is unreachable. Previously the
// only production signal was Vercel's HTTP status line — submit_blocked,
// stuck-after-transcript, and phase_timeout events never reached the backend.
//
// Design rules (telemetry must never harm the user experience):
//   • Always returns 204 — a failed beacon must not surface an error client-side.
//   • Best-effort rate limit per IP so the endpoint cannot be turned into a
//     log-spam amplifier. Over-limit requests are dropped silently (still 204).
//   • Accepts text/plain (sendBeacon default) and application/json.
//   • Each event is emitted as a single greppable `[client-telemetry]` JSON line.
//
// Durable persistence: this endpoint remains console-only for the general
// beacon stream. A small, explicit allowlist of recognized startup-funnel
// milestones is additionally translated + persisted to `product_events` via
// `persistMilestoneEventOnce` (see resolveMilestoneEvent below) — everything
// else is unaffected.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { persistMilestoneEventOnce, type MilestoneEventName } from '@/lib/analytics/milestone-events-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_CONTENT = new NextResponse(null, { status: 204 });

// Generous: a single interview emits a handful of critical events. 240/min/IP
// covers rapid recovery loops while bounding abuse. Limiter failures (Redis
// down) fail OPEN — telemetry is best-effort, not a security boundary.
const RATE_WINDOW_SECONDS = 60;
const RATE_MAX_EVENTS = 240;

// Hard cap on accepted batch size / body size so a malformed or hostile beacon
// cannot allocate unbounded memory in the log pipeline.
const MAX_EVENTS_PER_REQUEST = 50;
const MAX_BODY_BYTES = 64 * 1024;

type ClientEvent = Record<string, unknown>;

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function coerceEvents(parsed: unknown): ClientEvent[] {
  if (Array.isArray(parsed)) {
    return parsed.filter((e): e is ClientEvent => typeof e === 'object' && e !== null);
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return [parsed as ClientEvent];
  }
  return [];
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

type MilestoneResolution = {
  name: MilestoneEventName;
  props: Record<string, string | number | boolean | undefined>;
};

/**
 * Recognize a small allowlist of client beacons and translate them into a
 * durable startup-funnel milestone. Returns null for every other event —
 * those remain console-only, exactly as before this endpoint persisted
 * anything. `interviewId` is required for every milestone: it is both the
 * attribution key and the dedupe key (migration 052).
 */
function resolveMilestoneEvent(evt: ClientEvent): MilestoneResolution | null {
  const interviewId = asString(evt.interviewId);
  if (!interviewId) return null;
  const event = asString(evt.event);

  switch (event) {
    case 'interview_session_opened':
      return {
        name: 'interview_session_opened',
        props: {
          interview_id: interviewId,
          run_id: asString(evt.runId),
          user_id: asString(evt.userId),
        },
      };
    case 'avatar_audio_started':
      // First confirmed TTS playback. This fires on every question; the
      // partial unique index on (event_name, interview_id) keeps only the
      // first one — no "is this question 0" check needed here.
      return {
        name: 'interview_first_question_played',
        props: { interview_id: interviewId },
      };
    case 'mic_permission_denied':
      return {
        name: 'interview_mic_blocked',
        props: { interview_id: interviewId, reason: asString(evt.reason) ?? 'unknown' },
      };
    case 'submit_blocked':
      // Only the empty-payload variant is a genuine user-facing block; the
      // wrong_phase/in_flight variants are internal race guards, not a
      // candidate-visible failure, and are not beaconed as critical today.
      if (evt.reason !== 'empty_payload') return null;
      return {
        name: 'interview_first_answer_blocked',
        props: { interview_id: interviewId, reason: 'empty_payload' },
      };
    case 'submit_failed':
      return {
        name: 'interview_first_answer_blocked',
        props: {
          interview_id: interviewId,
          reason: 'evaluation_failed',
          http_status: typeof evt.httpStatus === 'number' ? evt.httpStatus : undefined,
        },
      };
    default:
      return null;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return NO_CONTENT;

    // Best-effort per-IP rate limit. Fail open on limiter errors.
    try {
      const rl = await checkRateLimit(`product-events:${clientIp(request)}`, RATE_WINDOW_SECONDS, RATE_MAX_EVENTS);
      if (!rl.allowed) return NO_CONTENT;
    } catch {
      /* limiter unavailable — accept the event rather than drop telemetry */
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NO_CONTENT;
    }

    const events = coerceEvents(parsed).slice(0, MAX_EVENTS_PER_REQUEST);
    for (const evt of events) {
      // One JSON line per event. `serverTs` is the receive time so client clock
      // skew can be detected by diffing against the client `ts`.
      console.info(
        '[client-telemetry]',
        JSON.stringify({ serverTs: new Date().toISOString(), ...evt }),
      );

      const milestone = resolveMilestoneEvent(evt);
      if (milestone) persistMilestoneEventOnce(milestone.name, milestone.props);
    }

    return NO_CONTENT;
  } catch {
    // Never throw — a telemetry sink that 500s would log noise and retry storms.
    return NO_CONTENT;
  }
}

// Some browsers send a CORS preflight for keepalive JSON fetches. Answer it.
export function OPTIONS(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
