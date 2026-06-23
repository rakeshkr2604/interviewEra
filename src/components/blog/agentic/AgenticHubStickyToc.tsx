'use client'

import { Check } from 'lucide-react'
import type { AgenticChapter } from '@/lib/seo/blog/agentic-ai-hub-chapters'
import { AGENTIC_PARTS } from '@/lib/seo/blog/agentic-ai-hub-parts'
import { AgenticHubCourseProgress } from '@/components/blog/agentic/AgenticHubCourseProgress'
import { AgenticHubJumpSearch } from '@/components/blog/agentic/AgenticHubJumpSearch'
import { useAgenticLearning } from '@/components/blog/agentic/AgenticHubLearningContext'

export function AgenticHubStickyToc({
  chapters,
  activeId,
}: {
  chapters: readonly AgenticChapter[]
  activeId: string
}) {
  const { isComplete } = useAgenticLearning()
  const chapterMap = new Map(chapters.map((c) => [c.id, c]))

  return (
    <nav
      className="ie-agentic-hub-sticky-toc hidden shrink-0 xl:block"
      aria-label="Table of contents"
    >
      <div className="ie-agentic-hub-sticky-toc__inner">
        <AgenticHubCourseProgress />
        <div className="ie-agentic-hub-sticky-toc__search">
          <AgenticHubJumpSearch />
        </div>
        <p className="ie-agentic-hub-sticky-toc__label">Course outline</p>
        {AGENTIC_PARTS.map((part, pi) => (
          <div key={part.id} className="ie-agentic-hub-sticky-toc__part">
            <p className="ie-agentic-hub-sticky-toc__part-title">
              <a href={`#part-${part.id}`} className="ie-agentic-hub-sticky-toc__part-link">
                Part {pi + 1}
              </a>
            </p>
            <ol className="ie-agentic-hub-sticky-toc__list" role="list">
              {part.chapterIds.map((chapterId) => {
                const chapter = chapterMap.get(chapterId)
                if (!chapter) return null
                const isActive = chapter.id === activeId
                const done = isComplete(chapter.id)
                return (
                  <li key={chapter.id}>
                    <a
                      href={`#${chapter.id}`}
                      className={`ie-agentic-hub-sticky-toc__link${isActive ? ' is-active' : ''}${done ? ' is-complete' : ''}`}
                      aria-current={isActive ? 'location' : undefined}
                    >
                      <span className="ie-agentic-hub-sticky-toc__link-row">
                        {done ? (
                          <Check className="ie-agentic-hub-sticky-toc__check size-3.5 shrink-0" aria-hidden />
                        ) : (
                          <span className="ie-agentic-hub-sticky-toc__dot" aria-hidden />
                        )}
                        <span className="ie-agentic-hub-sticky-toc__link-label">{chapter.label}</span>
                      </span>
                      <span className="ie-agentic-hub-sticky-toc__link-time">{chapter.readTime}</span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>
    </nav>
  )
}
