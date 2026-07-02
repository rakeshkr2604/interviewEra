/**
 * GET /api/admin/growth — retention, revenue, referrals, feedback aggregates.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { computeGrowthMetrics } from '@/lib/admin/growth-metrics';
import { getCached, setCached } from '@/lib/admin/cache';

const CACHE_TTL = 120_000;

export async function GET(request: Request) {
  const { error } = await requirePlatformAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const rangeDays = Math.min(90, Math.max(1, parseInt(url.searchParams.get('range') ?? '30', 10) || 30));
  const fresh = url.searchParams.get('fresh') === '1';
  const cacheKey = `admin:growth:${rangeDays}`;

  if (!fresh) {
    const cached = getCached<Awaited<ReturnType<typeof computeGrowthMetrics>>>(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const svc = createServiceClient();
    const metrics = await computeGrowthMetrics(svc, rangeDays);
    setCached(cacheKey, metrics, CACHE_TTL);
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[admin/growth] Error:', err);
    return NextResponse.json({ error: 'Failed to load growth metrics' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
