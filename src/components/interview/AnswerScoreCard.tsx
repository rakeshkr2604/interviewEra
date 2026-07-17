'use client'

/**
 * Per-answer 5-dimension score card (score-v1, v2.1 review popup).
 * Rubric: Relevance · Content Accuracy · Communication Clarity · Structure ·
 * Specificity. `overall` is the application-computed weighted mean.
 *
 * States: loading (skeleton) → score (rendered) | unavailable (explicit
 * message — never a fabricated neutral score).
 *
 * Bottom half: tap a dimension to read its scoring note ("Why this score") —
 * fills the otherwise empty right-column space with actionable detail.
 */

import { useMemo, useState } from 'react'

export type AnswerDimensionScore = {
  /** 0–10 in steps of 0.5 (validated server-side). */
  score: number
  /** One-line reason tied to the transcript. */
  note?: string
}

export type AnswerScore = {
  overall: number
  one_line_summary?: string
  dimensions: {
    relevance: AnswerDimensionScore
    content_accuracy: AnswerDimensionScore
    communication_clarity: AnswerDimensionScore
    structure: AnswerDimensionScore
    specificity: AnswerDimensionScore
  }
}

type DimensionKey = keyof AnswerScore['dimensions']

const DIMENSIONS: Array<{ key: DimensionKey; label: string }> = [
  { key: 'communication_clarity', label: 'Communication Clarity' },
  { key: 'content_accuracy', label: 'Content Accuracy' },
  { key: 'structure', label: 'Answer Structure' },
  { key: 'specificity', label: 'Specificity' },
  { key: 'relevance', label: 'Relevance' },
]

function barColor(v: number): string {
  if (v < 5.5) return 'var(--accent-error, #dc2626)'
  if (v < 7) return 'var(--accent-warning, #d97706)'
  return 'var(--accent-primary)'
}

function weakestDimensionKey(score: AnswerScore): DimensionKey {
  let weakest: DimensionKey = DIMENSIONS[0]!.key
  let min = Number.POSITIVE_INFINITY
  for (const { key } of DIMENSIONS) {
    const v = score.dimensions[key].score
    if (v < min) {
      min = v
      weakest = key
    }
  }
  return weakest
}

export function AnswerScoreCard({
  score,
  loading,
}: {
  score: AnswerScore | null
  loading: boolean
}) {
  const [selectedKey, setSelectedKey] = useState<DimensionKey | null>(null)
  const [scoreIdentity, setScoreIdentity] = useState<AnswerScore | null>(null)

  // New score object → default to weakest dimension (fills empty bottom usefully).
  if (score !== scoreIdentity) {
    setScoreIdentity(score)
    setSelectedKey(score ? weakestDimensionKey(score) : null)
  }

  const activeKey = selectedKey ?? (score ? weakestDimensionKey(score) : null)

  const selected = useMemo(() => {
    if (!score || !activeKey) return null
    const meta = DIMENSIONS.find((d) => d.key === activeKey)
    if (!meta) return null
    return {
      key: activeKey,
      label: meta.label,
      score: score.dimensions[activeKey].score,
      note: score.dimensions[activeKey].note?.trim() || null,
    }
  }, [score, activeKey])

  const focusAreas = useMemo(() => {
    if (!score) return [] as Array<{ key: DimensionKey; label: string; score: number }>
    return DIMENSIONS
      .map(({ key, label }) => ({
        key,
        label,
        score: score.dimensions[key].score,
      }))
      .filter((d) => d.score < 7)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
  }, [score])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-(--card-border) bg-(--card-bg) p-4 sm:p-5">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--accent-primary)">
          5-dimensional feedback · this question
        </p>
        {score ? (
          <p className="font-serif text-2xl italic leading-none text-(--accent-primary)">
            {score.overall.toFixed(1)}
            <span className="text-sm not-italic text-(--text-muted)">/10</span>
          </p>
        ) : null}
      </div>

      {score ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          {/* Dimension bars — tap to inspect the scoring note below */}
          <div className="shrink-0 space-y-0.5">
            {DIMENSIONS.map(({ key, label }) => {
              const dim = score.dimensions[key]
              const isSelected = activeKey === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`w-full rounded-md px-2 py-1 text-left transition-colors touch-manipulation ${
                    isSelected
                      ? 'bg-(--accent-primary)/10 ring-1 ring-(--accent-primary)/30'
                      : 'hover:bg-(--bg-secondary)'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${label}: ${dim.score.toFixed(1)} out of 10. Show why.`}
                >
                  <div className="mb-0.5 flex items-baseline justify-between gap-2">
                    <p className="text-[12px] font-medium text-(--text-primary)">{label}</p>
                    <p className="text-[13px] font-semibold tabular-nums text-(--text-primary)">
                      {dim.score.toFixed(1)}
                    </p>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-(--bg-tertiary)">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${Math.max(0, Math.min(10, dim.score)) * 10}%`,
                        background: barColor(dim.score),
                      }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          {score.one_line_summary && (
            <p className="shrink-0 text-[12px] leading-snug text-(--text-secondary)">
              <span className="font-semibold text-(--text-primary)">Next step: </span>
              {score.one_line_summary}
            </p>
          )}

          {/* Fills the empty bottom of the right column */}
          <div className="mt-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-(--card-border)/70 bg-(--bg-secondary)/50 px-3 py-2.5">
            <p className="mb-1.5 shrink-0 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
              Why this score
              {selected ? (
                <span className="ml-1.5 normal-case tracking-normal text-(--accent-primary)">
                  · {selected.label}
                </span>
              ) : null}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
              {selected?.note ? (
                <p className="text-[13px] leading-relaxed text-(--text-primary)">
                  {selected.note}
                </p>
              ) : (
                <p className="text-[12px] text-(--text-muted)">
                  Tap a dimension above to see why it scored that way.
                </p>
              )}

              {focusAreas.length > 0 && (
                <div className="mt-3 border-t border-(--card-border)/60 pt-2.5">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
                    Focus next time
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {focusAreas.map((d) => (
                      <li key={d.key}>
                        <button
                          type="button"
                          onClick={() => setSelectedKey(d.key)}
                          className="flex w-full items-baseline justify-between gap-2 rounded-md px-1 py-0.5 text-left text-[12px] touch-manipulation hover:bg-(--card-bg)"
                        >
                          <span className="text-(--text-secondary)">
                            {d.key === activeKey ? '→ ' : ''}
                            {d.label}
                          </span>
                          <span
                            className="tabular-nums font-semibold"
                            style={{ color: barColor(d.score) }}
                          >
                            {d.score.toFixed(1)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-3" aria-live="polite">
          {DIMENSIONS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <p className="w-40 shrink-0 text-[12px] text-(--text-muted)">{label}</p>
              <div className="h-1.5 flex-1 animate-pulse rounded-full bg-(--bg-tertiary)" />
            </div>
          ))}
          <p className="mt-1 text-[11px] text-(--text-muted)">Scoring your answer…</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <p className="text-sm text-(--text-muted)">Score unavailable for this answer.</p>
        </div>
      )}
    </div>
  )
}
