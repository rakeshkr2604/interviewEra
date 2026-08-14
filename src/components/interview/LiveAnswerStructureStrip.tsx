'use client'

/**
 * Compact provisional answer-structure guide shown while the candidate speaks.
 * Estimate only — driven by finalized STT text via a pure local detector.
 * Never shows "missing"/"complete"/scores; undetected = neutral "not yet".
 */

import {
  presentLiveAnswerStructure,
  type LiveAnswerStructure,
} from '@/lib/interview/live-answer-structure'

type Props = {
  structure: LiveAnswerStructure
}

export function LiveAnswerStructureStrip({ structure }: Props) {
  const presented = presentLiveAnswerStructure(structure)

  return (
    <div
      className="shrink-0 rounded-xl border border-(--card-border)/60 bg-(--bg-secondary)/40 px-3.5 py-2.5"
      role="status"
      aria-live="off"
      aria-label="Provisional answer structure guide"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted)">
          Answer structure
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {presented.map((section) => {
            const completed = section.presentation === 'completed'
            const isNext = section.presentation === 'next'
            const title =
              completed
                ? `${section.label} detected`
                : isNext
                  ? `${section.label} — cover next`
                  : `${section.label} — not detected yet`
            return (
              <span
                key={section.id}
                className={`inline-flex items-center gap-1 text-xs ${
                  completed
                    ? 'font-medium text-(--text-primary)'
                    : isNext
                      ? 'font-medium text-(--text-primary)'
                      : 'text-(--text-muted)'
                }`}
                title={title}
              >
                <span
                  aria-hidden
                  className={
                    completed
                      ? 'text-(--accent-success)'
                      : isNext
                        ? 'text-(--accent-primary)'
                        : 'text-(--text-muted)'
                  }
                >
                  {completed ? '✓' : isNext ? '→' : '·'}
                </span>
                {section.label}
              </span>
            )
          })}
        </div>
        <p className="text-[10px] text-(--text-muted)">live estimate</p>
      </div>
    </div>
  )
}
