'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { AgenticHubKeyTakeaways } from '@/components/blog/agentic/AgenticHubKeyTakeaways'
import { AgenticHubRelatedGuides } from '@/components/blog/agentic/AgenticHubRelatedGuides'
import { useAgenticLearning } from '@/components/blog/agentic/AgenticHubLearningContext'
import { getAgenticChapterNeighbors } from '@/lib/seo/blog/agentic-ai-hub-chapters'
import {
  AGENTIC_CHAPTER_DIFFICULTY,
  getChapterIndex,
  type AgenticDifficulty,
} from '@/lib/seo/blog/agentic-ai-hub-parts'
import { getRelatedGuidesForChapter } from '@/lib/seo/blog/agentic-ai-hub-related'

const DIFFICULTY_CLASS: Record<AgenticDifficulty, string> = {
  Beginner: 'ie-agentic-badge--beginner',
  Intermediate: 'ie-agentic-badge--intermediate',
  Advanced: 'ie-agentic-badge--advanced',
}

export function AgenticHubSection({
  id,
  title,
  readTime,
  takeaways,
  children,
  showRelated = true,
}: {
  id: string
  title: string
  readTime: string
  takeaways: readonly string[]
  children: React.ReactNode
  showRelated?: boolean
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const markedRef = useRef(false)
  const { isComplete, markComplete } = useAgenticLearning()
  const { prev, next } = getAgenticChapterNeighbors(id)
  const chapterNum = getChapterIndex(id)
  const difficulty = AGENTIC_CHAPTER_DIFFICULTY[id] ?? 'Beginner'
  const complete = isComplete(id)
  const related = showRelated ? getRelatedGuidesForChapter(id) : []

  useEffect(() => {
    const el = sectionRef.current
    if (!el || complete) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry || markedRef.current) return
        if (entry.intersectionRatio < 0.15 && entry.boundingClientRect.top < 0) {
          markedRef.current = true
          markComplete(id)
        }
      },
      { threshold: [0, 0.15, 0.5] },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [id, complete, markComplete])

  const continueNext = () => {
    markComplete(id)
    if (next) {
      const target = document.getElementById(next.id)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section
      ref={sectionRef}
      id={id}
      data-agentic-section
      data-chapter-complete={complete ? 'true' : 'false'}
      className="ie-agentic-hub-section scroll-mt-24"
      aria-labelledby={`${id}-heading`}
    >
      <div className="ie-agentic-hub-section__header">
        <div className="ie-agentic-hub-section__title-row">
          {complete ? (
            <span className="ie-agentic-hub-section__complete" aria-label="Chapter complete">
              <Check className="size-4" aria-hidden />
            </span>
          ) : null}
          <h2 id={`${id}-heading`} className="ie-agentic-hub-section__title">
            {title}
          </h2>
        </div>
        <div className="ie-agentic-hub-section__badges">
          <span className="ie-agentic-hub-section__chapter-num">Ch. {chapterNum}</span>
          <span className={`ie-agentic-hub-section__difficulty ${DIFFICULTY_CLASS[difficulty]}`}>
            {difficulty}
          </span>
          <span className="ie-agentic-hub-section__time">{readTime}</span>
        </div>
      </div>
      {children}
      <AgenticHubKeyTakeaways items={takeaways} />
      {related.length > 0 ? <AgenticHubRelatedGuides guides={related} /> : null}
      {!complete ? (
        <button type="button" className="ie-agentic-hub-section__mark-read" onClick={() => markComplete(id)}>
          <Check className="size-3.5" aria-hidden />
          Mark chapter complete
        </button>
      ) : null}
      <nav className="ie-agentic-hub-section-nav" aria-label={`Navigate ${title}`}>
        {prev ? (
          <Link href={`#${prev.id}`} className="ie-agentic-hub-section-nav__link">
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            <span>
              <span className="ie-agentic-hub-section-nav__label">Previous</span>
              <span className="ie-agentic-hub-section-nav__title">{prev.label}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <button
            type="button"
            onClick={continueNext}
            className="ie-agentic-hub-section-nav__link ie-agentic-hub-section-nav__link--next ie-agentic-hub-section-nav__link--continue"
          >
            <span>
              <span className="ie-agentic-hub-section-nav__label">Continue to next chapter</span>
              <span className="ie-agentic-hub-section-nav__title">{next.label}</span>
            </span>
            <ChevronRight className="size-4 shrink-0" aria-hidden />
          </button>
        ) : (
          <span />
        )}
      </nav>
    </section>
  )
}
