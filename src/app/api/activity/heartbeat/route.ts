/**
 * POST /api/activity/heartbeat
 *
 * Called every 2 minutes by authenticated dashboard users (via useHeartbeat).
 * Upserts a single row in user_activity to record the user's last-seen timestamp.
 *
 * Write optimisation: skips the DB upsert when the existing row is < 90 seconds
 * old — prevents write amplification from multiple open tabs.
 *
 * Presence thresholds (queries in /api/admin/stats and /api/admin/live-users):
 *   Currently online : last_seen_at >= NOW() - 5 min
 *   Active (5 min)   : last_seen_at >= NOW() - 5 min
 *   Active (1 hr)    : last_seen_at >= NOW() - 1 hour
 *   Active (24 hrs)  : last_seen_at >= NOW() - 24 hours
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { SupabaseTimeoutError, withSupabaseTimeout } from '@/lib/supabase/with-timeout';

const BodySchema = z.object({
  current_page: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  // Called every 2 minutes from every open tab — an unbounded auth check here
  // was 3 of the 36 "Task timed out after 300s" events in the 2026-10-31
  // incident (see src/lib/supabase/with-timeout.ts).
  const supabase = await createClient();
  let authResult;
  try {
    authResult = await withSupabaseTimeout('heartbeat.auth.getUser', () => supabase.auth.getUser());
  } catch (err) {
    if (err instanceof SupabaseTimeoutError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw err;
  }
  const { data: { user }, error: authError } = authResult;
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Rate limit: 1 write per 2 minutes per user ────────────────────────────
  const rl = await checkRateLimit(`hb:${user.id}`, 120, 1);
  if (!rl.allowed) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let currentPage: string | undefined;
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (parsed.success) currentPage = parsed.data.current_page;
  } catch { /* body is optional */ }

  const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null;
  const now       = new Date();

  // ── Skip if last beat was recent (< 90s ago) ─────────────────────────────
  let svc: ReturnType<typeof createServiceClient>;
  try {
    svc = createServiceClient();
  } catch (err) {
    // Non-blocking: if the service client can't be initialised (e.g. env var
    // absent or key format unrecognised), heartbeat is best-effort telemetry.
    // Return ok so the UI doesn't surface a 500 toast to the user.
    console.warn('[heartbeat] createServiceClient failed (non-blocking):', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: true, skipped: true, reason: 'svc_unavailable' });
  }
  let existing: { last_seen_at: string } | null = null;
  try {
    const result = await withSupabaseTimeout('heartbeat.select_existing', () =>
      svc.from('user_activity').select('last_seen_at').eq('user_id', user.id).single(),
    );
    existing = result.data;
  } catch (err) {
    // Non-blocking: proceed to the upsert below as if there were no prior row
    // (same effect as a genuine first heartbeat) rather than hanging.
    console.warn('[heartbeat] select existing failed (non-blocking):', err instanceof Error ? err.message : String(err));
  }

  const SKIP_THRESHOLD_MS = 90_000;
  if (existing?.last_seen_at) {
    const age = now.getTime() - new Date(existing.last_seen_at).getTime();
    if (age < SKIP_THRESHOLD_MS) {
      return NextResponse.json({ ok: true, skipped: true });
    }
  }

  // ── Upsert ────────────────────────────────────────────────────────────────
  let upsertError: { message: string } | null = null;
  try {
    const result = await withSupabaseTimeout('heartbeat.upsert', () =>
      svc.from('user_activity').upsert(
        {
          user_id:      user.id,
          last_seen_at: now.toISOString(),
          current_page: currentPage ?? null,
          user_agent:   userAgent,
          updated_at:   now.toISOString(),
        },
        { onConflict: 'user_id' },
      ),
    );
    upsertError = result.error;
  } catch (err) {
    upsertError = { message: err instanceof Error ? err.message : String(err) };
  }

  if (upsertError) {
    // Non-blocking: heartbeat is best-effort telemetry. A missing RLS policy
    // or transient DB hiccup must NOT 500 to the UI (which would cascade into
    // user-visible toasts / Sentry noise). Log and return ok.
    console.warn('[heartbeat] Upsert failed (non-blocking):', upsertError.message);
    return NextResponse.json({ ok: true, skipped: true, reason: 'persistence_failed' });
  }

  return NextResponse.json({ ok: true });
}

export const runtime = 'nodejs';
