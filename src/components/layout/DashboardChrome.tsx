'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { Sidebar } from '@/components/layout/Sidebar'
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container'
import { cn } from '@/lib/utils'

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname() ?? ''
  const isOnboarding = pathname.startsWith('/onboarding')

  return (
    <div className={cn('flex', !isOnboarding && 'min-h-screen')} style={{ background: 'var(--bg-secondary)' }}>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[35] bg-black/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-[min(15.25rem,88vw)] max-w-[246px] flex-col border-r transition-transform duration-200 ease-out lg:w-[15.25rem] lg:max-w-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 96%, transparent)',
          boxShadow: '4px 0 48px color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <Sidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col lg:pl-[15.25rem]',
          isOnboarding ? 'h-dvh max-h-dvh min-h-0 overflow-hidden' : 'min-h-screen',
        )}
      >
        {/* Fixed below content — avoids layout coupling to main scrollbar / inset shifts (CLS). */}
        <div
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-[15.25rem]"
          aria-hidden
        >
          <div
            className="pointer-events-none absolute opacity-90"
            style={{
              left: '-6rem',
              top: '-5rem',
              width: '26rem',
              height: '26rem',
              borderRadius: '50%',
              background:
                'radial-gradient(circle at center, color-mix(in srgb, var(--accent-primary) 38%, transparent) 0%, transparent 72%)',
            }}
          />
          <div
            className="pointer-events-none absolute opacity-80"
            style={{
              right: '-4rem',
              top: '4rem',
              width: '22rem',
              height: '22rem',
              borderRadius: '50%',
              background:
                'radial-gradient(circle at center, color-mix(in srgb, #7c3aed 32%, transparent) 0%, transparent 70%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_-5%,black,transparent)]"
            style={{
              backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--text-secondary) 6%, transparent) 1px, transparent 1px),
                  linear-gradient(to bottom, color-mix(in srgb, var(--text-secondary) 6%, transparent) 1px, transparent 1px)`,
              backgroundSize: '44px 44px',
            }}
          />
        </div>

        <header
          className="sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-3 lg:hidden"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 96%, transparent)',
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
          <span style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            <BrandWordmarkSplit />
          </span>
        </header>

        <main
          className={cn(
            'ie-landing-premium ie-landing-type relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden',
            isOnboarding ? 'overflow-hidden' : 'overflow-y-auto',
          )}
          style={{
            background: 'var(--page-gradient)',
            color: 'var(--text-primary)',
            ...(isOnboarding ? {} : { scrollbarGutter: 'stable' }),
          }}
        >
          <div
            className={cn(
              'relative flex min-h-0 min-w-0 flex-1 flex-col px-4 sm:px-5',
              isOnboarding
                ? 'overflow-hidden py-3 md:py-4'
                : 'py-8 sm:py-10 md:py-12',
              LANDING_PAGE_CONTAINER,
            )}
          >
            {children}
          </div>

          {!isOnboarding ? (
            <footer
              className="relative border-t px-4 py-4 sm:px-6"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 35%, transparent)',
              }}
            >
              <div className={cn(LANDING_PAGE_CONTAINER)}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <BrandWordmarkSplit className="inline text-[inherit]" /> dashboard
                </p>
              </div>
            </footer>
          ) : null}
        </main>
      </div>
    </div>
  )
}
