/**
 * GET /api/admin/free-tools
 *
 * Aggregate analytics for the three free marketing tools (ATS checker,
 * Question Generator, STAR builder): traffic, signed-in split, rate-limit
 * blocks, cache-hit rate, and LLM cost (USD + derived INR).
 * Cached in-process for 120 seconds.
 *
 * Secured: platform admin only.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getCached, setCached } from '@/lib/admin/cache';
import {
  computeFreeToolMetrics,
  type FreeToolMetricsResult,
} from '@/lib/admin/free-tool-metrics';

const CACHE_KEY = 'admin:free-tools';
const CACHE_TTL = 120_000; // 2 minutes

export type { FreeToolMetricsResult };

export async function GET(request: Request) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;
  void admin;

  const fresh = new URL(request.url).searchParams.get('fresh') === '1';
  if (!fresh) {
    const cached = getCached<FreeToolMetricsResult>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const svc = createServiceClient();
    const metrics = await computeFreeToolMetrics(svc);
    setCached(CACHE_KEY, metrics, CACHE_TTL);
    return NextResponse.json(metrics);
  } catch (err) {
    console.error('[admin/free-tools] Error:', err);
    return NextResponse.json({ error: 'Failed to load free-tool metrics' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
