/**
 * GET /api/admin/growth — retention, revenue, referrals, feedback aggregates.
 * Optional: &from=YYYY-MM-DD&to=YYYY-MM-DD (custom range overrides ?range=)
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { computeGrowthMetrics } from '@/lib/admin/growth-metrics';
import { getOrComputeCached } from '@/lib/admin/cache';
import { parseAdminDateBounds, resolveGrowthPreset } from '@/lib/admin/date-range';

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
  const cacheKey = `admin:growth:${bounds.preset}:${bounds.fromIso}:${bounds.toIso}`;

  try {
    const { data: metrics } = await getOrComputeCached(
      cacheKey,
      CACHE_TTL,
      async () => {
        const svc = createServiceClient();
        return computeGrowthMetrics(svc, rangeDays, {
          sinceIso: bounds.fromIso ?? undefined,
          untilIso: bounds.toIso ?? undefined,
        });
      },
      { fresh },
    );
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[admin/growth] Error:', err);
    return NextResponse.json({ error: 'Failed to load growth metrics' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
