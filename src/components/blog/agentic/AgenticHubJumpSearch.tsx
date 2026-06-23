'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { AGENTIC_CHAPTERS } from '@/lib/seo/blog/agentic-ai-hub-chapters'
import { AGENTIC_PARTS } from '@/lib/seo/blog/agentic-ai-hub-parts'
import { useAgenticLearning } from '@/components/blog/agentic/AgenticHubLearningContext'

type TocItem = {
  id: string
  label: string
  partTitle: string
}

function buildTocItems(): TocItem[] {
  const items: TocItem[] = []
  for (const part of AGENTIC_PARTS) {
    for (const chapterId of part.chapterIds) {
      const ch = AGENTIC_CHAPTERS.find((c) => c.id === chapterId)
      if (ch) items.push({ id: ch.id, label: ch.label, partTitle: part.title })
    }
  }
  return items
}

export function AgenticHubJumpSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const { setActiveId } = useAgenticLearning()
  const allItems = useMemo(() => buildTocItems(), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.partTitle.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q),
    )
  }, [query, allItems])

  const scrollTo = useCallback(
    (id: string) => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setActiveId(id)
      }
      setOpen(false)
      setQuery('')
    },
    [setActiveId],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const activeHighlight =
    filtered.length > 0 ? Math.min(highlight, filtered.length - 1) : 0

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && filtered[activeHighlight]) {
      e.preventDefault()
      scrollTo(filtered[activeHighlight]!.id)
    }
  }

  useEffect(() => {
    const li = listRef.current?.children[activeHighlight] as HTMLElement | undefined
    li?.scrollIntoView({ block: 'nearest' })
  }, [activeHighlight])

  return (
    <div className="ie-agentic-jump-search">
      <div className="ie-agentic-jump-search__trigger-wrap">
        <Search className="ie-agentic-jump-search__icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          className="ie-agentic-jump-search__input"
          placeholder="Jump to section…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlight(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-label="Jump to section"
          aria-expanded={open && filtered.length > 0}
          aria-controls="agentic-jump-results"
          aria-autocomplete="list"
          autoComplete="off"
        />
        <kbd className="ie-agentic-jump-search__kbd" aria-hidden>
          ⌘K
        </kbd>
      </div>
      {open && filtered.length > 0 ? (
        <ul id="agentic-jump-results" ref={listRef} className="ie-agentic-jump-search__results" role="listbox">
          {filtered.slice(0, 12).map((item, i) => (
            <li key={item.id} role="option" aria-selected={i === activeHighlight}>
              <button
                type="button"
                className={`ie-agentic-jump-search__result${i === activeHighlight ? ' is-active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => scrollTo(item.id)}
              >
                <span className="ie-agentic-jump-search__result-label">{item.label}</span>
                <span className="ie-agentic-jump-search__result-part">{item.partTitle}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && query && filtered.length === 0 ? (
        <p className="ie-agentic-jump-search__empty">No sections match &ldquo;{query}&rdquo;</p>
      ) : null}
    </div>
  )
}
