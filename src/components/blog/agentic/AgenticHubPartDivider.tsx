'use client'

import { useAgenticLearning } from '@/components/blog/agentic/AgenticHubLearningContext'
import { AGENTIC_PARTS, type AgenticPart } from '@/lib/seo/blog/agentic-ai-hub-parts'

export function AgenticHubPartDivider({
  part,
  partIndex,
}: {
  part: AgenticPart
  partIndex: number
}) {
  const { completedIds } = useAgenticLearning()
  const done = part.chapterIds.filter((id) => completedIds.has(id)).length
  const total = part.chapterIds.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="ie-agentic-part-divider" id={`part-${part.id}`} data-agentic-part={part.id}>
      <div className="ie-agentic-part-divider__badge">
        Part {partIndex + 1} of {AGENTIC_PARTS.length}
      </div>
      <h2 className="ie-agentic-part-divider__title">{part.title}</h2>
      <p className="ie-agentic-part-divider__subtitle">{part.subtitle}</p>
      <p className="ie-agentic-part-divider__intro">{part.intro}</p>
      <div
        className="ie-agentic-part-divider__progress"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${done} of ${total} chapters complete in this part`}
      >
        <div className="ie-agentic-part-divider__progress-track">
          <div className="ie-agentic-part-divider__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="ie-agentic-part-divider__progress-label">
          {done}/{total} chapters · {pct}%
        </span>
      </div>
    </div>
  )
}
