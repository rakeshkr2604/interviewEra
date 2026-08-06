'use client'

import { memo, useId, useState } from 'react'
import type { BlogTocSection } from '@/components/blog/design-system/types'
import { cn } from '@/lib/utils'

type BlogMobileTocProps = {
  sections: readonly BlogTocSection[]
  activeId: string
}

function BlogMobileTocComponent({ sections, activeId }: BlogMobileTocProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const activeLabel = sections.find((s) => s.id === activeId)?.label ?? 'Jump to section'

  return (
    <div className="ie-blog-ds-mobile-toc xl:hidden">
      <button
        type="button"
        className="ie-blog-ds-mobile-toc__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ie-blog-ds-mobile-toc__eyebrow">On this page</span>
        <span className="ie-blog-ds-mobile-toc__current">{activeLabel}</span>
      </button>
      <div id={panelId} hidden={!open} className="ie-blog-ds-mobile-toc__panel">
        <ol className="ie-blog-ds-mobile-toc__list" role="list">
          {sections.map((section) => {
            const isActive = section.id === activeId
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn('ie-blog-ds-mobile-toc__link', isActive && 'is-active')}
                  aria-current={isActive ? 'location' : undefined}
                  onClick={(event) => {
                    const target = document.getElementById(section.id)
                    setOpen(false)
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
                  {section.label}
                </a>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

export const BlogMobileToc = memo(BlogMobileTocComponent)
