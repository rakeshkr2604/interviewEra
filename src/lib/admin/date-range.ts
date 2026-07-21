/**
 * Shared admin date-range parsing for platform dashboard APIs.
 * Presets OR explicit from/to (YYYY-MM-DD). from/to win when both present.
 */

export type AdminDateBounds = {
  /** Inclusive lower bound ISO timestamptz, or null = all time. */
  fromIso: string | null;
  /** Inclusive upper bound ISO timestamptz (end of to-day), or null = open-ended. */
  toIso: string | null;
  /** Approximate day span for cache keys / display (null when all-time). */
  rangeDays: number | null;
  /** Preset label when used. */
  preset: string | null;
};

function startOfUtcDay(yyyyMmDd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return null;
  const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function endOfUtcDay(yyyyMmDd: string): Date | null {
  const start = startOfUtcDay(yyyyMmDd);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60_000 - 1);
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60_000)));
}

/**
 * Resolve bounds from URL search params.
 * - `from` + `to` (YYYY-MM-DD) → custom range
 * - else `range` preset depending on context (caller interprets)
 */
export function parseAdminDateBounds(
  searchParams: URLSearchParams,
  options: {
    /** Default preset when nothing provided. */
    defaultPreset?: string;
    /** Map preset → { fromIso, toIso }. Return null fromIso for all-time. */
    resolvePreset: (preset: string) => { fromIso: string | null; toIso: string | null };
  },
): AdminDateBounds {
  const fromRaw = searchParams.get('from');
  const toRaw = searchParams.get('to');

  if (fromRaw && toRaw) {
    const from = startOfUtcDay(fromRaw);
    const to = endOfUtcDay(toRaw);
    if (from && to && to >= from) {
      return {
        fromIso: from.toISOString(),
        toIso: to.toISOString(),
        rangeDays: daysBetween(from, to),
        preset: 'custom',
      };
    }
  }

  if (fromRaw && !toRaw) {
    const from = startOfUtcDay(fromRaw);
    if (from) {
      const now = new Date();
      return {
        fromIso: from.toISOString(),
        toIso: null,
        rangeDays: daysBetween(from, now),
        preset: 'custom',
      };
    }
  }

  const preset = searchParams.get('range') ?? options.defaultPreset ?? '30';
  const resolved = options.resolvePreset(preset);
  const from = resolved.fromIso ? new Date(resolved.fromIso) : null;
  const to = resolved.toIso ? new Date(resolved.toIso) : new Date();
  return {
    fromIso: resolved.fromIso,
    toIso: resolved.toIso,
    rangeDays: from ? daysBetween(from, to) : null,
    preset,
  };
}

/** Growth / funnel / checkout presets: numeric day windows (7|30|90). */
export function resolveGrowthPreset(preset: string): { fromIso: string | null; toIso: string | null } {
  const days = Math.min(90, Math.max(1, parseInt(preset, 10) || 30));
  return {
    fromIso: new Date(Date.now() - days * 24 * 60 * 60_000).toISOString(),
    toIso: null,
  };
}

/** Analytics All Users join-date presets. */
export function resolveUsersJoinPreset(preset: string): { fromIso: string | null; toIso: string | null } {
  const now = new Date();
  if (preset === 'today') {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return { fromIso: start.toISOString(), toIso: null };
  }
  if (preset === '7d') {
    return { fromIso: new Date(now.getTime() - 7 * 24 * 60 * 60_000).toISOString(), toIso: null };
  }
  if (preset === 'month') {
    return {
      fromIso: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
      toIso: null,
    };
  }
  // all
  return { fromIso: null, toIso: null };
}
