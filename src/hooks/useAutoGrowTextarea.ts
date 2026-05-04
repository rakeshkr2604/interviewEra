'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Sets textarea height from content up to a viewport-aware max; overflow scrolls inside.
 */
export function useAutoGrowTextarea(
  value: string,
  enabled: boolean,
  options?: { minHeightPx?: number; maxHeightPx?: number; maxHeightVhFraction?: number }
): RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement>(null)
  const minPx = options?.minHeightPx ?? 120
  const maxPx = options?.maxHeightPx ?? 480
  const vhFrac = options?.maxHeightVhFraction ?? 0.45

  useLayoutEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const cap =
      typeof window !== 'undefined' ? Math.min(maxPx, Math.round(window.innerHeight * vhFrac)) : maxPx
    const next = Math.max(minPx, Math.min(el.scrollHeight, cap))
    el.style.height = `${next}px`
  }, [value, enabled, minPx, maxPx, vhFrac])

  return ref
}
