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
      <h3 className="mt-1 text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
        Overall score
      </h3>
      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <div className="text-5xl font-bold tabular-nums" style={{ color: scoreColor }}>
          {overallScore.toFixed(1)}
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          out of 10
        </p>
        <div className="mt-4 space-y-1 text-sm shrink-0" style={{ color: 'var(--text-secondary)' }}>
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
            className="mt-6 rounded-xl border p-4 text-left sm:flex-1 sm:min-h-0 sm:flex sm:flex-col"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
            }}
          >
            <div className="flex items-start gap-2 mb-3">
              <Lightbulb
                className="shrink-0 mt-0.5 opacity-90"
                size={16}
                aria-hidden
                style={{ color: 'var(--accent-primary)' }}
              />
              <div>
                <h3 className="text-xs font-semibold sm:text-sm" style={{ color: 'var(--text-primary)' }}>
                  Why this score?
                </h3>
                <p className="text-xs mt-1 leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {scoreJustification.why_this_score}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-1 flex-1">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--accent-success)' }}
                >
                  Key strengths
                </p>
                <ul
                  className="text-[11px] sm:text-xs space-y-1.5 list-none pl-0"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {strengths.map((strength, i) => (
                    <li key={`${strength}-${i}`} className="flex gap-2">
                      <span className="tabular-nums" style={{ color: 'var(--text-muted)' }} aria-hidden>
                        •
                      </span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide mb-2"
                  style={{ color: 'var(--accent-warning)' }}
                >
                  Areas to improve
                </p>
                <ul
                  className="text-[11px] sm:text-xs space-y-1.5 list-none pl-0"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {improvements.map((area, i) => (
                    <li key={`${area}-${i}`} className="flex gap-2">
                      <span className="tabular-nums" style={{ color: 'var(--text-muted)' }} aria-hidden>
                        •
                      </span>
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
