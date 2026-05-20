/**
 * Nightly cost rollup cron — aggregates per-user AI spending into daily summaries.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/daily-rollup", "schedule": "5 0 * * *" }
 *   Runs at 00:05 UTC daily, summarising the previous calendar day.
 *
 * Calls the `compute_daily_user_rollup(target_date)` PL/pgSQL function defined in
 * supabase/migrations/023_ai_telemetry.sql — all aggregation logic lives in DB.
 *
 * Authentication: same CRON_SECRET bearer token as health-snapshot.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Allow override via query param for manual backfills: ?date=YYYY-MM-DD
  const dateParam = request.nextUrl.searchParams.get('date');
  const targetDate = dateParam ?? yesterdayUTC();

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 },
    );
  }

  try {
    const svc = createServiceClient();

    // compute_daily_user_rollup is a PL/pgSQL function defined in the 023 migration.
    // It upserts into user_ai_usage_rollups for the given date.
    const { data, error } = await svc.rpc('compute_daily_user_rollup', {
      target_date: targetDate,
    });

    if (error) {
      console.error('[cron/daily-rollup] RPC error:', error.message);
      return NextResponse.json(
        { error: 'Rollup failed', detail: error.message },
        { status: 500 },
      );
    }

    console.log(JSON.stringify({
      event:       'daily_rollup_complete',
      target_date: targetDate,
      result:      data,
      ts:          new Date().toISOString(),
    }));

    return NextResponse.json({
      ok:          true,
      target_date: targetDate,
      result:      data,
      ts:          new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron/daily-rollup] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
