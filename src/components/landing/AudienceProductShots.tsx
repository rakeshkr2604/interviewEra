import { ProductPreviewFrame } from '@/components/product-preview/ProductPreviewFrame';

/** Compact product UI shot for Students audience cards. */
export function StudentsProductShot() {
  return (
    <ProductPreviewFrame
      label="Student mock interview report preview with five scoring dimensions"
    >
      <div className="min-h-[13rem] bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--card-bg))] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Live session
            </p>
            <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Frontend Intern · Meera
            </p>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)',
              color: 'var(--accent-success)',
            }}
          >
            Scoring
          </span>
        </div>

        <div
          className="mt-3 rounded-xl border p-3"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
          }}
        >
          <div className="flex items-end justify-between gap-2">
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Overall
            </p>
            <p
              className="font-[family-name:var(--font-jetbrains)] text-xl font-bold leading-none tabular-nums"
              style={{ color: 'var(--accent-primary)' }}
            >
              7.6
            </p>
          </div>
          <div className="mt-2 space-y-1.5">
            {(
              [
                { label: 'Communication', pct: 82 },
                { label: 'Structure', pct: 74 },
                { label: 'Technical', pct: 68 },
              ] as const
            ).map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {row.pct}%
                  </span>
                </div>
                <div
                  className="mt-0.5 h-1 overflow-hidden rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--card-border) 70%, transparent)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${row.pct}%`,
                      background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-hover))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProductPreviewFrame>
  );
}

/** Compact product UI shot for Colleges / campus workspace cards. */
export function CollegesProductShot() {
  return (
    <ProductPreviewFrame
      label="Campus T&P dashboard preview with batch readiness and student analytics"
    >
      <div className="min-h-[13rem] bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--card-bg))] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Campus workspace
            </p>
            <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Placement batch · CSE 2026
            </p>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            Live
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {(
            [
              { label: 'Students', value: '248' },
              { label: 'Mocks', value: '1.2k' },
              { label: 'Ready', value: '64%' },
            ] as const
          ).map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border px-1.5 py-2.5 text-center"
              style={{
                borderColor: 'var(--card-border)',
                background: 'var(--card-bg)',
              }}
            >
              <p
                className="font-[family-name:var(--font-jetbrains)] text-sm font-bold tabular-nums"
                style={{ color: 'var(--text-primary)' }}
              >
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-2.5 rounded-xl border px-3 py-2.5"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
          }}
        >
          <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Batch readiness
          </p>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full"
            style={{ background: 'color-mix(in srgb, var(--card-border) 70%, transparent)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: '64%',
                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-hover))',
              }}
            />
          </div>
          <p className="mt-1.5 text-[10px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
            Weak spots roll up by student — T&P intervenes on data.
          </p>
        </div>
      </div>
    </ProductPreviewFrame>
  );
}

/** Compact product UI shot for Hiring Teams / recruiting evaluation cards. */
export function HiringTeamsProductShot() {
  return (
    <ProductPreviewFrame
      label="Hiring team candidate evaluation preview with consistent rubric scores"
    >
      <div className="min-h-[13rem] bg-[color-mix(in_srgb,var(--bg-secondary)_55%,var(--card-bg))] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Candidate eval
            </p>
            <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              SDE Intern · Round 2
            </p>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            Review
          </span>
        </div>

        <div
          className="mt-3 space-y-2 rounded-xl border p-3"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
          }}
        >
          {(
            [
              { name: 'A. Sharma', score: '8.2', signal: 'Strong' },
              { name: 'R. Patel', score: '7.1', signal: 'Pass' },
              { name: 'M. Khan', score: '5.4', signal: 'Hold' },
            ] as const
          ).map((row) => (
            <div key={row.name} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {row.name}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Same rubric · 5 dimensions
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className="font-[family-name:var(--font-jetbrains)] text-sm font-bold tabular-nums"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  {row.score}
                </p>
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {row.signal}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-2 text-[10px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
          Score every candidate the same way — compare without interviewer bias.
        </p>
      </div>
    </ProductPreviewFrame>
  );
}
