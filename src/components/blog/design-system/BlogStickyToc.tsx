'use client'

import { memo, useEffect, useRef } from 'react'
import type { BlogTocSection } from '@/components/blog/design-system/types'
import { cn } from '@/lib/utils'

type BlogStickyTocProps = {
  sections: readonly BlogTocSection[]
  activeId: string
  label?: string
}

function scrollActiveLinkInTocNav(nav: HTMLElement, link: HTMLAnchorElement) {
  const navRect = nav.getBoundingClientRect()
  const linkRect = link.getBoundingClientRect()
  const pad = 12
  if (linkRect.top >= navRect.top + pad && linkRect.bottom <= navRect.bottom - pad) {
    return
  }

  // Instant adjustment of the TOC scroller only — never element.scrollIntoView.
  const delta =
    linkRect.top < navRect.top + pad
      ? linkRect.top - navRect.top - pad
      : linkRect.bottom - navRect.bottom + pad
  nav.scrollTop += delta
}

function BlogStickyTocComponent({
  sections,
  activeId,
  label = 'On this page',
}: BlogStickyTocProps) {
  const navRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const nav = navRef.current
    if (!nav || !activeId) return
    const link = nav.querySelector<HTMLAnchorElement>(`a[href="#${CSS.escape(activeId)}"]`)
    if (!link) return
    scrollActiveLinkInTocNav(nav, link)
  }, [activeId])

  return (
    <nav
      ref={navRef}
      className="ie-blog-ds-sticky-toc hidden shrink-0 xl:block"
      aria-label="Table of contents"
    >
      <div className="ie-blog-ds-sticky-toc__inner">
        <p className="ie-blog-ds-sticky-toc__label">{label}</p>
        <ol className="ie-blog-ds-sticky-toc__list" role="list">
          {sections.map((section) => {
            const isActive = section.id === activeId
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn('ie-blog-ds-sticky-toc__link', isActive && 'is-active')}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={(event) => {
                    const target = document.getElementById(section.id)
                    if (!target) return
                    event.preventDefault()
                    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                    target.scrollIntoView({
                      block: 'start',
                      behavior: reduce ? 'auto' : 'smooth',
                    })
                    window.history.replaceState(null, '', `#${section.id}`)
                  }}
                >
                  <span className="ie-blog-ds-sticky-toc__dot" aria-hidden />
                  <span className="ie-blog-ds-sticky-toc__text">{section.label}</span>
                </a>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}

export const BlogStickyToc = memo(BlogStickyTocComponent)
