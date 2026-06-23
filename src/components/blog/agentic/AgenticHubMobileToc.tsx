'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { AgenticChapter } from '@/lib/seo/blog/agentic-ai-hub-chapters'
import { AGENTIC_PARTS } from '@/lib/seo/blog/agentic-ai-hub-parts'
import { useAgenticLearning } from '@/components/blog/agentic/AgenticHubLearningContext'

export function AgenticHubMobileToc({
  chapters,
  activeId,
}: {
  chapters: readonly AgenticChapter[]
  activeId: string
}) {
  const [open, setOpen] = useState(false)
  const { isComplete } = useAgenticLearning()
  const active = chapters.find((c) => c.id === activeId)
  const chapterMap = new Map(chapters.map((c) => [c.id, c]))

  return (
    <div className="ie-agentic-hub-mobile-toc xl:hidden">
      <button
        type="button"
        className="ie-agentic-hub-mobile-toc__trigger"
        aria-expanded={open}
        aria-controls="agentic-mobile-toc-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-left">
          <span className="block text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            Course outline
          </span>
          <span className="mt-0.5 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {active?.label ?? 'Jump to section'}
          </span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          style={{ color: 'var(--accent-primary)' }}
          aria-hidden
        />
      </button>
      <div
        id="agentic-mobile-toc-panel"
        className={`ie-agentic-hub-mobile-toc__panel${open ? ' is-open' : ''}`}
        hidden={!open}
      >
        {AGENTIC_PARTS.map((part, pi) => (
          <div key={part.id} className="ie-agentic-hub-mobile-toc__part">
            <p className="ie-agentic-hub-mobile-toc__part-label">Part {pi + 1} — {part.subtitle}</p>
            <ol className="m-0 list-none space-y-1 p-0" role="list">
              {part.chapterIds.map((chapterId) => {
                const chapter = chapterMap.get(chapterId)
                if (!chapter) return null
                const done = isComplete(chapter.id)
                return (
                  <li key={chapter.id}>
                    <a
                      href={`#${chapter.id}`}
                      className={`ie-agentic-hub-mobile-toc__link${chapter.id === activeId ? ' is-active' : ''}${done ? ' is-complete' : ''}`}
                      aria-current={chapter.id === activeId ? 'location' : undefined}
                      onClick={() => setOpen(false)}
                    >
                      <span className="flex items-center gap-1.5">
                        {done ? <Check className="size-3.5 shrink-0 text-emerald-600" aria-hidden /> : null}
                        <span>{chapter.label}</span>
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {chapter.readTime}
                      </span>
                    </a>
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>
    </div>
  )
}
