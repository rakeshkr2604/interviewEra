'use client'

import type { ReactNode } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '@/lib/theme/ThemeProvider'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

function ThemePreviewTile({
  value,
  active,
  onSelect,
  children,
  label,
}: {
  value: Theme
  active: boolean
  onSelect: () => void
  children: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`Use ${label} theme`}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl border-2 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/45',
        active
          ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/25'
          : 'border-[var(--card-border)] hover:border-[color-mix(in_srgb,var(--accent-primary)_38%,var(--card-border))]',
      )}
    >
      <span className="sr-only">{label}</span>
      <div className="relative h-[5.75rem] w-full overflow-hidden sm:h-24">{children}</div>
      <div
        className="flex items-center justify-center gap-1.5 border-t px-1 py-2 text-[11px] font-bold sm:text-xs"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 90%, transparent)',
          color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
        }}
      >
        {value === 'light' ? (
          <Sun className="size-3.5 opacity-80" aria-hidden />
        ) : value === 'dark' ? (
          <Moon className="size-3.5 opacity-80" aria-hidden />
        ) : (
          <Monitor className="size-3.5 opacity-80" aria-hidden />
        )}
        {label}
      </div>
    </button>
  )
}

export function ThemeAppearanceControl() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <ThemePreviewTile
          value="light"
          label="Light"
          active={theme === 'light'}
          onSelect={() => setTheme('light')}
        >
          <div className="absolute inset-0 bg-[#f1f5f9]">
            <div className="absolute inset-x-2 top-2 flex gap-1">
              <span className="h-1.5 w-6 rounded-full bg-indigo-500/85" />
              <span className="h-1.5 flex-1 rounded-full bg-slate-300/90" />
            </div>
            <div className="absolute inset-x-2 top-6 space-y-1.5">
              <span className="block h-2 rounded-md bg-white shadow-sm shadow-slate-900/5" />
              <span className="block h-2 rounded-md bg-white/90 shadow-sm shadow-slate-900/5" />
              <span className="block h-1.5 w-4/5 rounded-md bg-slate-200/80" />
            </div>
          </div>
        </ThemePreviewTile>

        <ThemePreviewTile
          value="dark"
          label="Dark"
          active={theme === 'dark'}
          onSelect={() => setTheme('dark')}
        >
          <div className="absolute inset-0 bg-[#0a0f1e]">
            <div className="absolute inset-x-2 top-2 flex gap-1">
              <span className="h-1.5 w-6 rounded-full bg-indigo-400/90" />
              <span className="h-1.5 flex-1 rounded-full bg-slate-600/80" />
            </div>
            <div className="absolute inset-x-2 top-6 space-y-1.5">
              <span className="block h-2 rounded-md bg-[#141c2f] shadow-sm shadow-black/35" />
              <span className="block h-2 rounded-md bg-[#141c2f]/90 shadow-sm shadow-black/35" />
            </div>
          </div>
        </ThemePreviewTile>

        <ThemePreviewTile
          value="system"
          label="System"
          active={theme === 'system'}
          onSelect={() => setTheme('system')}
        >
          <div className="absolute inset-0 flex">
            <div className="relative h-full w-1/2 bg-[#f1f5f9]">
              <div className="absolute inset-x-1 top-2 h-1 w-4 rounded-full bg-indigo-500/80" />
            </div>
            <div className="relative h-full w-1/2 bg-[#0a0f1e]">
              <div className="absolute inset-x-1 top-2 h-1 w-4 rounded-full bg-indigo-400/85" />
            </div>
          </div>
        </ThemePreviewTile>
      </div>

      <div
        className="inline-flex w-full max-w-none rounded-xl border-2 p-1"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 85%, transparent)',
        }}
        role="group"
        aria-label="Color theme (text buttons)"
      >
        {OPTIONS.map((opt) => {
          const active = theme === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                'flex-1 rounded-lg px-2 py-2.5 text-xs font-bold transition-colors sm:px-4 sm:text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50',
              )}
              style={
                active
                  ? {
                      background: 'var(--accent-primary)',
                      color: 'white',
                      boxShadow: '0 1px 2px color-mix(in srgb, var(--accent-primary) 35%, transparent)',
                    }
                  : {
                      color: 'var(--text-secondary)',
                    }
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div className="mt-auto space-y-3 pt-1">
        <div
          className="rounded-xl border px-3.5 py-3 sm:px-4"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-secondary))',
          }}
        >
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            How System works
          </p>
          <p className="mt-1.5 text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
            We read your device&apos;s light/dark preference and switch the UI automatically — handy if you change modes
            during the day. Manual Light or Dark stays locked until you switch back.
          </p>
        </div>

        <p className="text-center text-[11px] leading-snug sm:text-left" style={{ color: 'var(--text-muted)' }}>
          Theme is stored in this browser only — other devices keep their own choice.
        </p>
      </div>
    </div>
  )
}
