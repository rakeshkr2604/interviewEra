'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container'
import { cn } from '@/lib/utils'

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[35] bg-black/50 backdrop-blur-[1px] lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-[min(17.5rem,92vw)] max-w-[280px] flex-col border-r transition-transform duration-200 ease-out lg:w-[17.5rem] lg:max-w-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          boxShadow: '4px 0 48px color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-[17.5rem]">
        <header
          className="sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 lg:hidden"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-10 items-center justify-center rounded-lg border transition-opacity active:opacity-80"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)',
              background: 'color-mix(in srgb, var(--card-bg) 40%, transparent)',
            }}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </button>
          <span
            className="font-semibold"
            style={{ color: 'var(--text-primary)', fontFamily: 'Bricolage Grotesque, sans-serif' }}
          >
            InterviewEra
          </span>
        </header>

        <main
          className="ie-landing-premium ie-landing-type relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
          style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
              className="absolute -left-[10%] top-[-12%] h-[min(18rem,55vw)] w-[min(18rem,55vw)] rounded-full blur-[90px] opacity-90"
              style={{ background: 'color-mix(in srgb, var(--accent-primary) 22%, transparent)' }}
            />
            <div
              className="absolute -right-[8%] top-[22%] h-[min(14rem,45vw)] w-[min(14rem,45vw)] rounded-full blur-[80px] opacity-80"
              style={{ background: 'color-mix(in srgb, #7c3aed 18%, transparent)' }}
            />
            <div
              className="absolute inset-0 opacity-[0.14] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_-5%,black,transparent)]"
              style={{
                backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--text-secondary) 6%, transparent) 1px, transparent 1px),
                  linear-gradient(to bottom, color-mix(in srgb, var(--text-secondary) 6%, transparent) 1px, transparent 1px)`,
                backgroundSize: '44px 44px',
              }}
            />
          </div>

          <div className={cn('relative min-w-0 px-4 py-8 sm:px-5 sm:py-10 md:py-12', LANDING_PAGE_CONTAINER)}>
            {children}
          </div>

          <footer
            className="relative border-t px-4 py-4 sm:px-6"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 35%, transparent)',
            }}
          >
            <div className={cn(LANDING_PAGE_CONTAINER)}>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  InterviewEra
                </span>{' '}
                dashboard
              </p>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
