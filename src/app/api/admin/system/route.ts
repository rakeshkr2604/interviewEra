/**
 * GET /api/admin/system
 *
 * Real service health check: pings DB, Redis, and reads in-process
 * provider intelligence.
 * Cached in-process for 60 seconds — avoids pinging ElevenLabs on every load.
 *
 * Secured: platform admin (ADMIN_EMAILS) only.
 */

import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getIntelligenceSummary } from '@/lib/ai/provider-intelligence';
import getRedis from '@/lib/redis/client';
import { getCached, setCached } from '@/lib/admin/cache';
import { checkElevenLabsHealth } from '@/lib/voice/elevenlabs-health';

const CACHE_KEY = 'admin:system';
const CACHE_TTL = 60_000; // 60 seconds

type ServiceStatus = 'healthy' | 'degraded' | 'offline';

async function checkDatabase(): Promise<{ status: ServiceStatus; latency_ms: number }> {
  const t0 = Date.now();
  try {
    const svc = createServiceClient();
    const { error } = await svc.from('users').select('id', { count: 'exact', head: true });
    return { status: error ? 'degraded' : 'healthy', latency_ms: Date.now() - t0 };
  } catch {
    return { status: 'offline', latency_ms: Date.now() - t0 };
  }
}

async function checkRedis(): Promise<{ status: ServiceStatus; latency_ms: number }> {
  const t0 = Date.now();
  try {
    const redis = getRedis();
    await redis.ping();
    return { status: 'healthy', latency_ms: Date.now() - t0 };
  } catch {
    return { status: 'degraded', latency_ms: Date.now() - t0 };
  }
}

async function checkElevenLabs() {
  return checkElevenLabsHealth();
}

export async function GET(request: Request) {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;
  void admin;

  const fresh = new URL(request.url).searchParams.get('fresh') === '1';
  if (!fresh) {
    const cached = getCached<object>(CACHE_KEY);
    if (cached) return NextResponse.json(cached);
  }

  const [db, redis, elevenlabs] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkElevenLabs(),
  ]);

  const intelligence = getIntelligenceSummary();
  const openaiReliability      = intelligence.scores.openai?.reliability     ?? 65;
  const openrouterReliability  = intelligence.scores.openrouter?.reliability ?? 65;
  const aiHealthy = openaiReliability > 50 || openrouterReliability > 50;

  const overall: ServiceStatus =
    db.status === 'offline'  ? 'offline'  :
    db.status === 'degraded' ? 'degraded' :
    !aiHealthy               ? 'degraded' :
    'healthy';

  const result = {
    overall,
    services: {
      database: {
        status:     db.status,
        latency_ms: db.latency_ms,
      },
      redis: {
        status:     redis.status,
        latency_ms: redis.latency_ms,
      },
      ai_providers: {
        status:         aiHealthy ? 'healthy' : 'degraded',
        routing_basis:  intelligence.routingBasis,
        total_cost_usd: +intelligence.totalEstimatedCostUsd.toFixed(4),
        sample_counts:  intelligence.sampleCounts,
        scores: {
          openai:     intelligence.scores.openai     ? { reliability: intelligence.scores.openai.reliability }     : null,
          openrouter: intelligence.scores.openrouter ? { reliability: intelligence.scores.openrouter.reliability } : null,
          mistral:    intelligence.scores.mistral    ? { reliability: intelligence.scores.mistral.reliability }    : null,
        },
      },
      elevenlabs: {
        status:     elevenlabs.status,
        latency_ms: elevenlabs.latency_ms,
        reason:     elevenlabs.reason,
        quota_remaining_pct: elevenlabs.quota_remaining_pct,
      },
    },
    checked_at: new Date().toISOString(),
  };

  setCached(CACHE_KEY, result, CACHE_TTL);
  return NextResponse.json(result);
}

export const runtime = 'nodejs';
