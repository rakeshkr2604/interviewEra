import { describe, expect, it } from 'vitest';
import {
  aggregateFreeToolMetrics,
  type AllTimeCounts,
  type CostLogRow,
  type UsageEventRow,
} from './free-tool-metrics';
import { USD_TO_INR } from '@/lib/cost/cost-engine';

const NOW = Date.parse('2026-07-20T12:00:00Z');

const boundaries = {
  todayStartMs: Date.parse('2026-07-19T18:30:00Z'), // 00:00 IST on 2026-07-20
  d7StartMs: NOW - 7 * 24 * 60 * 60 * 1000,
  d30StartMs: NOW - 30 * 24 * 60 * 60 * 1000,
};

const emptyAllTime: AllTimeCounts = {
  events: {
    ats: {},
    question_generator: {},
    star: {},
  },
  signedIn: { ats: 0, question_generator: 0, star: 0 },
  qgModes: {},
};

function event(overrides: Partial<UsageEventRow>): UsageEventRow {
  return {
    tool: 'question_generator',
    mode: 'role',
    event: 'run',
    signed_in: false,
    created_at: '2026-07-20T10:00:00Z', // inside "today"
    ...overrides,
  };
}

describe('aggregateFreeToolMetrics', () => {
  it('buckets events into rolling windows', () => {
    const rows: UsageEventRow[] = [
      event({}), // today
      event({ created_at: '2026-07-16T10:00:00Z' }), // 7d, not today
      event({ created_at: '2026-06-25T10:00:00Z' }), // 30d only
    ];
    const { tools } = aggregateFreeToolMetrics({
      events30d: rows,
      costRows: [],
      allTime: emptyAllTime,
      boundaries,
    });
    expect(tools.question_generator.today.runs).toBe(1);
    expect(tools.question_generator.d7.runs).toBe(2);
    expect(tools.question_generator.d30.runs).toBe(3);
  });

  it('splits signed-in vs anonymous over runs + cache hits only', () => {
    const rows: UsageEventRow[] = [
      event({ signed_in: true }),
      event({ event: 'cache_hit', signed_in: false }),
      event({ event: 'rate_limited', signed_in: true }), // excluded from the split
    ];
    const { tools } = aggregateFreeToolMetrics({
      events30d: rows,
      costRows: [],
      allTime: emptyAllTime,
      boundaries,
    });
    const today = tools.question_generator.today;
    expect(today.signed_in).toBe(1);
    expect(today.anonymous).toBe(1);
    expect(today.rate_limited).toBe(1);
  });

  it('computes cache-hit rate for cached tools and null for STAR', () => {
    const rows: UsageEventRow[] = [
      event({ tool: 'ats', mode: null }),
      event({ tool: 'ats', mode: null, event: 'cache_hit' }),
      event({ tool: 'star', mode: null }),
    ];
    const { tools } = aggregateFreeToolMetrics({
      events30d: rows,
      costRows: [],
      allTime: emptyAllTime,
      boundaries,
    });
    expect(tools.ats.today.cache_hit_rate_pct).toBe(50);
    expect(tools.star.today.cache_hit_rate_pct).toBeNull();
    expect(tools.star.all.cache_hit_rate_pct).toBeNull();
  });

  it('attributes ai_call_logs cost rows to the owning tool and derives INR', () => {
    const costRows: CostLogRow[] = [
      { operation: 'qg_set_generation', cost_usd: 0.01, created_at: '2026-07-20T10:00:00Z' },
      { operation: 'ats_field_extraction', cost_usd: 0.02, created_at: '2026-07-20T10:00:00Z' },
      { operation: 'ats_embedding', cost_usd: 0.005, created_at: '2026-07-20T10:00:00Z' },
      { operation: 'star_builder', cost_usd: 0.001, created_at: '2026-07-20T10:00:00Z' },
      { operation: 'answer_evaluation', cost_usd: 9, created_at: '2026-07-20T10:00:00Z' }, // not a free tool op
      { operation: 'qg_set_generation', cost_usd: null, created_at: '2026-07-20T10:00:00Z' },
    ];
    const { tools } = aggregateFreeToolMetrics({
      events30d: [],
      costRows,
      allTime: emptyAllTime,
      boundaries,
    });
    expect(tools.question_generator.today.cost_usd).toBe(0.01);
    expect(tools.ats.today.cost_usd).toBe(0.025);
    expect(tools.star.today.cost_usd).toBe(0.001);
    expect(tools.ats.today.cost_inr).toBe(Math.round(0.025 * USD_TO_INR * 100) / 100);
  });

  it('uses all-time count queries for the all window, deriving anonymous', () => {
    const allTime: AllTimeCounts = {
      events: {
        ats: { run: 100, cache_hit: 20, rate_limited: 5, error: 2 },
        question_generator: { run: 50 },
        star: {},
      },
      signedIn: { ats: 30, question_generator: 10, star: 0 },
      qgModes: { role: 40, topic: 10 },
    };
    const result = aggregateFreeToolMetrics({
      events30d: [],
      costRows: [],
      allTime,
      boundaries,
    });
    const atsAll = result.tools.ats.all;
    expect(atsAll.runs).toBe(100);
    expect(atsAll.cache_hits).toBe(20);
    expect(atsAll.rate_limited).toBe(5);
    expect(atsAll.errors).toBe(2);
    expect(atsAll.signed_in).toBe(30);
    expect(atsAll.anonymous).toBe(90); // 100 + 20 - 30
    expect(atsAll.cache_hit_rate_pct).toBe(16.7);
    expect(result.qg_mode_breakdown.all).toEqual({ role: 40, topic: 10 });
  });

  it('tracks QG mode breakdown for set runs only', () => {
    const rows: UsageEventRow[] = [
      event({ mode: 'role' }),
      event({ mode: 'topic' }),
      event({ mode: 'topic' }),
      event({ mode: 'answer' }), // answer reveals excluded from mode breakdown
      event({ mode: 'role', event: 'cache_hit' }), // cache hits excluded
    ];
    const { qg_mode_breakdown } = aggregateFreeToolMetrics({
      events30d: rows,
      costRows: [],
      allTime: emptyAllTime,
      boundaries,
    });
    expect(qg_mode_breakdown.today).toEqual({ role: 1, topic: 2 });
  });

  it('ignores unknown tools and unparseable timestamps', () => {
    const rows: UsageEventRow[] = [
      event({ tool: 'unknown_tool' }),
      event({ created_at: 'not-a-date' }),
    ];
    const { tools } = aggregateFreeToolMetrics({
      events30d: rows,
      costRows: [],
      allTime: emptyAllTime,
      boundaries,
    });
    expect(tools.question_generator.d30.runs).toBe(0);
  });
});
