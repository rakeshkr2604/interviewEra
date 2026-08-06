'use client';

import { useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Users, Activity, Zap, MessageSquare, RefreshCw,
  TrendingUp, Clock, CheckCircle, AlertCircle,
  Database, Server,   Cpu, ChevronLeft, ChevronRight,
  Copy, Check, Mic,
} from 'lucide-react';
import {
  useAdminStats,
  useInterviewStats,
  useLiveUsers,
  useRecentUsers,
  useSystemHealth,
  type InterviewStats,
  type LiveUser,
  type RecentUser,
  type RecentUsersRange,
  type UsersDateFilter,
  type SystemHealth,
} from '@/hooks/useAdminStats';
import { toast } from 'sonner';
import { formatElevenLabsHealthReason, type ElevenLabsHealthReason } from '@/lib/voice/elevenlabs-health-labels';
import {
  formatDeepgramHealthReason,
  type DeepgramHealthReason,
} from '@/lib/voice/deepgram-admin-health-labels';
import { USD_TO_INR } from '@/lib/cost/cost-engine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return `${s}s ago`;
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function planBadge(tier: string) {
  const map: Record<string, string> = {
    free:         'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
    starter:      'bg-blue-50  text-blue-700  dark:bg-blue-950 dark:text-blue-300',
    pro:          'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    campus:       'bg-amber-50  text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    campus_admin: 'bg-amber-50  text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  };
  return map[tier] ?? map.free;
}

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '2px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  icon:     React.ReactNode;
  iconBg?:  string;
  loading?: boolean;
}

function StatCard({ label, value, sub, icon, iconBg = 'var(--accent-primary)', loading }: StatCardProps) {
  return (
    <div style={cardStyle} className="flex flex-col gap-4 p-5">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in srgb, ${iconBg} 18%, var(--bg-secondary))`, color: iconBg }}
      >
        {icon}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 w-20 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
          <div className="h-4 w-32 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
          <p className="mt-0.5 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {sub && <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'healthy'  ? 'var(--accent-success)' :
    status === 'degraded' ? 'var(--accent-warning)'  : 'var(--accent-danger)';
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;
}

function formatInrFromUsd(usd: number): string {
  const inr = usd * USD_TO_INR;
  if (inr <= 0) return '₹0';
  if (inr < 1) return `₹${inr.toFixed(2)}`;
  if (inr < 100) return `₹${inr.toFixed(2)}`;
  return `₹${Math.round(inr).toLocaleString('en-IN')}`;
}

/** Compact AI Providers subtitle: routing, reliability, samples, est. INR. */
function formatAiProvidersExtra(ai: SystemHealth['services']['ai_providers']): string {
  const routing =
    ai.routing_basis === 'intelligence' ? 'Live routing' : 'Static defaults';

  const counts = ai.sample_counts;
  const samples =
    (counts?.openrouter ?? 0) + (counts?.openai ?? 0) + (counts?.mistral ?? 0);

  const parts: string[] = [routing];

  const openrouterRel = ai.scores?.openrouter?.reliability;
  const openaiRel = ai.scores?.openai?.reliability;
  const mistralRel = ai.scores?.mistral?.reliability;

  if (typeof openrouterRel === 'number') {
    parts.push(`OpenRouter ${Math.round(openrouterRel)}%`);
  }
  if (typeof openaiRel === 'number') {
    parts.push(`OpenAI ${Math.round(openaiRel)}%`);
  }
  if (typeof mistralRel === 'number') {
    parts.push(`Mistral ${Math.round(mistralRel)}%`);
  }

  if (samples === 0) {
    parts.push('no live samples yet');
  } else {
    parts.push(`${samples} sample${samples === 1 ? '' : 's'}`);
  }

  parts.push(`est. ${formatInrFromUsd(ai.total_cost_usd ?? 0)}`);

  return parts.join(' · ');
}

function formatAiProvidersTitle(ai: SystemHealth['services']['ai_providers']): string {
  const names = ['OpenRouter', 'OpenAI'];
  if ((ai.sample_counts?.mistral ?? 0) > 0 || ai.scores?.mistral?.reliability != null) {
    names.push('Mistral');
  }
  return `AI Providers (${names.join(', ')})`;
}

// ─── System Health Panel ──────────────────────────────────────────────────────

function SystemHealthPanel({ health, loading }: { health: SystemHealth | null; loading: boolean }) {
  const overallColor =
    health?.overall === 'healthy'  ? 'var(--accent-success)' :
    health?.overall === 'degraded' ? 'var(--accent-warning)'  : 'var(--accent-danger)';

  const services = health ? [
    { name: 'Database',     icon: <Database className="h-4 w-4" />, ...health.services.database },
    { name: 'Redis',        icon: <Server   className="h-4 w-4" />, ...health.services.redis },
    {
      name:       formatAiProvidersTitle(health.services.ai_providers),
      icon:       <Cpu className="h-4 w-4" />,
      status:     health.services.ai_providers.status,
      latency_ms: undefined as number | undefined,
      extra:      formatAiProvidersExtra(health.services.ai_providers),
    },
    {
      name:       'ElevenLabs',
      icon:       <Activity className="h-4 w-4" />,
      status:     health.services.elevenlabs.status,
      latency_ms: health.services.elevenlabs.latency_ms,
      extra:      formatElevenLabsHealthReason(health.services.elevenlabs.reason as ElevenLabsHealthReason | undefined),
    },
    {
      name:       'Deepgram',
      icon:       <Mic className="h-4 w-4" />,
      status:     health.services.deepgram?.status ?? 'offline',
      latency_ms: health.services.deepgram?.latency_ms,
      extra:      formatDeepgramHealthReason(health.services.deepgram?.reason as DeepgramHealthReason | undefined),
    },
  ] : [];

  return (
    <div style={cardStyle} className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>System Health</h2>
        {health && (
          <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: overallColor }}>
            <StatusDot status={health.overall} />
            {health.overall.toUpperCase()}
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }}>{s.icon}</span>
                <div className="min-w-0">
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                  {'extra' in s && s.extra ? (
                    <p className="mt-0.5 text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                      {s.extra}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {s.latency_ms !== undefined && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.latency_ms}ms</span>
                )}
                <StatusDot status={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}
      {health && (
        <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Checked {relTime(health.checked_at)}
        </p>
      )}
    </div>
  );
}

// ─── Live Users Panel ─────────────────────────────────────────────────────────

function LiveUsersPanel({ users, loading }: { users: LiveUser[]; loading: boolean }) {
  return (
    <div style={cardStyle} className="p-5">
      <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Active Now
        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
          last 5 min
        </span>
      </h2>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active users right now.</p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {users.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.email}</p>
                <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>{u.current_page ?? '/dashboard'}</p>
              </div>
              <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                <span
                  className="flex items-center gap-1 text-[10px] font-medium"
                  style={{ color: u.is_online ? 'var(--accent-success)' : 'var(--text-muted)' }}
                >
                  {u.is_online ? (
                    <>
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: 'var(--accent-success)' }}
                      />
                      online
                    </>
                  ) : relTime(u.last_seen_at)}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${planBadge(u.plan_tier)}`}>
                  {u.plan_tier}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Interviews Chart ─────────────────────────────────────────────────────────

function InterviewsChart({ data, loading }: { data: InterviewStats | null; loading: boolean }) {
  if (loading) {
    return <div className="h-72 animate-pulse rounded-[18px]" style={{ background: 'var(--card-border)' }} />;
  }
  if (!data) return null;

  const chartData = data.chart_data.map((d) => ({
    date:  d.date.slice(5),
    count: d.count,
  }));

  return (
    <div style={cardStyle} className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Interviews — last 30 days
        </h2>
        <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>✓ {data.by_status.completed} completed</span>
          <span>↻ {data.by_status.in_progress} active</span>
          <span>✗ {data.by_status.abandoned} abandoned</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradIv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 12,
              fontSize: 12,
              boxShadow: 'var(--card-shadow)',
            }}
            labelStyle={{ color: 'var(--text-secondary)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#gradIv)"
            name="Interviews"
          />
        </AreaChart>
      </ResponsiveContainer>

      {data.top_roles.length > 0 && (
        <div
          className="mt-4 rounded-[14px] p-4"
          style={{ border: '1px solid var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <p
            className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: 'var(--text-muted)' }}
          >
            Top Roles
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data.top_roles.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="role"
                width={100}
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 12,
                  fontSize: 12,
                }}
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Interviews" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Copy button (matches AccountManagementPanel pattern) ─────────────────────

function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="inline-flex shrink-0 items-center rounded p-0.5 transition-colors hover:bg-[color:var(--bg-secondary)]"
      style={{ color: copied ? 'var(--accent-success)' : 'var(--text-muted)' }}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast.success('Copied to clipboard');
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('Could not copy');
        }
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ─── Recent Users Table ───────────────────────────────────────────────────────

function fmtInterviewDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function RecentUsersTable({
  refreshKey,
  dateFilter,
  onDateFilterChange,
}: {
  refreshKey: number;
  dateFilter: UsersDateFilter;
  onDateFilterChange: (f: UsersDateFilter) => void;
}) {
  const [page, setPage] = useState(1);
  const [customFrom, setCustomFrom] = useState(
    dateFilter.kind === 'custom' ? dateFilter.from : todayIsoDate(),
  );
  const [customTo, setCustomTo] = useState(
    dateFilter.kind === 'custom' ? dateFilter.to : todayIsoDate(),
  );
  const { users, total, totalPages, loading, error } = useRecentUsers(page, 20, refreshKey, dateFilter);

  const selectValue = dateFilter.kind === 'custom' ? 'custom' : dateFilter.range;

  const handlePresetChange = (value: string) => {
    setPage(1);
    if (value === 'custom') {
      onDateFilterChange({ kind: 'custom', from: customFrom, to: customTo });
      return;
    }
    onDateFilterChange({ kind: 'preset', range: value as RecentUsersRange });
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customTo < customFrom) {
      toast.error('Pick a valid start and end date');
      return;
    }
    setPage(1);
    onDateFilterChange({ kind: 'custom', from: customFrom, to: customTo });
  };

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
        style={{ borderBottom: '2px solid var(--card-border)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          All Users
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{total} total</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectValue}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
            aria-label="Filter users by join date"
          >
            <option value="today">Joined today</option>
            <option value="7d">Joined last 7 days</option>
            <option value="month">Joined this month</option>
            <option value="all">All time</option>
            <option value="custom">Custom range</option>
          </select>
          {selectValue === 'custom' && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                aria-label="Joined from"
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
                aria-label="Joined to"
              />
              <button
                type="button"
                onClick={applyCustom}
                className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              >
                Apply
              </button>
            </>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg p-1.5 transition-colors hover:bg-[color:var(--bg-secondary)] disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[4rem] text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg p-1.5 transition-colors hover:bg-[color:var(--bg-secondary)] disabled:opacity-30"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <p className="px-5 py-4 text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{
                borderBottom: '1px solid var(--card-border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
              }}
            >
              <th className="px-5 py-3">User</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 text-center">Credits</th>
              <th className="px-4 py-3 text-center">Pending</th>
              <th className="px-4 py-3 text-center">Completed</th>
              <th className="px-4 py-3">Last Interview</th>
              <th className="px-4 py-3">Last Active</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--card-border)' }}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 w-24 animate-pulse rounded" style={{ background: 'var(--card-border)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              : users.map((u: RecentUser) => (
                  <tr
                    key={u.id}
                    className="transition-colors"
                    style={{ borderTop: '1px solid var(--card-border)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  >
                    <td className="px-5 py-3.5">
                      <p className="max-w-[200px] truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                        {u.name ?? u.email}
                      </p>
                      <div className="mt-0.5 flex max-w-[220px] items-center gap-1">
                        <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                          {u.email}
                        </p>
                        <CopyTextButton text={u.email} label="Copy email" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${planBadge(u.plan_tier)}`}>
                        {u.plan_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {u.credits_remaining}
                    </td>
                    <td
                      className="px-4 py-3.5 text-center text-sm font-semibold tabular-nums"
                      style={{
                        color: u.pending_interviews > 0
                          ? 'var(--accent-warning)'
                          : 'var(--text-muted)',
                      }}
                      title={`${u.interviews_count} total interviews`}
                    >
                      {u.pending_interviews}
                    </td>
                    <td
                      className="px-4 py-3.5 text-center text-sm font-semibold tabular-nums"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {u.completed_interviews}
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {fmtInterviewDate(u.last_interview_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {u.is_online && (
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ background: 'var(--accent-success)' }}
                          />
                        )}
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {relTime(u.last_seen_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>
      {children}
    </p>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlatformAnalyticsPage() {
  // All hooks at page level — no automatic polling in any of them.
  const { stats, loading: statsLoading, error, refresh: refreshStats, lastUpdated } = useAdminStats();
  const { users: liveUsers, loading: liveLoading, refresh: refreshLive }            = useLiveUsers();
  const { health, loading: healthLoading, refresh: refreshHealth }                  = useSystemHealth();
  const { data: iStats, loading: iLoading, refresh: refreshInterviews }             = useInterviewStats();

  const [refreshing, setRefreshing]   = useState(false);
  // Bumped on each manual refresh — useRecentUsers re-fetches when this changes.
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [usersDateFilter, setUsersDateFilter] = useState<UsersDateFilter>({
    kind: 'preset',
    range: 'all',
  });

  const handleRefreshAll = useCallback(async () => {
    setRefreshing(true);
    setTableRefreshKey((k) => k + 1);
    // allSettled: one failing endpoint never blocks the others from updating.
    await Promise.allSettled([
      refreshStats(),
      refreshLive(),
      refreshHealth(),
      refreshInterviews(),
    ]);
    setRefreshing(false);
  }, [refreshStats, refreshLive, refreshHealth, refreshInterviews]);

  const loading = statsLoading || liveLoading || healthLoading || iLoading;

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {lastUpdated
              ? `Last updated ${relTime(lastUpdated.toISOString())} · manual refresh only`
              : 'Loading…'}
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
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
          <button onClick={handleRefreshAll} className="ml-auto underline">Retry</button>
        </div>
      )}

      {/* User Presence */}
      <div>
        <SectionLabel>User Presence</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total Registered" value={fmt(stats?.total_users ?? 0)} sub="all time" icon={<Users className="h-4 w-4" />} iconBg="var(--accent-primary)" loading={statsLoading} />
          <StatCard label="Currently Online"  value={stats?.online_users ?? 0}     sub="heartbeat ≤ 5 min" icon={<Activity className="h-4 w-4" />} iconBg="var(--accent-success)" loading={statsLoading} />
          <StatCard label="Active 5 min"      value={stats?.active_5m ?? 0}        sub="last 5 minutes"    icon={<Activity className="h-4 w-4" />} iconBg="var(--accent-success)" loading={statsLoading} />
          <StatCard label="Active 1 hour"     value={stats?.active_1h ?? 0}        sub="last 60 minutes"   icon={<Clock className="h-4 w-4" />}    iconBg="var(--accent-warning)" loading={statsLoading} />
          <StatCard label="Active 24 hours"   value={fmt(stats?.active_24h ?? 0)}  sub="last 24 hours"     icon={<TrendingUp className="h-4 w-4" />} iconBg="var(--accent-warning)" loading={statsLoading} />
        </div>
      </div>

      {/* Interviews */}
      <div>
        <SectionLabel>Interviews</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Interviews"  value={fmt(stats?.total_interviews ?? 0)} sub="all time"           icon={<MessageSquare className="h-4 w-4" />} iconBg="var(--accent-primary)" loading={statsLoading} />
          <StatCard label="Started Today"     value={stats?.interviews_today ?? 0}      sub="since midnight"     icon={<Zap className="h-4 w-4" />}           iconBg="var(--accent-primary)" loading={statsLoading} />
          <StatCard label="Completed Today"   value={stats?.completed_today ?? 0}       sub="status = completed" icon={<CheckCircle className="h-4 w-4" />}    iconBg="var(--accent-success)" loading={statsLoading} />
          <StatCard
            label="API Calls Today"
            value={fmt(stats?.api_requests_today ?? 0)}
            sub={`${fmt(stats?.tokens_today ?? 0)} tokens · $${(stats?.cost_today_usd ?? 0).toFixed(3)}`}
            icon={<Cpu className="h-4 w-4" />}
            iconBg="var(--accent-danger)"
            loading={statsLoading}
          />
        </div>
      </div>

      {/* Charts + health */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <InterviewsChart data={iStats} loading={iLoading} />
        </div>
        <div className="space-y-5">
          <SystemHealthPanel health={health} loading={healthLoading} />
          <LiveUsersPanel users={liveUsers} loading={liveLoading} />
        </div>
      </div>

      {/* Users table */}
      <div>
        <SectionLabel>All Users</SectionLabel>
        <RecentUsersTable
          refreshKey={tableRefreshKey}
          dateFilter={usersDateFilter}
          onDateFilterChange={setUsersDateFilter}
        />
      </div>

      <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Platform analytics · InterviewEra · restricted to platform admin only
      </p>
    </div>
  );
}
