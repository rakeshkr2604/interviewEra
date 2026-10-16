'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TeamsLandingMode } from '@/lib/hiring/teams-landing-mode'

interface PageModeState {
  mode: TeamsLandingMode
  redisConfigured: boolean
  envPinned: boolean
  defaultMode: TeamsLandingMode
}

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1.5px solid var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
}

const MODE_CONFIG: Record<
  TeamsLandingMode,
  {
    title: string
    shortDesc: string
    consequence: string
    color: string
    bgColor: string
    icon: React.ElementType
  }
> = {
  coming_soon: {
    title: 'Coming Soon',
    shortDesc: 'Public /teams shows the Coming Soon page. Default until Hiring Teams is ready.',
    consequence:
      'Visitors see Coming Soon with early-access / campus CTAs. The full landing and “Create hiring workspace” CTAs stay hidden.',
    color: '#eab308',
    bgColor: 'color-mix(in srgb, #eab308 14%, transparent)',
    icon: Sparkles,
  },
  live: {
    title: 'Full landing live',
    shortDesc: 'Public /teams shows the complete Hiring Teams marketing page.',
    consequence:
      'Use for college visits or demos. Visitors can reach signup CTAs — only flip live when you intend to present or ship.',
    color: '#10b981',
    bgColor: 'color-mix(in srgb, #10b981 14%, transparent)',
    icon: CheckCircle2,
  },
}

export function HiringTeamsPageModeDashboard() {
  const [data, setData] = useState<PageModeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingMode, setPendingMode] = useState<TeamsLandingMode | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadState = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/hiring-teams/page-mode', { cache: 'no-store' })
      const body = (await res.json()) as PageModeState & { error?: string }
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to load Hiring Teams page mode.')
      }
      setData({
        mode: body.mode,
        redisConfigured: body.redisConfigured,
        envPinned: body.envPinned,
        defaultMode: body.defaultMode,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadState()
  }, [loadState])

  const handleConfirm = async () => {
    if (!pendingMode || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/hiring-teams/page-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: pendingMode }),
      })
      const body = (await res.json()) as { error?: string; message?: string; mode?: TeamsLandingMode }
      if (!res.ok) {
        throw new Error(body.error ?? 'Failed to update mode.')
      }
      toast.success(body.message ?? `Mode set to ${pendingMode}`)
      setPendingMode(null)
      await loadState()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.')
    } finally {
      setSubmitting(false)
    }
  }

  const current = data?.mode ?? 'coming_soon'
  const CurrentIcon = MODE_CONFIG[current].icon

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--accent-primary)' }}
          >
            System
          </p>
          <h1
            className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Hiring Teams page
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Toggle the public{' '}
            <Link
              href="/teams"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
              style={{ color: 'var(--accent-link)' }}
            >
              /teams
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>{' '}
            landing between Coming Soon (default) and the full preserved marketing page for demos
            and college visits.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadState()}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </Button>
      </header>

      {error ? (
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-danger, #ef4444) 35%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-danger, #ef4444) 8%, transparent)',
            color: 'var(--text-primary)',
          }}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-danger, #ef4444)' }} />
          <div>
            <p className="font-semibold">Could not load mode</p>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
              {error}
            </p>
          </div>
        </div>
      ) : null}

      {data?.envPinned ? (
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, #eab308 40%, var(--card-border))',
            background: 'color-mix(in srgb, #eab308 12%, transparent)',
          }}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: '#ca8a04' }} />
          <p style={{ color: 'var(--text-primary)' }}>
            <span className="font-semibold">Env pin active.</span>{' '}
            <code className="text-xs">TEAMS_LANDING_MODE</code> overrides Redis. Remove the env var
            to allow dashboard toggles.
          </p>
        </div>
      ) : null}

      {!data?.redisConfigured && !data?.envPinned ? (
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-danger, #ef4444) 35%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-danger, #ef4444) 8%, transparent)',
          }}
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-danger, #ef4444)' }} />
          <p style={{ color: 'var(--text-primary)' }}>
            Redis is not configured. Public site stays on Coming Soon until Redis is available or
            you set <code className="text-xs">TEAMS_LANDING_MODE</code>.
          </p>
        </div>
      ) : null}

      <section className="p-5 sm:p-6" style={cardStyle} aria-labelledby="current-mode-heading">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex size-10 items-center justify-center rounded-xl"
            style={{ background: MODE_CONFIG[current].bgColor, color: MODE_CONFIG[current].color }}
          >
            <CurrentIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="current-mode-heading" className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Current: {MODE_CONFIG[current].title}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {MODE_CONFIG[current].shortDesc}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Choose landing mode">
        {(Object.keys(MODE_CONFIG) as TeamsLandingMode[]).map((mode) => {
          const cfg = MODE_CONFIG[mode]
          const Icon = cfg.icon
          const selected = current === mode
          const disabled = Boolean(data?.envPinned) || !data?.redisConfigured || loading
          return (
            <button
              key={mode}
              type="button"
              disabled={disabled || selected}
              onClick={() => setPendingMode(mode)}
              className="rounded-2xl border p-5 text-left transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                ...cardStyle,
                borderColor: selected
                  ? cfg.color
                  : 'var(--card-border)',
                boxShadow: selected
                  ? `0 0 0 1px ${cfg.color}, var(--card-shadow)`
                  : cardStyle.boxShadow,
              }}
            >
              <div className="flex items-center gap-2">
                <Icon className="size-5" style={{ color: cfg.color }} aria-hidden />
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                  {cfg.title}
                </span>
                {selected ? (
                  <span
                    className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: cfg.bgColor, color: cfg.color }}
                  >
                    Active
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {cfg.shortDesc}
              </p>
            </button>
          )
        })}
      </section>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        <Building2 className="mr-1 inline size-3.5 align-text-bottom" aria-hidden />
        The full Hiring Teams landing is preserved in code. Default is Coming Soon until you
        explicitly go live. This does not gate the internal HR dashboard routes.
      </p>

      <Dialog open={pendingMode !== null} onOpenChange={(open) => !open && setPendingMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Switch to {pendingMode ? MODE_CONFIG[pendingMode].title : ''}?
            </DialogTitle>
            <DialogDescription>
              {pendingMode ? MODE_CONFIG[pendingMode].consequence : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPendingMode(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={submitting}>
              {submitting ? 'Updating…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
