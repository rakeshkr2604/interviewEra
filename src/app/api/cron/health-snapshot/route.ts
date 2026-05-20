/**
 * Hourly provider health snapshot cron.
 *
 * Vercel cron config (vercel.json):
 *   { "path": "/api/cron/health-snapshot", "schedule": "0 * * * *" }
 *
 * Reads live intelligence state from provider-intelligence.ts and writes a
 * point-in-time snapshot to provider_health_logs for historical trending.
 *
 * Authentication: Vercel Cron sets Authorization: Bearer $CRON_SECRET.
 * Set CRON_SECRET env var (min 32 chars) — generate with: openssl rand -hex 32
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getProviderStats,
  getIntelligenceSummary,
  type ProviderKey,
} from '@/lib/ai/provider-intelligence';
import { logProviderHealthSnapshot } from '@/lib/telemetry/ai-logger';

// Circuit open = isModelHealthy returns false. Check each provider's canonical model.
async function getCircuitStates(): Promise<Record<string, boolean>> {
  try {
    const { isModelHealthy } = await import('@/lib/ai/provider-health');
    return {
      openrouter: !isModelHealthy('openrouter:gpt-4o-mini'),
      openai:     !isModelHealthy('openai:gpt-4o-mini'),
      mistral:    !isModelHealthy('mistral:mistral-small-latest'),
    };
  } catch {
    return {};
  }
}

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // not configured → deny all
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary  = getIntelligenceSummary();
  const circuits = await getCircuitStates();
  const providers: ProviderKey[] = ['openrouter', 'openai', 'mistral'];

  const MODEL_NAMES: Record<ProviderKey, string> = {
    openrouter: 'gpt-4o-mini',
    openai:     'gpt-4o-mini',
    mistral:    'mistral-small-latest',
  };

  const snapshots = await Promise.allSettled(
    providers.map(async (provider) => {
      const stats = getProviderStats(provider);

      // Skip providers with no data since last restart — nothing meaningful to record
      if (stats.sampleCount === 0) return { provider, skipped: true };

      await logProviderHealthSnapshot(provider, MODEL_NAMES[provider], {
        success_rate:       stats.successRate,
        p95_latency_ms:     stats.p95LatencyMs,
        avg_latency_ms:     stats.avgLatencyMs,
        json_validity_rate: stats.jsonValidityRate,
        timeout_rate:       stats.timeoutRate,
        quota_rate:         stats.quotaExhaustionRate,
        sample_count:       stats.sampleCount,
        circuit_open:       circuits[provider] ?? false,
        total_cost_usd:     stats.totalEstimatedCostUsd,
      });

      return { provider, skipped: false, sample_count: stats.sampleCount };
    }),
  );

  const results = snapshots.map((r) =>
    r.status === 'fulfilled' ? r.value : { error: String(r.reason) },
  );

  return NextResponse.json({
    ok:              true,
    routing_basis:   summary.routingBasis,
    total_cost_usd:  summary.totalEstimatedCostUsd,
    snapshots:       results,
    ts:              new Date().toISOString(),
  });
}

export const runtime = 'nodejs';
