/**
 * GET /api/admin/funnel — founder funnel conversion metrics.
 * Optional: &from=YYYY-MM-DD&to=YYYY-MM-DD (custom range overrides ?range=)
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { computeFunnelMetrics } from '@/lib/admin/funnel-metrics';
import { getCached, setCached } from '@/lib/admin/cache';
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

  if (!fresh) {
    const cached = getCached<Awaited<ReturnType<typeof computeFunnelMetrics>>>(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const svc = createServiceClient();
    const metrics = await computeFunnelMetrics(svc, rangeDays, {
      sinceIso: bounds.fromIso ?? undefined,
    });
    setCached(cacheKey, metrics, CACHE_TTL);
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[admin/funnel] Error:', err);
    return NextResponse.json({ error: 'Failed to load funnel metrics' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
