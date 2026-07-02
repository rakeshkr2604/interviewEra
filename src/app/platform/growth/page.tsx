'use client';

import { useState } from 'react';
import { RefreshCw, TrendingUp, Users, CreditCard, MessageSquare, FlaskConical } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAdminFunnel, useAdminGrowth, useAdminExperiments } from '@/hooks/useAdminGrowth';

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: '2px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
};

export default function PlatformGrowthPage() {
  const [range, setRange] = useState(30);
  const { data: funnel, loading: funnelLoading, refresh: refreshFunnel } = useAdminFunnel(range);
  const { data: growth, loading: growthLoading, refresh: refreshGrowth } = useAdminGrowth(range);
  const { experiments, loading: expLoading, refresh: refreshExp } = useAdminExperiments();

  function refreshAll() {
    void refreshFunnel();
    void refreshGrowth();
    void refreshExp();
  }

  const chartData = (funnel?.steps ?? []).map((s) => ({
    name: s.label.replace(' ', '\n'),
    count: s.count,
    conversion: s.conversion_pct ?? 0,
  }));

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
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(parseInt(e.target.value, 10))}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
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
          { label: 'NPS avg', value: growth?.feedback.avg_nps ?? '—', icon: MessageSquare },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} style={cardStyle} className="p-4">
            <Icon className="mb-2 h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Retention */}
      <div style={cardStyle} className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          <TrendingUp className="h-4 w-4" /> Retention
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {(growth?.retention ?? []).map((r) => (
            <div key={r.label}>
              <p className="text-2xl font-bold tabular-nums">{growthLoading ? '…' : `${r.rate_pct}%`}</p>
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {r.retained}/{r.cohort_size} users
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Funnel chart */}
      <div style={cardStyle} className="p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Activation funnel ({range}d cohort)
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
              {(funnel?.steps ?? []).map((s) => (
                <tr key={s.key} style={{ borderTop: '1px solid var(--card-border)' }}>
                  <td className="py-2 pr-4 font-medium">{s.label}</td>
                  <td className="py-2 pr-4 tabular-nums">{s.count}</td>
                  <td className="py-2 pr-4 tabular-nums">{s.conversion_pct ?? '—'}%</td>
                  <td className="py-2 tabular-nums">{s.drop_off_pct ?? '—'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue + referrals */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div style={cardStyle} className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Revenue</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Pricing visits</dt><dd className="font-semibold tabular-nums">{growth?.revenue.pricing_page_views ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Checkout started</dt><dd className="font-semibold tabular-nums">{growth?.revenue.checkout_started ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Payments</dt><dd className="font-semibold tabular-nums">{growth?.revenue.payments_captured ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Conv rate</dt><dd className="font-semibold tabular-nums">{growth?.revenue.conversion_rate_pct ?? '—'}%</dd></div>
          </dl>
        </div>
        <div style={cardStyle} className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Referrals</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Credited</dt><dd className="font-semibold tabular-nums">{growth?.referrals.total_credited ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Pending</dt><dd className="font-semibold tabular-nums">{growth?.referrals.pending ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Credits issued</dt><dd className="font-semibold tabular-nums">{growth?.referrals.credits_issued ?? '—'}</dd></div>
            <div className="flex justify-between"><dt>Failed feedback emails</dt><dd className="font-semibold tabular-nums">{growth?.feedback.failed_emails ?? '—'}</dd></div>
          </dl>
        </div>
      </div>

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
