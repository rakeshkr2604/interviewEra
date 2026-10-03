/**
 * Daily prune of interview_diagnostic_events older than 90 days.
 *
 * Vercel cron (vercel.json):
 *   { "path": "/api/cron/prune-interview-diagnostics", "schedule": "50 2 * * *" }
 *
 * Bounded batches via RPC prune_interview_diagnostic_events — diagnostics table only.
 * Auth: Bearer CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 90;
const BATCH_SIZE = 500;
const MAX_BATCHES = 20;

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const svc = createServiceClient();
    let deletedTotal = 0;
    let batches = 0;

    for (let i = 0; i < MAX_BATCHES; i++) {
      const { data, error } = await svc.rpc('prune_interview_diagnostic_events', {
        p_retention_days: RETENTION_DAYS,
        p_batch_size: BATCH_SIZE,
      });

      if (error) {
        console.error('[cron:prune-interview-diagnostics] RPC error:', error.message);
        return NextResponse.json(
          {
            error: 'Prune failed',
            detail: error.message,
            deleted: deletedTotal,
            batches,
          },
          { status: 500 },
        );
      }

      const n = typeof data === 'number' ? data : Number(data ?? 0);
      batches += 1;
      if (!Number.isFinite(n) || n <= 0) break;
      deletedTotal += n;
      if (n < BATCH_SIZE) break;
    }

    console.info(
      JSON.stringify({
        event: 'prune_interview_diagnostics_complete',
        retention_days: RETENTION_DAYS,
        deleted: deletedTotal,
        batches,
        ts: new Date().toISOString(),
      }),
    );

    return NextResponse.json({
      ok: true,
      retention_days: RETENTION_DAYS,
      deleted: deletedTotal,
      batches,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cron:prune-interview-diagnostics] unexpected:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
