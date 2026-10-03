/**
 * POST /api/interview/diagnostics
 *
 * Authenticated, ownership-scoped ingest for interview diagnostic events.
 * Best-effort: returns 204 on success/rate-limit/soft failures so the
 * interview client never surfaces telemetry errors.
 *
 * Rate-limit policy (diagnostics-specific bounded writes):
 * - Redis unconfigured / placeholder → drop (204), no DB write
 * - Redis unavailable / timeout → drop (204) via failClosed
 * - Capacity charged per event (`cost = events.length`)
 * - Duplicate client_event_id rows still consume capacity (insert after RL)
 * - Malformed bodies rejected before auth/DB (400) or oversized → 204 drop
 *
 * Global checkRateLimit defaults for other routes are unchanged.
 */

import { NextResponse } from 'next/server';
import { checkDiagnosticIngestRateLimit } from '@/lib/diagnostics/rate-limit-gate';
import { persistDiagnosticEvents } from '@/lib/diagnostics/persist';
import { validateDiagnosticIngestBody } from '@/lib/diagnostics/validate';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_CONTENT = new NextResponse(null, { status: 204 });
const MAX_BODY_BYTES = 32 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return NO_CONTENT;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const validated = validateDiagnosticIngestBody(parsed);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkDiagnosticIngestRateLimit({
      userId: user.id,
      interviewId: validated.interviewId,
      eventCost: validated.events.length,
    });
    if (!rl.allowed) {
      if (rl.reason === 'redis_unconfigured' || rl.reason === 'redis_unavailable') {
        console.warn('[diagnostics:ingest] rate-limit backend unavailable; dropping', {
          reason: rl.reason,
        });
      }
      return NO_CONTENT;
    }

    const service = createServiceClient();
    const { data: interview, error: ivError } = await service
      .from('interviews')
      .select('id, user_id, engine')
      .eq('id', validated.interviewId)
      .maybeSingle();

    if (ivError) {
      console.warn('[diagnostics:ingest] interview lookup failed', { code: ivError.code });
      return NO_CONTENT;
    }

    // Identical 404 for missing vs non-owned — no enumeration.
    if (!interview || interview.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const engine =
      typeof interview.engine === 'string' && interview.engine
        ? interview.engine
        : 'v2.1';

    const events = validated.events.map((e) => ({
      ...e,
      engine: e.engine ?? engine,
    }));

    await persistDiagnosticEvents(service, user.id, events);
    return NO_CONTENT;
  } catch (err) {
    console.warn('[diagnostics:ingest] unexpected', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return NO_CONTENT;
  }
}
