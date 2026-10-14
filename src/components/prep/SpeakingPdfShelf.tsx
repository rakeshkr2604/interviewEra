'use client'

import { useId, useRef, useState } from 'react'
import { Download, Eye, FileText } from 'lucide-react'
import { PDF_RESOURCES, SPEAKING_PDF_USAGE } from '@/lib/prep/pdf-resources'
import {
  IE_FOCUS_VISIBLE,
  IE_MARKETING_SURFACE_CARD_CLASS,
  IE_MARKETING_SURFACE_CARD_STYLE,
} from '@/lib/theme/component-classes'
import { cn } from '@/lib/utils'

export function SpeakingPdfShelf() {
  const viewerTitleId = useId()
  const viewerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = PDF_RESOURCES.find((file) => file.id === activeId) ?? null

  function showFile(id: string) {
    const next = activeId === id ? null : id
    setActiveId(next)
    if (next) {
      requestAnimationFrame(() => {
        viewerRef.current?.scrollIntoView({ block: 'nearest' })
        viewerRef.current?.focus()
      })
    }
  }

  if (PDF_RESOURCES.length === 0) return null

  return (
    <section aria-labelledby="speaking-pdfs" className="mb-8">
      <h2 id="speaking-pdfs" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
        Speaking practice sheets
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
        {SPEAKING_PDF_USAGE[0]} {SPEAKING_PDF_USAGE[1]} {SPEAKING_PDF_USAGE[2]}
      </p>

      {active ? (
        <div
          ref={viewerRef}
          tabIndex={-1}
          className="mt-5 overflow-hidden rounded-2xl border-2 outline-none"
          style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
          aria-labelledby={viewerTitleId}
        >
          <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--card-border)' }}>
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

      <ul className="mt-5 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {PDF_RESOURCES.map((file) => {
          const selected = file.id === activeId
          return (
            <li key={file.id} className="min-w-0">
              <article
                className={cn(IE_MARKETING_SURFACE_CARD_CLASS, 'flex h-full flex-col p-4 sm:p-5')}
                style={{
                  ...IE_MARKETING_SURFACE_CARD_STYLE,
                  borderColor: selected ? 'var(--accent-primary)' : IE_MARKETING_SURFACE_CARD_STYLE.borderColor,
                }}
              >
                <FileText className="size-5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                <h3 className="mt-3 text-sm font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {file.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {file.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      'inline-flex h-10 min-h-10 items-center gap-1.5 rounded-[12px] px-3 text-sm font-semibold text-white',
                      IE_FOCUS_VISIBLE,
                    )}
                    style={{ background: 'var(--accent-primary)' }}
                    aria-pressed={selected}
                    aria-label={selected ? `Hide ${file.title}` : `View ${file.title}`}
                    onClick={() => showFile(file.id)}
                  >
                    <Eye className="size-4" aria-hidden />
                    {selected ? 'Hide' : 'View'}
                  </button>
                  <a
                    href={file.href}
                    download={file.filename}
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
            </li>
          )
        })}
      </ul>
    </section>
  )
}
