'use client';

import { useMemo, useState } from 'react';
import {
  RefreshCw, TrendingUp, Users, CreditCard, MessageSquare, FlaskConical, ShoppingCart,
  Copy, Check,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import {
  useAdminFunnel,
  useAdminGrowth,
  useAdminExperiments,
  useCheckoutActivity,
  type CheckoutActivityRow,
  type GrowthRangeSelection,
} from '@/hooks/useAdminGrowth';
import type { ConversionFunnelMetrics } from '@/lib/admin/conversion-funnel-metrics';
import { formatDateTimeEnIn } from '@/lib/datetime/ist';

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '2px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Mirrors computeRetention() signup window: [now-(days+7), now-days) — display only. */
function retentionSignupWindowLabel(days: number): string {
  const msDay = 24 * 60 * 60 * 1000;
  const cohortStart = new Date(Date.now() - (days + 7) * msDay);
  const cohortEndExclusive = new Date(Date.now() - days * msDay);
  const endInclusive = new Date(cohortEndExclusive.getTime() - msDay);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(cohortStart)}–${fmt(endInclusive)}`;
}

function retentionDaysFromLabel(label: string): number | null {
  const m = /^D(\d+)$/i.exec(label.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Funnel Conv%/Drop-off display — distinguishes baseline (no prior step) from
 * zero-prior-volume (prev count was 0). Does not change metrics computation.
 */
function formatFunnelRatePct(
  value: number | null,
  opts: { isFirstStep: boolean; prevCount: number; thisCount: number },
): string {
  if (opts.isFirstStep) return 'baseline';
  if (value != null) return `${value}%`;
  if (opts.prevCount <= 0) {
    return opts.thisCount === 0 ? '0%' : 'N/A';
  }
  return 'N/A';
}

/** Revenue conv rate: null when pricing visits = 0 → "N/A"; genuine 0% stays 0%. */
function formatRevenueConvRate(
  rate: number | null | undefined,
  pricingViews: number | undefined,
): string {
  if (rate != null) return `${rate}%`;
  if ((pricingViews ?? 0) <= 0) return 'N/A';
  return '0%';
}

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

function eventLabel(name: CheckoutActivityRow['event_name']): string {
  switch (name) {
    case 'checkout_started':
      return 'Checkout started';
    case 'payment_started':
      return 'Payment started';
    case 'payment_failed':
      return 'Payment failed';
    case 'payment_completed':
      return 'Payment completed';
    default:
      return 'Pricing viewed';
  }
}

function eventBadgeStyle(name: CheckoutActivityRow['event_name']): React.CSSProperties {
  if (name === 'payment_completed') {
    return {
      background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)',
      color: 'var(--accent-success)',
    };
  }
  if (name === 'payment_failed') {
    return {
      background: 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',
      color: 'var(--accent-danger)',
    };
  }
  if (name === 'checkout_started') {
    return {
      background: 'color-mix(in srgb, var(--accent-warning) 14%, transparent)',
      color: 'var(--accent-warning)',
    };
  }
  return {
    background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
    color: 'var(--accent-primary)',
  };
}

function rangeLabel(range: GrowthRangeSelection): string {
  if (range.kind === 'custom') return `${range.from} → ${range.to}`;
  return `last ${range.days}d`;
}

function CheckoutActivityPanel({
  events,
  loading,
  error,
  range,
}: {
  events: CheckoutActivityRow[];
  loading: boolean;
  error: string | null;
  range: GrowthRangeSelection;
}) {
  return (
    <div style={cardStyle} className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide"
          style={{ color: 'var(--text-muted)' }}
        >
          <ShoppingCart className="h-4 w-4" />
          Checkout / Pricing Activity
        </h2>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {rangeLabel(range)} · newest first
        </span>
      </div>
      <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        Pricing, checkout, and payment lifecycle activity. Times use canonical event timestamps.
      </p>

      {error && (
        <p className="mb-3 text-sm" style={{ color: 'var(--accent-danger)' }}>{error}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No pricing, checkout, or payment events in this range yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className="text-[11px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: 'var(--text-muted)' }}
              >
                <th className="pb-2 pr-3">When</th>
                <th className="pb-2 pr-3">User</th>
                <th className="pb-2 pr-3">Event</th>
                <th className="pb-2 pr-3">Detail</th>
                <th className="pb-2">Order ID</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} style={{ borderTop: '1px solid var(--card-border)' }}>
                  <td className="py-2.5 pr-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                    <span className="block">{formatDateTimeEnIn(e.created_at)} IST</span>
                    <span className="block">{relTime(e.created_at)}</span>
                  </td>
                  <td className="py-2.5 pr-3">
                    {e.email ? (
                      <div className="flex max-w-[220px] items-center gap-1">
                        <p className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                          {e.email}
                        </p>
                        <CopyTextButton text={e.email} label="Copy email" />
                      </div>
                    ) : (
                      <p className="max-w-[200px] truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                        {e.user_id ? e.user_id.slice(0, 8) + '…' : 'Anonymous'}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                      style={eventBadgeStyle(e.event_name)}
                    >
                      {eventLabel(e.event_name)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {e.event_name !== 'pricing_page_viewed'
                      ? [e.plan, e.amount != null ? `₹${(e.amount / 100).toFixed(0)}` : null, e.source]
                          .filter(Boolean)
                          .join(' · ') || '—'
                      : e.source_page ?? '—'}
                  </td>
                  <td className="py-2.5">
                    {e.order_id ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {e.order_id}
                        </span>
                        <CopyTextButton text={e.order_id} label="Copy order ID" />
                      </div>
                    ) : (
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConversionAnalyticsPanel({
  data,
  loading,
  range,
}: {
  data: ConversionFunnelMetrics | undefined;
  loading: boolean;
  range: GrowthRangeSelection;
}) {
  const rate = (value: number | null) => (value == null ? 'N/A' : `${value}%`);

  return (
    <div className="space-y-5">
      <div style={cardStyle} className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Pricing → Payment Funnel
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {rangeLabel(range)} · raw counts, no significance claim
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2 pr-4">Step</th>
                <th className="pb-2 pr-4">Count</th>
                <th className="pb-2 pr-4">From previous</th>
                <th className="pb-2">Drop-off</th>
              </tr>
            </thead>
            <tbody>
              {(data?.steps ?? []).map((item, index) => (
                <tr key={item.key} style={{ borderTop: '1px solid var(--card-border)' }}>
                  <td className="py-2.5 pr-4 font-medium">{item.label}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{loading ? '…' : item.count}</td>
                  <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {index === 0 ? 'baseline' : rate(item.conversion_pct)}
                  </td>
                  <td className="py-2.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {index === 0 ? '—' : rate(item.drop_off_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Promotion views', data?.promotion_views],
            ['Coupon entries', data?.coupon_entries],
            ['Coupon applied', data?.coupon_applications],
            ['Payment failed', data?.payment_failures],
            [`Abandoned (${data?.abandonment_window_minutes ?? 60}m+)`, data?.abandoned_checkouts],
            ['Still in window', data?.unresolved_checkouts],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border p-3" style={{ borderColor: 'var(--card-border)' }}>
              <p className="text-lg font-bold tabular-nums">{loading ? '…' : (value ?? 0)}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Abandoned is derived only: checkout older than 60 minutes with no completed or failed event. Modal close and navigation never emit abandonment.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div style={cardStyle} className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Plan comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="pb-2 pr-3">Plan</th>
                  <th className="pb-2 pr-3">Views</th>
                  <th className="pb-2 pr-3">Selected</th>
                  <th className="pb-2 pr-3">Checkout</th>
                  <th className="pb-2 pr-3">Paid</th>
                  <th className="pb-2">Rate</th>
                </tr>
              </thead>
              <tbody>
                {(data?.plans ?? []).map((plan) => (
                  <tr key={plan.plan} style={{ borderTop: '1px solid var(--card-border)' }}>
                    <td className="py-2.5 pr-3 font-medium capitalize">{plan.plan}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{plan.pricing_views}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{plan.selections}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{plan.checkout_starts}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{plan.conversions}</td>
                    <td className="py-2.5 tabular-nums">{rate(plan.conversion_rate_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={cardStyle} className="p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Campaign conversion
          </h2>
          {(data?.campaigns.length ?? 0) === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attributed campaign activity in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }}>
                    <th className="pb-2 pr-3">Campaign</th>
                    <th className="pb-2 pr-3">Views</th>
                    <th className="pb-2 pr-3">Selected</th>
                    <th className="pb-2 pr-3">Checkout</th>
                    <th className="pb-2 pr-3">Paid</th>
                    <th className="pb-2">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.campaigns ?? []).map((campaign) => (
                    <tr key={campaign.campaign} style={{ borderTop: '1px solid var(--card-border)' }}>
                      <td className="max-w-36 truncate py-2.5 pr-3 font-mono text-xs" title={campaign.campaign}>
                        {campaign.campaign}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{campaign.promotion_views}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{campaign.selections}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{campaign.checkout_starts}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{campaign.conversions}</td>
                      <td className="py-2.5 tabular-nums">{rate(campaign.conversion_rate_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlatformGrowthPage() {
  const [presetDays, setPresetDays] = useState(30);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [customFrom, setCustomFrom] = useState(todayIsoDate());
  const [customTo, setCustomTo] = useState(todayIsoDate());
  const [appliedCustom, setAppliedCustom] = useState<{ from: string; to: string } | null>(null);

  const range: GrowthRangeSelection = useMemo(() => {
    if (mode === 'custom' && appliedCustom) {
      return { kind: 'custom', from: appliedCustom.from, to: appliedCustom.to };
    }
    return { kind: 'preset', days: presetDays };
  }, [mode, appliedCustom, presetDays]);

  const { data: funnel, loading: funnelLoading, refresh: refreshFunnel } = useAdminFunnel(range);
  const { data: growth, loading: growthLoading, refresh: refreshGrowth } = useAdminGrowth(range);
  const { experiments, loading: expLoading, refresh: refreshExp } = useAdminExperiments();
  const {
    data: checkout,
    loading: checkoutLoading,
    error: checkoutError,
    refresh: refreshCheckout,
  } = useCheckoutActivity(range);

  function refreshAll() {
    void refreshFunnel();
    void refreshGrowth();
    void refreshExp();
    void refreshCheckout();
  }

  function onSelectChange(value: string) {
    if (value === 'custom') {
      setMode('custom');
      return;
    }
    setMode('preset');
    setAppliedCustom(null);
    setPresetDays(parseInt(value, 10));
  }

  function applyCustom() {
    if (!customFrom || !customTo || customTo < customFrom) {
      toast.error('Pick a valid start and end date');
      return;
    }
    setAppliedCustom({ from: customFrom, to: customTo });
    setMode('custom');
  }

  const chartData = (funnel?.steps ?? []).map((s) => ({
    name: s.label.replace(' ', '\n'),
    count: s.count,
    conversion: s.conversion_pct ?? 0,
  }));

  const selectValue = mode === 'custom' ? 'custom' : String(presetDays);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Founder Growth Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Funnel, retention, revenue, referrals, and experiments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectValue}
            onChange={(e) => onSelectChange(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value="custom">Custom range</option>
          </select>
          {mode === 'custom' && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border px-2 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                aria-label="From date"
              />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border px-2 py-2 text-sm"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                aria-label="To date"
              />
              <button
                type="button"
                onClick={applyCustom}
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                style={{ borderColor: 'var(--card-border)' }}
              >
                Apply
              </button>
            </>
          )}
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Growth KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'WAU', value: growth?.wau ?? '—', icon: Users },
          { label: 'MAU', value: growth?.mau ?? '—', icon: Users },
          { label: 'Revenue (INR)', value: growth ? `₹${growth.revenue.revenue_inr.toFixed(0)}` : '—', icon: CreditCard },
          { label: 'Overall Score avg', value: growth?.feedback.avg_nps ?? '—', icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={cardStyle} className="p-4">
            <Icon className="mb-2 h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Retention by independent signup cohorts */}
      <div style={cardStyle} className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          <TrendingUp className="h-4 w-4" /> Retention by signup cohort
        </h2>
        <p className="mt-1 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Each D-window is its own 7-day signup band (not the same users measured over time).
        </p>
        <div className="grid grid-cols-3 gap-4">
          {(growth?.retention ?? []).map((r) => {
            const days = retentionDaysFromLabel(r.label);
            const windowLabel = days != null ? retentionSignupWindowLabel(days) : null;
            return (
              <div key={r.label}>
                <p className="text-2xl font-bold tabular-nums">{growthLoading ? '…' : `${r.rate_pct}%`}</p>
                <p className="text-sm font-medium">
                  {r.label}
                  {windowLabel ? (
                    <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                      {' '}
                      · signups {windowLabel}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {r.retained}/{r.cohort_size} users
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel chart */}
      <div style={cardStyle} className="p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Activation funnel ({rangeLabel(range)})
        </h2>
        <div className="h-64">
          {funnelLoading ? (
            <div className="flex h-full items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2 pr-4">Step</th>
                <th className="pb-2 pr-4">Count</th>
                <th className="pb-2 pr-4">Conv %</th>
                <th className="pb-2">Drop-off %</th>
              </tr>
            </thead>
            <tbody>
              {(funnel?.steps ?? []).map((s, idx) => {
                const prevCount = idx > 0 ? (funnel?.steps[idx - 1]?.count ?? 0) : 0;
                return (
                  <tr key={s.key} style={{ borderTop: '1px solid var(--card-border)' }}>
                    <td className="py-2 pr-4 font-medium">{s.label}</td>
                    <td className="py-2 pr-4 tabular-nums">{s.count}</td>
                    <td className="py-2 pr-4 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {formatFunnelRatePct(s.conversion_pct, {
                        isFirstStep: idx === 0,
                        prevCount,
                        thisCount: s.count,
                      })}
                    </td>
                    <td className="py-2 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {formatFunnelRatePct(s.drop_off_pct, {
                        isFirstStep: idx === 0,
                        prevCount,
                        thisCount: s.count,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConversionAnalyticsPanel
        data={growth?.conversion}
        loading={growthLoading}
        range={range}
      />

      {/* Revenue + referrals + feedback */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div style={cardStyle} className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Revenue</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Pricing visits</dt><dd className="font-semibold tabular-nums">{growth?.revenue.pricing_page_views ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Checkout started</dt><dd className="font-semibold tabular-nums">{growth?.revenue.checkout_started ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Payments</dt><dd className="font-semibold tabular-nums">{growth?.revenue.payments_captured ?? '—'}</dd></div>
            <div className="flex justify-between">
              <dt>Conv rate</dt>
              <dd className="font-semibold tabular-nums">
                {growth
                  ? formatRevenueConvRate(
                      growth.revenue.conversion_rate_pct,
                      growth.revenue.pricing_page_views,
                    )
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
        <div style={cardStyle} className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Referrals</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Credited</dt><dd className="font-semibold tabular-nums">{growth?.referrals.total_credited ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Pending</dt><dd className="font-semibold tabular-nums">{growth?.referrals.pending ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Credits issued</dt><dd className="font-semibold tabular-nums">{growth?.referrals.credits_issued ?? '—'}</dd></div>
          </dl>
          <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Detail + promo codes → Rewards
          </p>
        </div>
        <div style={cardStyle} className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Feedback
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Submissions</dt>
              <dd className="font-semibold tabular-nums">{growth?.feedback.submissions ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Avg rating</dt>
              <dd className="font-semibold tabular-nums">{growth?.feedback.avg_rating ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Failed emails</dt>
              <dd className="font-semibold tabular-nums">{growth?.feedback.failed_emails ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <CheckoutActivityPanel
        events={checkout?.events ?? []}
        loading={checkoutLoading}
        error={checkoutError}
        range={range}
      />

      {/* Experiments */}
      <div style={cardStyle} className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          <FlaskConical className="h-4 w-4" /> Experiments
        </h2>
        {expLoading ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : (
          <div className="space-y-4">
            {experiments.map((exp) => (
              <div key={exp.key}>
                <p className="mb-2 font-medium">{exp.key}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {exp.variants.map((v) => (
                    <div
                      key={v.variant}
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--card-border)' }}
                    >
                      <span className="font-semibold">Variant {v.variant}</span>
                      <span className="ml-2 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {v.assigned} assigned · {v.conversion_pct ?? 0}% completed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
