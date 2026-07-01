'use client'

import { useEffect, useRef } from 'react'

interface CaptionDisplayProps {
  fullText: string
  currentWordIndex: number
}

export function CaptionDisplay({ fullText, currentWordIndex }: CaptionDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep the active word visible without jarring jumps
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const active = el.querySelector<HTMLElement>('[data-active="true"]')
    if (active) {
      active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentWordIndex])

  if (!fullText) return null

  // Preserve original casing and punctuation — lowercase captions look unpolished
  const words = fullText.trim().split(/\s+/).filter(Boolean)

  return (
    <div
      ref={scrollRef}
      className="mx-auto w-full max-w-prose max-h-36 overflow-y-auto rounded-xl border border-(--card-border)
                 bg-(--card-bg) px-4 py-3.5 text-base leading-relaxed scroll-smooth motion-reduce:scroll-auto"
    >
      {words.map((word, index) => {
        const isActive  = index === currentWordIndex
        const isSpoken  = index < currentWordIndex

        return (
          <span
            key={`${word}-${index}`}
            data-active={isActive ? 'true' : undefined}
            className={`transition-colors duration-150 ${
              isActive
                ? 'rounded-sm bg-(--accent-primary)/20 px-0.5 font-semibold text-(--text-primary)'
                : isSpoken
                  ? 'text-(--text-primary)/60'
                  : 'text-(--text-muted)'
            }`}
          >
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </div>
  )
}
