'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useClientReady } from '@/components/prep/use-client-ready'
import { trackPrepEvent } from '@/lib/prep/analytics'
import { PrepMockCta } from '@/components/prep/PrepMockCta'
import {
  READINESS_CATEGORIES,
  readinessSnapshot,
  isReadinessItemId,
} from '@/lib/prep/readiness'
import {
  IE_FOCUS_VISIBLE,
  IE_MARKETING_CTA_SECONDARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_STYLE,
} from '@/lib/theme/component-classes'
import { cn } from '@/lib/utils'

export function ReadinessChecklist({ section = 'readiness_checklist' }: { section?: string }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const ready = useClientReady()
  const wasComplete = useRef(false)
  const snapshot = readinessSnapshot(checked)

  function onToggle(id: string, shouldCheck: boolean) {
    const next = new Set(checked)
    if (!isReadinessItemId(id)) return
    if (shouldCheck) next.add(id)
    else next.delete(id)
    const progress = readinessSnapshot(next)
    if (progress.complete && !wasComplete.current) {
      trackPrepEvent('readiness_checklist_completed', {
        completed_count: progress.done,
        total: progress.total,
        percent: progress.percent,
        section,
      })
    }
    wasComplete.current = progress.complete
    setChecked(next)
  }

  return (
    <div
      id="interview-readiness"
      data-ready={ready ? 'true' : 'false'}
      className="scroll-mt-24 rounded-[var(--ie-radius-xl)] border-2 px-4 py-5 sm:px-6 sm:py-6"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Interview readiness checklist
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            A private self-check. Checking every box does not mean you are job-ready. Nothing here is saved.
          </p>
        </div>
        <p id="readiness-count" className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>
          {snapshot.done} of {snapshot.total} ({snapshot.percent}%)
        </p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full"
        style={{ background: 'color-mix(in srgb, var(--text-muted) 25%, transparent)' }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={snapshot.percent}
        aria-label="Checklist completion"
      >
        <div
          className="h-full rounded-full motion-reduce:transition-none"
          style={{
            width: `${snapshot.percent}%`,
            background: 'var(--accent-primary)',
          }}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {READINESS_CATEGORIES.map((category) => (
          <fieldset key={category.id} className="min-w-0 space-y-3">
            <legend className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {category.title}
            </legend>
            <ul className="m-0 list-none space-y-2 p-0">
              {category.items.map((item) => {
                const inputId = `readiness-${item.id}`
                return (
                  <li key={item.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm leading-snug',
                      )}
                      style={{
                        borderColor: 'var(--card-border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <input
                        id={inputId}
                        type="checkbox"
                        className={cn('mt-0.5 size-4 shrink-0 accent-(--accent-primary)', IE_FOCUS_VISIBLE)}
                        checked={checked.has(item.id)}
                        onChange={(event) => onToggle(item.id, event.target.checked)}
                      />
                      <span>{item.label}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </fieldset>
        ))}
      </div>

      <div className="mt-6 space-y-4" role="status" aria-live="polite">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {snapshot.message}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {snapshot.complete ? <PrepMockCta section={section} /> : null}
          {!snapshot.complete && snapshot.href && snapshot.hrefLabel ? (
            <Link
              href={snapshot.href}
              className="text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              {snapshot.hrefLabel}
            </Link>
          ) : null}
          <button
            type="button"
            className={IE_MARKETING_CTA_SECONDARY_CLASS}
            style={IE_MARKETING_CTA_SECONDARY_STYLE}
            onClick={() => {
              setChecked(new Set())
              wasComplete.current = false
            }}
          >
            Reset checklist
          </button>
        </div>
      </div>
    </div>
  )
}
