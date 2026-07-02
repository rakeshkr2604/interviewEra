import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions';
import type { PersonalizedRoadmap, ReadinessScoreResult } from '@/lib/candidate/types';

export function ReadinessPageContent({
  readiness,
  roadmap,
}: {
  readiness: ReadinessScoreResult;
  roadmap: PersonalizedRoadmap;
}) {
  return (
    <div className="space-y-6">
      <section className="dashboard-premium-card px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="dashboard-section-eyebrow">Overall score</p>
            <p className="text-4xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {readiness.overall}
              <span className="text-xl font-semibold" style={{ color: 'var(--text-muted)' }}>
                /100
              </span>
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {readiness.trendLabel}
            </p>
          </div>
          <Link
            href="/roadmap"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          >
            <TrendingUp size={16} aria-hidden />
            View full roadmap
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {readiness.categories.map((cat) => (
          <article
            key={cat.key}
            className="dashboard-premium-card px-5 py-4"
            aria-labelledby={`cat-${cat.key}`}
          >
            <h2 id={`cat-${cat.key}`} className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {cat.label}
            </h2>
            <p className="mt-2 text-2xl font-bold tabular-nums">{cat.score}/100</p>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {cat.summary}
            </p>
          </article>
        ))}
      </section>

      {roadmap.weakDimensions.length > 0 ? (
        <section className="dashboard-premium-card px-5 py-5">
          <h2 className="dashboard-section-title">Focus areas</h2>
          <ul className="mt-3 space-y-2">
            {roadmap.weakDimensions.map((dim) => (
              <li key={dim} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {REPORT_DIMENSION_LABELS[dim]}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
