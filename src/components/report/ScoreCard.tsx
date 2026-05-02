interface ScoreCardProps {
  overallScore: number;
  role: string;
  completedAt: string;
}

export function ScoreCard({ overallScore, role, completedAt }: ScoreCardProps) {
  const scoreColor =
    overallScore >= 7
      ? 'var(--accent-success)'
      : overallScore >= 5
        ? 'var(--accent-warning)'
        : 'var(--accent-danger)';

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
      <div className="mt-4 flex-1">
        <div className="text-5xl font-bold tabular-nums" style={{ color: scoreColor }}>
          {overallScore.toFixed(1)}
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          out of 10
        </p>
        <div className="mt-4 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
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
      </div>
    </div>
  );
}
