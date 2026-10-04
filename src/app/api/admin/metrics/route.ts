/**
 * Admin analytics API — AI infrastructure metrics.
 *
 * Access: requirePlatformAdmin (ADMIN_EMAILS + builtin founders + platform_role=admin).
 * All queries read from the telemetry tables created in supabase/migrations/023_ai_telemetry.sql.
 *
 * GET /api/admin/metrics?section=overview|finance|providers|users|abuse
 *   Returns the requested section. Omit section to get all.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { getIntelligenceSummary } from '@/lib/ai/provider-intelligence';

type MetricsSection = 'overview' | 'finance' | 'providers' | 'users' | 'abuse';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function thisMonthUTC(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
  const { admin, error: adminError } = await requirePlatformAdmin();
  if (adminError || !admin) {
    return adminError ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const section = (request.nextUrl.searchParams.get('section') ?? 'all') as MetricsSection | 'all';
  const today   = todayUTC();
  const month   = thisMonthUTC();
  const svc     = createServiceClient();

  const result: Record<string, unknown> = {};

  // ── 3. Overview ────────────────────────────────────────────────────────────
  if (section === 'all' || section === 'overview') {
    const [callsToday, costToday, voiceCostToday, failuresToday] = await Promise.all([
      svc.from('ai_call_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`),

      svc.from('ai_call_logs')
        .select('cost_usd')
        .gte('created_at', `${today}T00:00:00Z`)
        .not('cost_usd', 'is', null),

      svc.from('voice_usage_logs')
        .select('cost_usd')
        .gte('created_at', `${today}T00:00:00Z`)
        .not('cost_usd', 'is', null),

      svc.from('ai_call_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00Z`)
        .eq('success', false),
    ]);

    const llmCostSum = (costToday.data ?? [])
      .reduce((s: number, r: { cost_usd: number | null }) => s + (r.cost_usd ?? 0), 0);
    const voiceCostSum = (voiceCostToday.data ?? [])
      .reduce((s: number, r: { cost_usd: number | null }) => s + (r.cost_usd ?? 0), 0);

    // Live in-process intelligence summary (resets on cold start — expected)
    const intelligence = getIntelligenceSummary();

    result.overview = {
      today,
      llm_calls_today:       callsToday.count ?? 0,
      llm_cost_today_usd:    +llmCostSum.toFixed(4),
      voice_cost_today_usd:  +voiceCostSum.toFixed(4),
      total_cost_today_usd:  +(llmCostSum + voiceCostSum).toFixed(4),
      failures_today:        failuresToday.count ?? 0,
      routing_basis:         intelligence.routingBasis,
      provider_sample_counts: intelligence.sampleCounts,
    };
  }

  // ── 4. Finance ─────────────────────────────────────────────────────────────
  if (section === 'all' || section === 'finance') {
    const [llmMonth, voiceMonth, rollups] = await Promise.all([
      svc.from('ai_call_logs')
        .select('provider, cost_usd')
        .gte('created_at', `${month}-01T00:00:00Z`)
        .not('cost_usd', 'is', null),

      svc.from('voice_usage_logs')
        .select('provider, cost_usd')
        .gte('created_at', `${month}-01T00:00:00Z`)
        .not('cost_usd', 'is', null),

      svc.from('user_ai_usage_rollups')
        .select('period_date, total_cost_usd, call_count, unique_users')
        .gte('period_date', `${month}-01`)
        .order('period_date', { ascending: false })
        .limit(31),
    ]);

    type RowWithCost = { provider: string; cost_usd: number | null };
    const byProvider: Record<string, number> = {};
    for (const row of [...(llmMonth.data ?? []), ...(voiceMonth.data ?? [])] as RowWithCost[]) {
      byProvider[row.provider] = (byProvider[row.provider] ?? 0) + (row.cost_usd ?? 0);
    }

    result.finance = {
      month,
      cost_by_provider_usd: Object.fromEntries(
        Object.entries(byProvider).map(([k, v]) => [k, +v.toFixed(4)]),
      ),
      total_month_usd: +Object.values(byProvider).reduce((s, v) => s + v, 0).toFixed(4),
      daily_rollups: rollups.data ?? [],
    };
  }

  // ── 5. Providers ───────────────────────────────────────────────────────────
  if (section === 'all' || section === 'providers') {
    const [health, failovers] = await Promise.all([
      svc.from('provider_health_logs')
        .select('provider, model, success_rate, p95_latency_ms, avg_latency_ms, timeout_rate, quota_rate, sample_count, circuit_open, total_cost_usd, created_at')
        .order('created_at', { ascending: false })
        .limit(30),

      svc.from('provider_failover_events')
        .select('from_provider, from_model, to_provider, to_model, reason, operation, created_at')
        .gte('created_at', `${todayUTC()}T00:00:00Z`)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    // Per-operation breakdown for today
    const opBreakdown = await svc.from('ai_call_logs')
      .select('operation, provider, success')
      .gte('created_at', `${today}T00:00:00Z`);

    const ops: Record<string, { total: number; success: number; by_provider: Record<string, number> }> = {};
    for (const row of (opBreakdown.data ?? []) as Array<{ operation: string; provider: string; success: boolean }>) {
      ops[row.operation] ??= { total: 0, success: 0, by_provider: {} };
      ops[row.operation].total++;
      if (row.success) ops[row.operation].success++;
      ops[row.operation].by_provider[row.provider] = (ops[row.operation].by_provider[row.provider] ?? 0) + 1;
    }

    result.providers = {
      health_snapshots: health.data ?? [],
      failovers_today:  failovers.data ?? [],
      operations_today: ops,
      live_intelligence: getIntelligenceSummary(),
    };
  }

  // ── 6. Users ───────────────────────────────────────────────────────────────
  if (section === 'all' || section === 'users') {
    // Top spenders this month from rollups
    const topUsers = await svc.from('user_ai_usage_rollups')
      .select('user_id, total_cost_usd, call_count, period_date')
      .gte('period_date', `${month}-01`)
      .order('total_cost_usd', { ascending: false })
      .limit(20);

    // Users with quota warnings (high voice usage)
    const highVoice = await svc.from('voice_usage_logs')
      .select('user_id, cost_usd')
      .gte('created_at', `${month}-01T00:00:00Z`)
      .not('user_id', 'is', null)
      .not('cost_usd', 'is', null);

    type VoiceRow = { user_id: string | null; cost_usd: number | null };
    const voiceByUser: Record<string, number> = {};
    for (const row of (highVoice.data ?? []) as VoiceRow[]) {
      if (row.user_id) {
        voiceByUser[row.user_id] = (voiceByUser[row.user_id] ?? 0) + (row.cost_usd ?? 0);
      }
    }

    const topVoiceUsers = Object.entries(voiceByUser)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([user_id, cost]) => ({ user_id, voice_cost_usd: +cost.toFixed(4) }));

    result.users = {
      top_spenders_month: topUsers.data ?? [],
      top_voice_users_month: topVoiceUsers,
    };
  }

  // ── 7. Abuse ───────────────────────────────────────────────────────────────
  if (section === 'all' || section === 'abuse') {
    const [blocks, recentEvents] = await Promise.all([
      svc.from('abuse_detection_logs')
        .select('user_id, ip, event_type, details, block_duration_s, created_at')
        .eq('action_taken', 'blocked')
        .gte('created_at', `${today}T00:00:00Z`)
        .order('created_at', { ascending: false })
        .limit(20),

      svc.from('abuse_detection_logs')
        .select('user_id, ip, event_type, details, action_taken, created_at')
        .gte('created_at', `${today}T00:00:00Z`)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    result.abuse = {
      blocks_today:  blocks.data ?? [],
      events_today:  recentEvents.data ?? [],
    };
  }

  return NextResponse.json({ ...result, generated_at: new Date().toISOString() });
}

export const runtime = 'nodejs';
