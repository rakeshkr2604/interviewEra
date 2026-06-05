'use client'

import { useEffect, useState } from 'react'

type TocSection = { id: string; label: string }

export function BaTableOfContents({ sections }: { sections: readonly TocSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const elements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length === 0) return

        const closest = visible.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        )[0]
        if (closest.target.id) setActiveId(closest.target.id)
      },
      { rootMargin: '-72px 0px -55% 0px', threshold: 0 },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  return (
    <details className="ie-blog-toc-compact ie-role-ba-toc" open>
      <summary className="ie-role-ba-toc__summary">On this page</summary>
      <nav aria-label="Table of contents">
        <ul className="ie-blog-toc-compact__list ie-role-ba-toc__list">
          {sections.map(({ id, label }) => {
            const isActive = activeId === id
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`ie-blog-inline-link ie-role-ba-toc__link${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'location' : undefined}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>
    </details>
  )
}
