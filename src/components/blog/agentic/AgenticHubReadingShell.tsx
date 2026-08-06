'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronUp } from 'lucide-react'
import { AiMockBlogReadingProgress } from '@/components/blog/AiMockBlogReadingProgress'
import { AgenticHubCourseProgress } from '@/components/blog/agentic/AgenticHubCourseProgress'
import {
  AgenticHubLearningProvider,
  useAgenticLearning,
} from '@/components/blog/agentic/AgenticHubLearningContext'
import { AgenticHubMobileToc } from '@/components/blog/agentic/AgenticHubMobileToc'
import { AgenticHubStickyToc } from '@/components/blog/agentic/AgenticHubStickyToc'
import { AGENTIC_CHAPTERS } from '@/lib/seo/blog/agentic-ai-hub-chapters'

function AgenticHubReadingShellInner({ children }: { children: React.ReactNode }) {
  const { activeId, setActiveId } = useAgenticLearning()
  const [showFloatingCta, setShowFloatingCta] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const activeIdRef = useRef(activeId)

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const updateScrollUi = useCallback(() => {
    const { documentElement } = document
    const nextBack = documentElement.scrollTop > 480
    const scrollable = documentElement.scrollHeight - documentElement.clientHeight
    const ratio = scrollable > 0 ? documentElement.scrollTop / scrollable : 0
    const nextCta = ratio >= 0.3
    setShowBackToTop((prev) => (prev === nextBack ? prev : nextBack))
    setShowFloatingCta((prev) => (prev === nextCta ? prev : nextCta))
  }, [])

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        updateScrollUi()
      })
    }
    // Defer initial sync so we don't setState synchronously inside the effect body.
    raf = window.requestAnimationFrame(() => {
      raf = 0
      updateScrollUi()
    })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [updateScrollUi])

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-agentic-section]')
    if (!sections.length) return

    observerRef.current?.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const id = visible[0]?.target.id
        if (!id || id === activeIdRef.current) return
        activeIdRef.current = id
        setActiveId(id)
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
    )

    sections.forEach((el) => observerRef.current?.observe(el))
    return () => observerRef.current?.disconnect()
  }, [setActiveId])

  const scrollToTop = () => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <>
      <AiMockBlogReadingProgress />
      <div className="ie-agentic-hub-course-progress-wrap">
        <AgenticHubCourseProgress />
      </div>
      <AgenticHubMobileToc chapters={AGENTIC_CHAPTERS} activeId={activeId} />

      <div className="ie-agentic-hub-layout mt-6 lg:mt-8">
        <AgenticHubStickyToc chapters={AGENTIC_CHAPTERS} activeId={activeId} />
        <div className="ie-agentic-hub-main ie-agentic-hub-main--with-cta min-w-0">{children}</div>
      </div>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[65] flex justify-center px-4 pb-4 sm:pb-6"
        aria-hidden={!showFloatingCta}
      >
        <Link
          href="/signup"
          className={`pointer-events-auto inline-flex max-w-md items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C47FF] sm:text-base ${
            showFloatingCta ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
            boxShadow: '0 12px 40px color-mix(in srgb, var(--accent-primary) 35%, transparent)',
          }}
          tabIndex={showFloatingCta ? 0 : -1}
          aria-label="Start AI mock interview"
        >
          Start AI Mock Interview
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        className={`fixed bottom-20 right-4 z-[64] flex size-11 items-center justify-center rounded-full border shadow-md transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C47FF] sm:bottom-24 sm:right-6 ${
          showBackToTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
          color: 'var(--accent-primary)',
        }}
        aria-label="Back to top"
        tabIndex={showBackToTop ? 0 : -1}
      >
        <ChevronUp className="size-5" aria-hidden />
      </button>
    </>
  )
}

export function AgenticHubReadingShell({ children }: { children: React.ReactNode }) {
  return (
    <AgenticHubLearningProvider initialActiveId={AGENTIC_CHAPTERS[0]!.id}>
      <AgenticHubReadingShellInner>{children}</AgenticHubReadingShellInner>
    </AgenticHubLearningProvider>
  )
}
