'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronUp, Link2, Linkedin, Share2 } from 'lucide-react'
import { BlogReadingProgress } from '@/components/blog/design-system/BlogReadingProgress'
import { BlogStickyToc } from '@/components/blog/design-system/BlogStickyToc'
import { BlogMobileToc } from '@/components/blog/design-system/BlogMobileToc'
import type { BlogTocSection } from '@/components/blog/design-system/types'
import { cn } from '@/lib/utils'

type BlogReadingShellProps = {
  children: React.ReactNode
  sections: readonly BlogTocSection[]
  /** Absolute or path URL used for share/copy */
  shareUrl: string
  shareTitle?: string
  readTime?: string
  /** CSS selector for headings observed for active TOC (default: article h2[id]) */
  headingSelector?: string
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function BlogReadingShell({
  children,
  sections,
  shareUrl,
  shareTitle = 'InterviewEra guide',
  readTime,
  headingSelector = 'article.ie-blog-prose h2[id]',
}: BlogReadingShellProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [copied, setCopied] = useState(false)
  const activeIdRef = useRef(activeId)
  const showBackToTopRef = useRef(showBackToTop)
  const rafScrollRef = useRef(0)

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useEffect(() => {
    showBackToTopRef.current = showBackToTop
  }, [showBackToTop])

  useEffect(() => {
    const updateBackToTop = () => {
      rafScrollRef.current = 0
      const next = document.documentElement.scrollTop > 480
      if (next !== showBackToTopRef.current) {
        showBackToTopRef.current = next
        setShowBackToTop(next)
      }
    }

    const onScrollOrResize = () => {
      if (rafScrollRef.current) return
      rafScrollRef.current = window.requestAnimationFrame(updateBackToTop)
    }

    // Defer initial sync — avoid setState synchronously in the effect body.
    rafScrollRef.current = window.requestAnimationFrame(updateBackToTop)
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
    return () => {
      if (rafScrollRef.current) window.cancelAnimationFrame(rafScrollRef.current)
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [])

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(headingSelector))
    if (!nodes.length) return

    // Single observer, one threshold — update only when the leading section changes.
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        const nextId = intersecting[0]?.target.id
        if (!nextId || nextId === activeIdRef.current) return
        activeIdRef.current = nextId
        setActiveId(nextId)
      },
      {
        // Narrow band near the top of the viewport — fewer callbacks, less flicker.
        rootMargin: '-20% 0px -65% 0px',
        threshold: 0,
      },
    )

    nodes.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [headingSelector, sections])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }

  const absoluteShareUrl =
    typeof window !== 'undefined' && shareUrl.startsWith('/')
      ? `${window.location.origin}${shareUrl}`
      : shareUrl

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(absoluteShareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) {
      await copyLink()
      return
    }
    try {
      await navigator.share({ title: shareTitle, url: absoluteShareUrl })
    } catch {
      /* user cancelled */
    }
  }

  const linkedInHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(absoluteShareUrl)}`

  return (
    <>
      <BlogReadingProgress />
      <BlogMobileToc sections={sections} activeId={activeId} />

      <div className="ie-blog-ds-layout">
        <BlogStickyToc sections={sections} activeId={activeId} />

        <div className="ie-blog-ds-main min-w-0">{children}</div>

        <aside className="ie-blog-ds-utilities hidden shrink-0 2xl:block" aria-label="Article utilities">
          <div className="ie-blog-ds-utilities__inner">
            {readTime ? <p className="ie-blog-ds-utilities__meta">{readTime}</p> : null}
            <p className="ie-blog-ds-utilities__label">Share</p>
            <div className="ie-blog-ds-utilities__actions">
              <button type="button" className="ie-blog-ds-util-btn" onClick={nativeShare} aria-label="Share article">
                <Share2 className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="ie-blog-ds-util-btn"
                onClick={copyLink}
                aria-label={copied ? 'Link copied' : 'Copy link'}
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
              </button>
              <a
                href={linkedInHref}
                target="_blank"
                rel="noopener noreferrer"
                className="ie-blog-ds-util-btn"
                aria-label="Share on LinkedIn"
              >
                <Linkedin className="size-4" aria-hidden />
              </a>
            </div>
          </div>
        </aside>
      </div>

      <button
        type="button"
        onClick={scrollToTop}
        className={cn(
          'ie-blog-ds-back-top fixed bottom-6 right-4 z-[64] flex size-11 items-center justify-center rounded-full border shadow-md transition-[opacity,transform] duration-200 sm:bottom-8 sm:right-6',
          showBackToTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
        )}
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
