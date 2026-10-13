/**
 * GET /api/admin/funnel — founder funnel conversion metrics.
 * Optional: &from=YYYY-MM-DD&to=YYYY-MM-DD (custom range overrides ?range=)
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { computeFunnelMetrics } from '@/lib/admin/funnel-metrics';
import { getOrComputeCached } from '@/lib/admin/cache';
import { parseAdminDateBounds, resolveGrowthPreset } from '@/lib/admin/date-range';

const CACHE_KEY = 'admin:funnel';
const CACHE_TTL = 120_000;

export async function GET(request: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const bounds = parseAdminDateBounds(url.searchParams, {
    defaultPreset: '30',
    resolvePreset: resolveGrowthPreset,
  });
  const rangeDays = bounds.rangeDays ?? 30;
  const fresh = url.searchParams.get('fresh') === '1';
  const cacheKey = `${CACHE_KEY}:${bounds.preset}:${bounds.fromIso}:${bounds.toIso}`;

  try {
    const { data: metrics } = await getOrComputeCached(
      cacheKey,
      CACHE_TTL,
      async () => {
        const svc = createServiceClient();
        return computeFunnelMetrics(svc, rangeDays, {
          sinceIso: bounds.fromIso ?? undefined,
        });
      },
      { fresh },
    );
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[admin/funnel] Error:', err);
    return NextResponse.json({ error: 'Failed to load funnel metrics' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
