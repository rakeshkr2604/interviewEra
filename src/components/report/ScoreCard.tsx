import { Lightbulb } from 'lucide-react';
import type { ScoreJustification } from '@/types/app.types';

interface ScoreCardProps {
  overallScore: number;
  role: string;
  completedAt: string;
  /** Aggregated from per-answer evaluations when present */
  scoreJustification?: ScoreJustification | null;
}

export function ScoreCard({
  overallScore,
  role,
  completedAt,
  scoreJustification,
}: ScoreCardProps) {
  const scoreColor =
    overallScore >= 7
      ? 'var(--accent-success)'
      : overallScore >= 5
        ? 'var(--accent-warning)'
        : 'var(--accent-danger)';

  const strengths = scoreJustification?.key_strengths ?? [];
  const improvements = scoreJustification?.improvement_areas ?? [];

  return (
    <div className="dashboard-premium-card flex h-full flex-col px-6 py-5 sm:px-7 sm:py-6">
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
        style={{ color: 'var(--accent-primary)' }}
      >
        Summary
      </p>
      <h2 className="mt-1 text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
        Overall score
      </h2>
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div
          className="flex items-baseline gap-2"
          aria-label={`Overall score ${overallScore.toFixed(1)} out of 10`}
        >
          <span className="text-5xl font-bold tabular-nums leading-none sm:text-6xl" style={{ color: scoreColor }}>
            {overallScore.toFixed(1)}
          </span>
          <span className="text-base font-medium sm:text-lg" style={{ color: 'var(--text-muted)' }}>
            / 10
          </span>
        </div>
        <div
          className="mt-5 space-y-1.5 border-t pt-4 text-sm shrink-0"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
        >
          <p>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Role:
            </span>{' '}
            {role}
          </p>
          <p>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Completed:
            </span>{' '}
            {completedAt}
          </p>
        </div>

        {scoreJustification ? (
          <div
            className="mt-6 rounded-xl border-2 p-4 text-left sm:flex sm:min-h-0 sm:flex-1 sm:flex-col"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
            }}
          >
            <div className="mb-4 flex items-start gap-2.5">
              <Lightbulb
                className="mt-0.5 shrink-0 opacity-90"
                size={16}
                aria-hidden
                style={{ color: 'var(--accent-primary)' }}
              />
              <div className="min-w-0">
                <h3 className="text-xs font-semibold sm:text-sm" style={{ color: 'var(--text-primary)' }}>
                  Why this score?
                </h3>
                <p className="mt-1.5 max-w-prose text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {scoreJustification.why_this_score}
                </p>
              </div>
            </div>

            <div className="mt-1 grid flex-1 grid-cols-1 gap-5 border-t pt-4 sm:grid-cols-2" style={{ borderColor: 'var(--card-border)' }}>
              <div>
                <p
                  className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--accent-success)' }}
                >
                  Key strengths
                </p>
                <ul className="space-y-2 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {strengths.map((strength, i) => (
                    <li key={`${strength}-${i}`} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full" style={{ background: 'var(--accent-success)' }} aria-hidden />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p
                  className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: 'var(--accent-warning)' }}
                >
                  Areas to improve
                </p>
                <ul className="space-y-2 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {improvements.map((area, i) => (
                    <li key={`${area}-${i}`} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full" style={{ background: 'var(--accent-warning)' }} aria-hidden />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
