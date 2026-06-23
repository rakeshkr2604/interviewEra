'use client'

import { useAgenticLearning } from '@/components/blog/agentic/AgenticHubLearningContext'
import { AGENTIC_PARTS } from '@/lib/seo/blog/agentic-ai-hub-parts'

export function AgenticHubCourseProgress() {
  const { partIndex, totalParts, chapterIndex, totalChapters, completionPct, completedIds } =
    useAgenticLearning()

  const part = AGENTIC_PARTS[partIndex - 1]
  const partDone = part
    ? part.chapterIds.filter((id) => completedIds.has(id)).length
    : 0
  const partTotal = part?.chapterIds.length ?? 0
  const partPct = partTotal > 0 ? Math.round((partDone / partTotal) * 100) : 0

  return (
    <div className="ie-agentic-course-progress" aria-label="Course progress">
      <div className="ie-agentic-course-progress__row">
        <span className="ie-agentic-course-progress__label">Course progress</span>
        <span className="ie-agentic-course-progress__pct">{completionPct}%</span>
      </div>
      <div
        className="ie-agentic-course-progress__bar"
        role="progressbar"
        aria-valuenow={completionPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="ie-agentic-course-progress__fill" style={{ width: `${completionPct}%` }} />
      </div>
      <div className="ie-agentic-course-progress__meta">
        <span>
          Part {partIndex} of {totalParts}
          {part ? ` · ${part.subtitle}` : ''}
        </span>
        <span>
          Chapter {chapterIndex} of {totalChapters}
        </span>
      </div>
      {part ? (
        <div className="ie-agentic-course-progress__part-bar" aria-hidden>
          <div className="ie-agentic-course-progress__part-fill" style={{ width: `${partPct}%` }} />
        </div>
      ) : null}
    </div>
  )
}
