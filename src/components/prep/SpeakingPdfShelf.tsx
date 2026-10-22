'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Pause,
  Play,
} from 'lucide-react'
import { PDF_RESOURCES, type PrepPdfResource } from '@/lib/prep/pdf-resources'
import {
  IE_FOCUS_VISIBLE,
  IE_MARKETING_SURFACE_CARD_CLASS,
  IE_MARKETING_SURFACE_CARD_STYLE,
} from '@/lib/theme/component-classes'
import { cn } from '@/lib/utils'
import './SpeakingPdfShelf.css'

/** Pixels per second — comfortable reading speed for the autoplay loop. */
export const SPEAKING_PDF_CAROUSEL_SPEED_PX_PER_SEC = 28

function getPrefersReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function subscribePrefersReducedMotion(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const onChange = () => onStoreChange()
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    () => false,
  )
}

function ResourceCard({
  file,
  selected,
  onView,
  interactive,
  layout = 'carousel',
}: {
  file: PrepPdfResource
  selected: boolean
  onView: (id: string) => void
  /** When false, clone strip — pointer OK, not in tab order / a11y tree. */
  interactive: boolean
  layout?: 'carousel' | 'grid'
}) {
  return (
    <article
      className={cn(
        IE_MARKETING_SURFACE_CARD_CLASS,
        'flex h-full min-h-[15.5rem] flex-col p-4 sm:p-5',
        layout === 'carousel' && 'speaking-pdf-carousel__card',
      )}
      style={{
        ...IE_MARKETING_SURFACE_CARD_STYLE,
        borderColor: selected ? 'var(--accent-primary)' : IE_MARKETING_SURFACE_CARD_STYLE.borderColor,
        boxShadow: selected
          ? '0 10px 28px color-mix(in srgb, var(--accent-primary) 18%, transparent)'
          : IE_MARKETING_SURFACE_CARD_STYLE.boxShadow,
      }}
    >
      <div
        className="flex size-11 items-center justify-center rounded-xl"
        style={{
          background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
          color: 'var(--accent-primary)',
        }}
        aria-hidden
      >
        <FileText className="size-5" strokeWidth={2.25} />
      </div>
      <h3 className="mt-3 text-sm font-bold leading-snug sm:text-[0.95rem]" style={{ color: 'var(--text-primary)' }}>
        {file.title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {file.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          tabIndex={interactive ? undefined : -1}
          className={cn(
            'inline-flex h-10 min-h-10 items-center gap-1.5 rounded-[12px] px-3 text-sm font-semibold text-white',
            IE_FOCUS_VISIBLE,
          )}
          style={{ background: 'var(--accent-primary)' }}
          aria-pressed={interactive ? selected : undefined}
          aria-label={selected ? `Hide ${file.title}` : `View ${file.title}`}
          onClick={() => onView(file.id)}
        >
          <Eye className="size-4" aria-hidden />
          {selected ? 'Hide' : 'View'}
        </button>
        <a
          href={file.href}
          download={file.filename}
          tabIndex={interactive ? undefined : -1}
          aria-label={`Download ${file.title}`}
          className={cn(
            'inline-flex h-10 min-h-10 items-center gap-1.5 rounded-[12px] border px-3 text-sm font-semibold',
            IE_FOCUS_VISIBLE,
          )}
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
        >
          <Download className="size-4" aria-hidden />
          Download
        </a>
      </div>
    </article>
  )
}

export function SpeakingPdfShelf() {
  const viewerTitleId = useId()
  const headingId = useId()
  const controlsId = useId()
  const viewerRef = useRef<HTMLDivElement>(null)
  const primaryGroupRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const loopWidthRef = useRef(0)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startOffset: number
    moved: boolean
  } | null>(null)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [focusPaused, setFocusPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [offsetPx, setOffsetPx] = useState(0)
  const [loopWidth, setLoopWidth] = useState(0)
  const reducedMotion = usePrefersReducedMotion()

  const active = PDF_RESOURCES.find((file) => file.id === activeId) ?? null
  const useCarousel = !showAll && !reducedMotion
  const autoplayActive =
    useCarousel && !userPaused && !hoverPaused && !focusPaused && !dragging

  const showFile = useCallback((id: string) => {
    setActiveId((current) => {
      const next = current === id ? null : id
      if (next) {
        requestAnimationFrame(() => {
          viewerRef.current?.scrollIntoView({ block: 'nearest' })
          viewerRef.current?.focus()
        })
      }
      return next
    })
  }, [])

  const measureLoop = useCallback(() => {
    const group = primaryGroupRef.current
    if (!group) return
    const styles = getComputedStyle(group)
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0
    const width = group.getBoundingClientRect().width + gap
    loopWidthRef.current = width
    setLoopWidth(width)
  }, [])

  useLayoutEffect(() => {
    if (!useCarousel) return
    measureLoop()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measureLoop)
      return () => window.removeEventListener('resize', measureLoop)
    }
    const observer = new ResizeObserver(() => measureLoop())
    if (primaryGroupRef.current) observer.observe(primaryGroupRef.current)
    return () => observer.disconnect()
  }, [measureLoop, useCarousel])

  const wrapOffset = useCallback((value: number) => {
    const width = loopWidthRef.current
    if (width <= 0) return value
    let next = value % width
    if (next < 0) next += width
    return next
  }, [])

  const commitOffset = useCallback(
    (value: number) => {
      const next = wrapOffset(value)
      offsetRef.current = next
      setOffsetPx(next)
    },
    [wrapOffset],
  )

  const stepByCard = useCallback(
    (direction: 1 | -1) => {
      const group = primaryGroupRef.current
      if (!group) return
      const card = group.querySelector<HTMLElement>('.speaking-pdf-carousel__card')
      const styles = getComputedStyle(group)
      const gap = Number.parseFloat(styles.columnGap || styles.gap || '0') || 0
      const cardWidth = card?.getBoundingClientRect().width ?? 280
      commitOffset(offsetRef.current + direction * (cardWidth + gap))
    },
    [commitOffset],
  )

  useEffect(() => {
    if (!autoplayActive || loopWidth <= 0) return

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      commitOffset(offsetRef.current + (SPEAKING_PDF_CAROUSEL_SPEED_PX_PER_SEC * dt) / 1000)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [autoplayActive, commitOffset, loopWidth])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.button !== 0) return
    // Ignore drags that start on buttons/links so View/Download stay clickable.
    const target = event.target as HTMLElement | null
    if (target?.closest('button, a')) return
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: offsetRef.current,
      moved: false,
    }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const delta = drag.startX - event.clientX
    if (Math.abs(delta) > 6) drag.moved = true
    commitOffset(drag.startOffset + delta)
  }

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // already released
    }
  }

  if (PDF_RESOURCES.length === 0) return null

  const renderGroup = (interactive: boolean, ref?: Ref<HTMLDivElement>) => (
    <div
      ref={ref}
      className="speaking-pdf-carousel__group"
      role={interactive ? 'list' : undefined}
      aria-hidden={interactive ? undefined : true}
    >
      {PDF_RESOURCES.map((file) => (
        <div key={`${interactive ? 'a' : 'b'}-${file.id}`} role={interactive ? 'listitem' : undefined}>
          <ResourceCard
            file={file}
            selected={file.id === activeId}
            onView={showFile}
            interactive={interactive}
          />
        </div>
      ))}
    </div>
  )

  return (
    <section aria-labelledby={headingId} className="mb-8 min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id={headingId}
          className="text-base font-bold tracking-tight sm:text-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          Speaking practice
        </h2>
        <button
          type="button"
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold',
            IE_FOCUS_VISIBLE,
          )}
          style={{ color: 'var(--accent-primary)' }}
          aria-expanded={showAll}
          aria-controls={controlsId}
          onClick={() => setShowAll((open) => !open)}
        >
          {showAll ? 'Show less' : 'See all'}
          <ChevronRight
            className={cn('size-4 transition-transform motion-reduce:transition-none', showAll && 'rotate-90')}
            aria-hidden
          />
        </button>
      </div>

      {active ? (
        <div
          ref={viewerRef}
          tabIndex={-1}
          className="mb-4 overflow-hidden rounded-2xl border-2 outline-none"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          aria-labelledby={viewerTitleId}
        >
          <div
            className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <h3 id={viewerTitleId} className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Viewing: {active.title}
            </h3>
            <a
              href={active.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('text-sm font-semibold underline-offset-4 hover:underline', IE_FOCUS_VISIBLE)}
              style={{ color: 'var(--accent-primary)' }}
            >
              Open {active.title} in a new tab
            </a>
          </div>
          <iframe title={active.title} src={active.href} className="h-[min(70vh,720px)] w-full bg-white" />
        </div>
      ) : null}

      {showAll ? (
        <ul
          id={controlsId}
          className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
          aria-label="All speaking practice resources"
        >
          {PDF_RESOURCES.map((file) => (
            <li key={file.id} className="min-w-0">
              <ResourceCard
                file={file}
                selected={file.id === activeId}
                onView={showFile}
                interactive
                layout="grid"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div
          id={controlsId}
          className={cn(
            'speaking-pdf-carousel',
            (reducedMotion || !useCarousel) && 'speaking-pdf-carousel--static',
          )}
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
          onFocusCapture={() => setFocusPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setFocusPaused(false)
            }
          }}
        >
          <div
            className="speaking-pdf-carousel__viewport"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            aria-roledescription={useCarousel ? 'carousel' : undefined}
            aria-label="Speaking practice resources"
          >
            <div
              ref={trackRef}
              className="speaking-pdf-carousel__track"
              style={
                useCarousel
                  ? ({
                      ['--speaking-pdf-offset']: `${offsetPx}px`,
                    } as CSSProperties)
                  : undefined
              }
            >
              {renderGroup(true, primaryGroupRef)}
              {useCarousel ? renderGroup(false) : null}
            </div>
          </div>

          {useCarousel ? (
            <div className="speaking-pdf-carousel__controls">
              <button
                type="button"
                className={cn('speaking-pdf-carousel__control', IE_FOCUS_VISIBLE)}
                aria-label="Previous resource"
                onClick={() => stepByCard(-1)}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                className={cn('speaking-pdf-carousel__control', IE_FOCUS_VISIBLE)}
                aria-label={userPaused ? 'Play carousel' : 'Pause carousel'}
                aria-pressed={userPaused}
                onClick={() => setUserPaused((paused) => !paused)}
              >
                {userPaused ? (
                  <Play className="size-4" aria-hidden />
                ) : (
                  <Pause className="size-4" aria-hidden />
                )}
              </button>
              <button
                type="button"
                className={cn('speaking-pdf-carousel__control', IE_FOCUS_VISIBLE)}
                aria-label="Next resource"
                onClick={() => stepByCard(1)}
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
