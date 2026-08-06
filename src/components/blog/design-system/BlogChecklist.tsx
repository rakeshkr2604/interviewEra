'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BlogChecklistItem } from '@/components/blog/design-system/types'
import { cn } from '@/lib/utils'

type BlogChecklistProps = {
  title: string
  items: readonly BlogChecklistItem[]
  storageKey?: string
}

export function BlogChecklist({ title, items, storageKey }: BlogChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Defer localStorage read past the effect body to satisfy React purity lint
    // and avoid cascading renders during hydration.
    const t = window.setTimeout(() => {
      if (cancelled) return
      if (storageKey) {
        try {
          const raw = window.localStorage.getItem(storageKey)
          if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>)
        } catch {
          /* ignore */
        }
      }
      setHydrated(true)
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [storageKey])

  const completed = useMemo(
    () => items.reduce((count, item) => count + (checked[item.id] ? 1 : 0), 0),
    [checked, items],
  )
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      if (storageKey) {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
          /* ignore quota */
        }
      }
      return next
    })
  }

  return (
    <section className="ie-blog-ds-checklist" aria-label={title} data-hydrated={hydrated ? 'true' : 'false'}>
      <div className="ie-blog-ds-checklist__head">
        <h3 className="ie-blog-ds-checklist__title">{title}</h3>
        <p className="ie-blog-ds-checklist__progress" aria-live="polite">
          {completed}/{items.length} · {pct}%
        </p>
      </div>
      <div
        className="ie-blog-ds-checklist__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${title} completion`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <ul className="ie-blog-ds-checklist__list">
        {items.map((item) => {
          const isOn = Boolean(checked[item.id])
          return (
            <li key={item.id}>
              <label className={cn('ie-blog-ds-checklist__row', isOn && 'is-complete')}>
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(item.id)}
                  className="ie-blog-ds-checklist__input"
                />
                <span className="ie-blog-ds-checklist__label">{item.label}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
