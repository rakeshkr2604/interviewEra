'use client'

import type { InterviewDifficulty } from '@/types/app.types'

const TOTAL_CHECKS = 5

const DIFFICULTY_BARS: Record<InterviewDifficulty, [number, number, number]> = {
  easy: [32, 44, 36],
  medium: [52, 68, 58],
  hard: [78, 92, 85],
}

type Props = {
  difficulty: InterviewDifficulty
  checkedCount: number
  className?: string
}

export function BriefingSessionViz({ difficulty, checkedCount, className = '' }: Props) {
  const bars = DIFFICULTY_BARS[difficulty]
  const pct = Math.round((checkedCount / TOTAL_CHECKS) * 100)
  const r = 36
  const c = 2 * Math.PI * r
  const dashOffset = c * (1 - pct / 100)

  return (
    <div
      role="img"
      aria-label={`Session preview: ${pct} percent environment readiness, ${difficulty} difficulty`}
      className={`flex flex-1 flex-col justify-between rounded-2xl border border-(--card-border)
                  bg-(--bg-secondary) p-4 sm:p-5 ${className}`}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-(--text-secondary)">
          Session preview
        </p>
        <p className="mt-1 text-xs text-(--text-muted)">
          Readiness vs. question intensity for this run
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <div className="relative h-[92px] w-[92px] shrink-0">
          <svg className="-rotate-90" width="92" height="92" viewBox="0 0 92 92" aria-hidden>
            <circle
              cx="46"
              cy="46"
              r={r}
              fill="none"
              className="stroke-(--card-border)"
              strokeWidth="8"
            />
            <circle
              cx="46"
              cy="46"
              r={r}
              fill="none"
              className="stroke-(--accent-primary) transition-[stroke-dashoffset] duration-300"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold tabular-nums text-(--text-primary)">{pct}%</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-(--text-muted)">
              ready
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium text-(--text-secondary)">Environment checks</p>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_CHECKS }, (_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors duration-200 ${
                  i < checkedCount
                    ? 'bg-(--accent-success)'
                    : 'bg-(--bg-tertiary)'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-(--text-muted)">
            {checkedCount}/{TOTAL_CHECKS} completed — finish the checklist on the right to start
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-(--card-border) pt-4">
        <p className="mb-3 text-xs font-medium text-(--text-secondary)">
          Question intensity ({difficulty})
        </p>
        <div className="flex h-[5.5rem] items-end justify-center gap-3 px-2">
          {bars.map((h, i) => (
            <div key={i} className="flex h-full min-h-0 flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full max-w-[2.5rem] rounded-t-md bg-(--accent-primary)/30 transition-all duration-300"
                style={{ height: `${Math.max(10, Math.round((h / 100) * 72))}px` }}
              />
              <span className="text-[10px] text-(--text-muted)">Q{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-xl bg-(--bg-tertiary)/60 px-2 py-2.5 text-[11px] text-(--text-secondary) sm:justify-between sm:px-3">
        <span className="flex items-center gap-1.5">
          <span className="text-sm" aria-hidden>
            🎙️
          </span>
          Speak
        </span>
        <span className="text-(--text-muted)">→</span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm" aria-hidden>
            💬
          </span>
          6–8 Qs
        </span>
        <span className="text-(--text-muted)">→</span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm" aria-hidden>
            ✨
          </span>
          AI tips
        </span>
        <span className="text-(--text-muted)">→</span>
        <span className="flex items-center gap-1.5">
          <span className="text-sm" aria-hidden>
            📊
          </span>
          Report
        </span>
      </div>
    </div>
  )
}
