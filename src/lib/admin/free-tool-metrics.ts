/**
 * Free-tool analytics for the admin "Free Tools" dashboard.
 *
 * Reads `tool_usage_events` (traffic / cache hits / rate-limit blocks /
 * signed-in split) and `ai_call_logs` (LLM cost — source of truth for spend,
 * filtered to free-tool operations). USD is the stored currency; INR is
 * derived via USD_TO_INR from cost-engine.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { USD_TO_INR } from '@/lib/cost/cost-engine';
import { istDayStartUtcIso } from '@/lib/datetime/ist';

export type FreeToolKey = 'ats' | 'question_generator' | 'star';
export type WindowKey = 'today' | 'd7' | 'd30' | 'all';

export const FREE_TOOL_KEYS: readonly FreeToolKey[] = ['ats', 'question_generator', 'star'];
export const WINDOW_KEYS: readonly WindowKey[] = ['today', 'd7', 'd30', 'all'];

/** Tools with a Redis result cache — cache-hit rate is meaningless for the rest. */
const CACHED_TOOLS: ReadonlySet<FreeToolKey> = new Set(['ats', 'question_generator']);

/** ai_call_logs.operation values attributed to each free tool. */
const TOOL_COST_OPERATIONS: Record<FreeToolKey, readonly string[]> = {
  ats: ['ats_field_extraction', 'ats_jd_extraction', 'ats_embedding'],
  question_generator: ['qg_set_generation', 'qg_answer_generation'],
  star: ['star_builder'],
};

const QG_SET_MODES = ['role', 'jd', 'topic', 'company'] as const;

export interface ToolWindowStats {
  runs: number;
  cache_hits: number;
  rate_limited: number;
  errors: number;
  /** Signed-in vs anonymous split over successful usage (runs + cache hits). */
  signed_in: number;
  anonymous: number;
  /** cache_hits / (cache_hits + runs); null for tools without a cache layer. */
  cache_hit_rate_pct: number | null;
  cost_usd: number;
  cost_inr: number;
}

export interface FreeToolMetricsResult {
  tools: Record<FreeToolKey, Record<WindowKey, ToolWindowStats>>;
  /** QG set-generation runs by mode (answer reveals excluded). */
  qg_mode_breakdown: Record<WindowKey, Record<string, number>>;
  usd_to_inr: number;
  generated_at: string;
}

export interface UsageEventRow {
  tool: string;
  mode: string | null;
  event: string;
  signed_in: boolean;
  created_at: string;
}

export interface CostLogRow {
  operation: string;
  cost_usd: number | null;
  created_at: string;
}

/** All-time counts that can't be derived from the 30-day row fetch. */
export interface AllTimeCounts {
  /** [tool][event] → count */
  events: Record<FreeToolKey, Record<string, number>>;
  /** [tool] → signed-in count over runs + cache hits */
  signedIn: Record<FreeToolKey, number>;
  /** [mode] → all-time QG run count */
  qgModes: Record<string, number>;
}

interface WindowBoundaries {
  todayStartMs: number;
  d7StartMs: number;
  d30StartMs: number;
}

function emptyStats(tool: FreeToolKey): ToolWindowStats {
  return {
    runs: 0,
    cache_hits: 0,
    rate_limited: 0,
    errors: 0,
    signed_in: 0,
    anonymous: 0,
    cache_hit_rate_pct: CACHED_TOOLS.has(tool) ? 0 : null,
    cost_usd: 0,
    cost_inr: 0,
  };
}

function isFreeToolKey(value: string): value is FreeToolKey {
  return (FREE_TOOL_KEYS as readonly string[]).includes(value);
}

function windowsFor(createdAtMs: number, b: WindowBoundaries): WindowKey[] {
  const windows: WindowKey[] = ['all'];
  if (createdAtMs >= b.d30StartMs) windows.push('d30');
  if (createdAtMs >= b.d7StartMs) windows.push('d7');
  if (createdAtMs >= b.todayStartMs) windows.push('today');
  return windows;
}

function roundUsd(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function roundInr(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Pure aggregation — exported for unit tests.
 * `events30d` and `costRows` may contain rows older than 30d; they're bucketed
 * by timestamp, so extra rows only affect the windows they belong to.
 */
export function aggregateFreeToolMetrics(input: {
  events30d: UsageEventRow[];
  costRows: CostLogRow[];
  allTime: AllTimeCounts;
  boundaries: WindowBoundaries;
}): Omit<FreeToolMetricsResult, 'usd_to_inr' | 'generated_at'> {
  const { events30d, costRows, allTime, boundaries } = input;

  const tools = {} as Record<FreeToolKey, Record<WindowKey, ToolWindowStats>>;
  for (const tool of FREE_TOOL_KEYS) {
    tools[tool] = {
      today: emptyStats(tool),
      d7: emptyStats(tool),
      d30: emptyStats(tool),
      all: emptyStats(tool),
    };
  }

  const qgModeBreakdown: Record<WindowKey, Record<string, number>> = {
    today: {},
    d7: {},
    d30: {},
    all: { ...allTime.qgModes },
  };

  // Rolling windows (today / 7d / 30d) from the row fetch.
  for (const row of events30d) {
    if (!isFreeToolKey(row.tool)) continue;
    const createdMs = Date.parse(row.created_at);
    if (!Number.isFinite(createdMs)) continue;

    for (const window of windowsFor(createdMs, boundaries)) {
      if (window === 'all') continue; // all-time comes from count queries
      const stats = tools[row.tool][window];
      if (row.event === 'run') stats.runs += 1;
      else if (row.event === 'cache_hit') stats.cache_hits += 1;
      else if (row.event === 'rate_limited') stats.rate_limited += 1;
      else if (row.event === 'error') stats.errors += 1;

      if (row.event === 'run' || row.event === 'cache_hit') {
        if (row.signed_in) stats.signed_in += 1;
        else stats.anonymous += 1;
      }

      if (
        row.tool === 'question_generator' &&
        row.event === 'run' &&
        row.mode &&
        (QG_SET_MODES as readonly string[]).includes(row.mode)
      ) {
        qgModeBreakdown[window][row.mode] = (qgModeBreakdown[window][row.mode] ?? 0) + 1;
      }
    }
  }

  // All-time from count queries.
  for (const tool of FREE_TOOL_KEYS) {
    const stats = tools[tool].all;
    const counts = allTime.events[tool] ?? {};
    stats.runs = counts.run ?? 0;
    stats.cache_hits = counts.cache_hit ?? 0;
    stats.rate_limited = counts.rate_limited ?? 0;
    stats.errors = counts.error ?? 0;
    stats.signed_in = allTime.signedIn[tool] ?? 0;
    stats.anonymous = Math.max(0, stats.runs + stats.cache_hits - stats.signed_in);
  }

  // Cache-hit rate.
  for (const tool of FREE_TOOL_KEYS) {
    for (const window of WINDOW_KEYS) {
      const stats = tools[tool][window];
      if (!CACHED_TOOLS.has(tool)) {
        stats.cache_hit_rate_pct = null;
        continue;
      }
      const denominator = stats.runs + stats.cache_hits;
      stats.cache_hit_rate_pct =
        denominator > 0 ? Math.round((stats.cache_hits / denominator) * 1000) / 10 : 0;
    }
  }

  // LLM cost (ai_call_logs is the source of truth).
  const operationToTool = new Map<string, FreeToolKey>();
  for (const tool of FREE_TOOL_KEYS) {
    for (const op of TOOL_COST_OPERATIONS[tool]) operationToTool.set(op, tool);
  }
  for (const row of costRows) {
    const tool = operationToTool.get(row.operation);
    if (!tool || row.cost_usd == null) continue;
    const createdMs = Date.parse(row.created_at);
    if (!Number.isFinite(createdMs)) continue;
    for (const window of windowsFor(createdMs, boundaries)) {
      tools[tool][window].cost_usd += row.cost_usd;
    }
  }
  for (const tool of FREE_TOOL_KEYS) {
    for (const window of WINDOW_KEYS) {
      const stats = tools[tool][window];
      stats.cost_usd = roundUsd(stats.cost_usd);
      stats.cost_inr = roundInr(stats.cost_usd * USD_TO_INR);
    }
  }

  return { tools, qg_mode_breakdown: qgModeBreakdown };
}

/** PostgREST caps selects at 1000 rows — page through with .range(). */
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

async function fetchUsageEventsSince(
  svc: SupabaseClient,
  sinceIso: string,
): Promise<UsageEventRow[]> {
  const rows: UsageEventRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await svc
      .from('tool_usage_events')
      .select('tool, mode, event, signed_in, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(`tool_usage_events fetch failed: ${error.message}`);
    const batch = (data ?? []) as UsageEventRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  console.warn('[free-tool-metrics] usage events truncated at', rows.length, 'rows');
  return rows;
}

async function fetchFreeToolCostRows(svc: SupabaseClient): Promise<CostLogRow[]> {
  const allOperations = FREE_TOOL_KEYS.flatMap((tool) => [...TOOL_COST_OPERATIONS[tool]]);
  const rows: CostLogRow[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await svc
      .from('ai_call_logs')
      .select('operation, cost_usd, created_at')
      .in('operation', allOperations)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(`ai_call_logs fetch failed: ${error.message}`);
    const batch = (data ?? []) as CostLogRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  console.warn('[free-tool-metrics] cost rows truncated at', rows.length, 'rows');
  return rows;
}

async function fetchAllTimeCounts(svc: SupabaseClient): Promise<AllTimeCounts> {
  const events = {} as AllTimeCounts['events'];
  const signedIn = {} as AllTimeCounts['signedIn'];
  const qgModes: Record<string, number> = {};

  const eventNames = ['run', 'cache_hit', 'rate_limited', 'error'] as const;

  const countQueries: Array<PromiseLike<void>> = [];

  for (const tool of FREE_TOOL_KEYS) {
    events[tool] = {};
    for (const eventName of eventNames) {
      countQueries.push(
        svc
          .from('tool_usage_events')
          .select('id', { count: 'exact', head: true })
          .eq('tool', tool)
          .eq('event', eventName)
          .then(({ count }) => {
            events[tool][eventName] = count ?? 0;
          }),
      );
    }
    countQueries.push(
      svc
        .from('tool_usage_events')
        .select('id', { count: 'exact', head: true })
        .eq('tool', tool)
        .in('event', ['run', 'cache_hit'])
        .eq('signed_in', true)
        .then(({ count }) => {
          signedIn[tool] = count ?? 0;
        }),
    );
  }

  for (const mode of QG_SET_MODES) {
    countQueries.push(
      svc
        .from('tool_usage_events')
        .select('id', { count: 'exact', head: true })
        .eq('tool', 'question_generator')
        .eq('event', 'run')
        .eq('mode', mode)
        .then(({ count }) => {
          qgModes[mode] = count ?? 0;
        }),
    );
  }

  await Promise.all(countQueries);
  return { events, signedIn, qgModes };
}

export async function computeFreeToolMetrics(
  svc: SupabaseClient,
): Promise<FreeToolMetricsResult> {
  const now = Date.now();
  const boundaries: WindowBoundaries = {
    todayStartMs: Date.parse(istDayStartUtcIso()),
    d7StartMs: now - 7 * 24 * 60 * 60 * 1000,
    d30StartMs: now - 30 * 24 * 60 * 60 * 1000,
  };
  const d30Iso = new Date(boundaries.d30StartMs).toISOString();

  const [events30d, costRows, allTime] = await Promise.all([
    fetchUsageEventsSince(svc, d30Iso),
    fetchFreeToolCostRows(svc),
    fetchAllTimeCounts(svc),
  ]);

  const aggregated = aggregateFreeToolMetrics({ events30d, costRows, allTime, boundaries });

  return {
    ...aggregated,
    usd_to_inr: USD_TO_INR,
    generated_at: new Date().toISOString(),
  };
}
