import Link from 'next/link';
import { Gauge, TrendingUp } from 'lucide-react';
import type { ReadinessScoreResult } from '@/lib/candidate/types';

const LEVEL_COPY: Record<ReadinessScoreResult['level'], string> = {
  ready: 'Placement ready',
  developing: 'Developing',
  early_stage: 'Early stage',
};

export function ReadinessOverviewCard({ readiness }: { readiness: ReadinessScoreResult }) {
  const levelLabel = LEVEL_COPY[readiness.level];

  return (
    <section
      className="dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5 lg:px-7"
      aria-labelledby="readiness-overview-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="dashboard-section-eyebrow">Readiness</p>
          <h2 id="readiness-overview-heading" className="dashboard-section-title">
            Interview readiness
          </h2>
          <p className="dashboard-section-subtitle">{readiness.trendLabel}</p>
        </div>
        <div className="text-right">
          <p className="dashboard-section-eyebrow" style={{ color: 'var(--text-muted)' }}>
            Overall
          </p>
          <p
            className="text-3xl font-bold tabular-nums leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {readiness.overall}
            <span className="text-base font-semibold" style={{ color: 'var(--text-muted)' }}>
              /100
            </span>
          </p>
          <p className="mt-1 text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
            {levelLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {readiness.categories.map((cat) => (
          <div
            key={cat.key}
            className="rounded-xl border px-3 py-2.5"
            style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {cat.label}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {cat.score == null ? '—' : cat.score}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/readiness"
          className="dashboard-hover-lift inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            color: 'var(--text-secondary)',
          }}
        >
          <Gauge size={16} aria-hidden />
          View readiness
        </Link>
        <Link
          href="/roadmap"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline"
          style={{ color: 'var(--accent-primary)' }}
        >
          <TrendingUp size={16} aria-hidden />
          Personalized roadmap
        </Link>
      </div>
    </section>
  );
}
