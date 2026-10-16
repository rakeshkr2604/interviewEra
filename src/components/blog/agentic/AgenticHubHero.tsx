'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BookOpen, Download, MessageSquare, Play } from 'lucide-react'

export function AgenticHubHero({
  category,
  titleLine,
  titleAccent,
  metaLine,
  updatedLabel,
  heroSrc,
  heroAlt,
}: {
  category: string
  titleLine: string
  titleAccent: string
  metaLine: string
  updatedLabel: string
  heroSrc: string
  heroAlt: string
}) {
  const handlePrint = () => {
    if (typeof window !== 'undefined') window.print()
  }

  return (
    <header className="ie-blog-editorial-header ie-agentic-hub-hero">
      <div className="ie-blog-interview-anxiety-content">
        <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
          {category}
        </p>
        <h1 className="ie-blog-article-h1">
          <span className="ie-blog-article-h1__line">{titleLine}</span>{' '}
          <span className="ie-blog-article-h1__accent">{titleAccent}</span>
        </h1>
        <div className="ie-blog-article-meta flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span>{metaLine}</span>
          <span aria-hidden>·</span>
          <span>{updatedLabel}</span>
        </div>
        <div className="ie-agentic-hub-hero__ctas">
          <a href="#what-is-agentic-ai-interview" className="ie-agentic-hub-hero__cta ie-agentic-hub-hero__cta--primary">
            <BookOpen className="size-4" aria-hidden />
            Read the Guide
          </a>
          <Link href="/signup" className="ie-agentic-hub-hero__cta ie-agentic-hub-hero__cta--accent">
            <Play className="size-4" aria-hidden />
            Start AI Mock Interview
          </Link>
          <Link href="/tools/question-generator" className="ie-agentic-hub-hero__cta">
            <MessageSquare className="size-4" aria-hidden />
            Practice Questions
          </Link>
          <button type="button" onClick={handlePrint} className="ie-agentic-hub-hero__cta">
            <Download className="size-4" aria-hidden />
            Save as PDF
          </button>
        </div>
      </div>
      <div className="ie-blog-editorial-hero">
        <Image src={heroSrc} alt={heroAlt} fill priority sizes="(max-width: 768px) 100vw, 920px" className="object-cover" />
      </div>
    </header>
  )
}
