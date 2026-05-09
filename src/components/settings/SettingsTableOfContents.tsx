'use client'

import { cn } from '@/lib/utils'

export const SETTINGS_NAV_ITEMS = [
  { id: 'settings-appearance', label: 'Appearance' },
  { id: 'settings-notifications', label: 'Notifications' },
  { id: 'settings-billing', label: 'Billing' },
  { id: 'settings-privacy', label: 'Privacy' },
  { id: 'settings-account', label: 'Account' },
  { id: 'settings-interview', label: 'Interview' },
  { id: 'settings-audio', label: 'Audio' },
  { id: 'settings-danger', label: 'Danger' },
] as const

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function SettingsTableOfContentsMobile({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        'sticky top-0 z-20 -mx-4 border-b px-3 py-2.5 sm:-mx-5 sm:px-4',
        className,
      )}
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SETTINGS_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSection(item.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40',
              'border-[var(--card-border)] bg-[color-mix(in_srgb,var(--card-bg)_85%,transparent)]',
              'text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/35 hover:text-[var(--text-primary)]',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

export function SettingsTableOfContentsDesktop({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        'w-44 shrink-0 lg:sticky lg:top-24 lg:self-start',
        className,
      )}
    >
      <div
        className="space-y-0.5 rounded-2xl border-2 px-3 py-3"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
          boxShadow: '0 1px 0 0 color-mix(in srgb, var(--card-border) 55%, transparent)',
        }}
      >
        <p
          className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: 'var(--accent-primary)' }}
        >
          On this page
        </p>
        <ul className="space-y-0.5">
          {SETTINGS_NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  'w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors',
                  'text-[var(--text-secondary)] hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] hover:text-[var(--text-primary)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35',
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
