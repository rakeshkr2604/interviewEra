'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  FileSearch,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Star,
} from 'lucide-react';
import type {
  FreeToolKey,
  FreeToolMetricsResult,
  ToolWindowStats,
  WindowKey,
} from '@/lib/admin/free-tool-metrics';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_LABELS: Record<FreeToolKey, string> = {
  ats: 'ATS Resume Checker',
  question_generator: 'Question Generator',
  star: 'STAR Answer Builder',
};

const TOOL_ORDER: FreeToolKey[] = ['ats', 'question_generator', 'star'];

const TOOL_ICONS: Record<FreeToolKey, React.ReactNode> = {
  ats: <FileSearch className="h-4 w-4" />,
  question_generator: <ListChecks className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
};

const TOOL_ACCENTS: Record<FreeToolKey, string> = {
  ats: 'var(--accent-primary)',
  question_generator: 'var(--accent-success)',
  star: 'var(--accent-warning)',
};

const WINDOW_OPTIONS: { key: WindowKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'd7', label: '7d' },
  { key: 'd30', label: '30d' },
  { key: 'all', label: 'All-time' },
];

const QG_MODE_LABELS: Record<string, string> = {
  role: 'Role',
  jd: 'Job description',
  topic: 'Topic',
  company: 'Company-style',
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '2px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(n > 0 && n < 0.01 ? 4 : 2)}`;
}

function fmtInr(n: number): string {
  return `₹${n.toFixed(2)}`;
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useFreeToolMetrics() {
  const [data, setData] = useState<FreeToolMetricsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inflightRef = useRef(false);

  const fetch_ = useCallback(async (fresh = false) => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const url = fresh ? '/api/admin/free-tools?fresh=1' : '/api/admin/free-tools';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as FreeToolMetricsResult);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load free-tool metrics');
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, []);

  useEffect(() => { void fetch_(false); }, [fetch_]);
  const refresh = useCallback(() => fetch_(true), [fetch_]);

  return { data, loading, error, refresh, lastUpdated };
}

// ─── Small building blocks ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </p>
  );
}

function WindowToggle({
  value,
  onChange,
}: {
  value: WindowKey;
  onChange: (w: WindowKey) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-xl p-1"
      style={{ border: '2px solid var(--card-border)', background: 'var(--card-bg)' }}
      role="group"
      aria-label="Time window"
    >
      {WINDOW_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            aria-pressed={active}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-none"
            style={
              active
                ? { background: 'var(--accent-primary)', color: '#fff' }
                : { background: 'transparent', color: 'var(--text-secondary)' }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

// ─── Per-tool summary card ────────────────────────────────────────────────────

function ToolSummaryCard({
  tool,
  stats,
  blocksToday,
  loading,
}: {
  tool: FreeToolKey;
  stats: ToolWindowStats | null;
  blocksToday: number;
  loading: boolean;
}) {
  const accent = TOOL_ACCENTS[tool];
  return (
    <div style={cardStyle} className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `color-mix(in srgb, ${accent} 18%, var(--bg-secondary))`, color: accent }}
        >
          {TOOL_ICONS[tool]}
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {TOOL_LABELS[tool]}
        </p>
      </div>

      {loading || !stats ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
          ))}
        </div>
      ) : (
        <>
          <div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {fmt(stats.runs)}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              runs{stats.cache_hits > 0 ? ` · +${fmt(stats.cache_hits)} served from cache` : ''}
            </p>
          </div>
          <div className="space-y-1.5">
            <StatRow
              label="Cache hit rate"
              value={stats.cache_hit_rate_pct == null ? 'N/A — no cache' : `${stats.cache_hit_rate_pct}%`}
            />
            <StatRow
              label="Rate-limit blocks (today)"
              value={
                <span className="inline-flex items-center gap-1">
                  {blocksToday > 0 && <ShieldAlert className="h-3 w-3" style={{ color: 'var(--accent-danger)' }} />}
                  {fmt(blocksToday)}
                </span>
              }
            />
            <StatRow
              label="Errors"
              value={
                <span className="inline-flex items-center gap-1">
                  {stats.errors > 0 && <AlertCircle className="h-3 w-3" style={{ color: 'var(--accent-danger)' }} />}
                  <span style={stats.errors > 0 ? { color: 'var(--accent-danger)' } : undefined}>
                    {fmt(stats.errors)}
                  </span>
                </span>
              }
            />
            <StatRow
              label="LLM cost"
              value={`${fmtUsd(stats.cost_usd)} · ${fmtInr(stats.cost_inr)}`}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Signed-in split bar ──────────────────────────────────────────────────────

function SplitBar({ signedIn, anonymous }: { signedIn: number; anonymous: number }) {
  const total = signedIn + anonymous;
  const pctSigned = total > 0 ? Math.round((signedIn / total) * 100) : 0;
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-secondary)' }}>
        {total > 0 && (
          <div
            className="h-full rounded-full"
            style={{ width: `${pctSigned}%`, background: 'var(--accent-primary)' }}
          />
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: 'var(--accent-primary)' }} />
          Signed in {fmt(signedIn)}{total > 0 ? ` (${pctSigned}%)` : ''}
        </span>
        <span>Anonymous {fmt(anonymous)}</span>
      </div>
    </div>
  );
}

function SignedInSplitPanel({
  data,
  window,
  loading,
}: {
  data: FreeToolMetricsResult | null;
  window: WindowKey;
  loading: boolean;
}) {
  return (
    <div style={cardStyle} className="p-5">
      <h2 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Signed-in vs anonymous
      </h2>
      <p className="mb-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Runs + cache hits · cookie-presence heuristic, not verified sessions
      </p>
      {loading || !data ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {TOOL_ORDER.map((tool) => {
            const stats = data.tools[tool][window];
            return (
              <div key={tool}>
                <p className="mb-1.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  {TOOL_LABELS[tool]}
                </p>
                <SplitBar signedIn={stats.signed_in} anonymous={stats.anonymous} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── QG mode breakdown ────────────────────────────────────────────────────────

function QgModePanel({
  data,
  window,
  loading,
}: {
  data: FreeToolMetricsResult | null;
  window: WindowKey;
  loading: boolean;
}) {
  const breakdown = data?.qg_mode_breakdown[window] ?? {};
  const entries = Object.entries(QG_MODE_LABELS).map(([mode, label]) => ({
    mode,
    label,
    count: breakdown[mode] ?? 0,
  }));
  const max = Math.max(1, ...entries.map((e) => e.count));
  const total = entries.reduce((s, e) => s + e.count, 0);

  return (
    <div style={cardStyle} className="p-5">
      <h2 className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Question Generator — mode breakdown
      </h2>
      <p className="mb-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        Fresh set generations only (cache hits and answer reveals excluded)
      </p>
      {loading || !data ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
          ))}
        </div>
      ) : total === 0 ? (
        <p className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          No set generations in this window yet.
        </p>
      ) : (
        <div className="space-y-2.5">
          {entries.map(({ mode, label, count }) => (
            <div key={mode} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {label}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.round((count / max) * 100)}%`,
                    background: 'var(--accent-success)',
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {fmt(count)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FreeToolsPage() {
  const { data, loading, error, refresh, lastUpdated } = useFreeToolMetrics();
  const [window, setWindow] = useState<WindowKey>('today');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const usdToInr = data?.usd_to_inr ?? 84;

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Free Tools
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {lastUpdated
              ? `Last updated ${relTime(lastUpdated.toISOString())} · ATS · Question Generator · STAR Builder`
              : 'Loading…'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <WindowToggle value={window} onChange={setWindow} />
          <button
            onClick={() => void handleRefresh()}
            disabled={refreshing || loading}
            className="inline-flex shrink-0 items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-semibold transition-[transform,box-shadow] hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
            style={{
              border: '2px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-[14px] px-4 py-3 text-sm font-medium"
          style={{
            border: '2px solid color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
            color: 'var(--accent-danger)',
          }}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => void handleRefresh()} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* Per-tool summary cards */}
      <div>
        <SectionLabel>Usage &amp; Cost — {WINDOW_OPTIONS.find((w) => w.key === window)?.label}</SectionLabel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_ORDER.map((tool) => (
            <ToolSummaryCard
              key={tool}
              tool={tool}
              stats={data ? data.tools[tool][window] : null}
              blocksToday={data ? data.tools[tool].today.rate_limited : 0}
              loading={loading && !data}
            />
          ))}
        </div>
      </div>

      {/* Splits */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SignedInSplitPanel data={data} window={window} loading={loading && !data} />
        <QgModePanel data={data} window={window} loading={loading && !data} />
      </div>

      {/* Conversion signal */}
      <div>
        <SectionLabel>Conversion Signal</SectionLabel>
        <div style={cardStyle} className="flex items-center gap-4 p-5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 18%, var(--bg-secondary))',
              color: 'var(--accent-primary)',
            }}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Signup CTA click-through rate per tool
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Coming soon — requires GA4 integration. CTA clicks are tracked client-side in GA4 only
              and are not persisted server-side, so this dashboard cannot compute them yet.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Metrics refresh every ~2 minutes. LLM cost shown in USD (source) and INR (₹{usdToInr}/USD,
        update in cost-engine.ts). Free-tool analytics · restricted to platform admin only
      </p>
    </div>
  );
}
