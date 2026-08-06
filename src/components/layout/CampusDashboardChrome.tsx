'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { CampusSidebar } from './CampusSidebar'

interface CampusDashboardChromeProps {
  children: React.ReactNode
  orgName: string
  seatCount: number
  seatsUsed: number
  showWorkspaceSwitcher?: boolean
}

export function CampusDashboardChrome({
  children,
  orgName,
  seatCount,
  seatsUsed,
  showWorkspaceSwitcher = false,
}: CampusDashboardChromeProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // iOS body scroll lock: prevents background page rubber-banding through
  // the mobile drawer overlay on Safari/PWA. Saves + restores scroll position.
  useEffect(() => {
    if (typeof window === 'undefined' || !mobileOpen) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen])

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[35] bg-black/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={[
          'fixed left-0 top-0 z-40 flex h-dvh w-[min(15.25rem,88vw)] max-w-[246px] flex-col border-r transition-transform duration-200 ease-out',
          'lg:w-[15.25rem] lg:max-w-none lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 96%, transparent)',
          boxShadow:
            '4px 0 48px color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <CampusSidebar
          orgName={orgName}
          seatCount={seatCount}
          seatsUsed={seatsUsed}
          onNavigate={() => setMobileOpen(false)}
          showWorkspaceSwitcher={showWorkspaceSwitcher}
        />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[15.25rem]">
        {/* Background glow + grid (matches student dashboard aesthetic) */}
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

        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-20 flex items-center gap-3 border-b px-4 pb-3 lg:hidden"
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 96%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
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
          <span className="min-w-0 flex-1" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
            <BrandWordmarkSplit />
          </span>
          <span
            className="text-xs font-semibold rounded-full px-2 py-0.5"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            Campus
          </span>
        </header>

        {/* Page content */}
        <main
          className="ie-landing-type relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
          style={{
            background: 'var(--page-gradient)',
            color: 'var(--text-primary)',
            scrollbarGutter: 'stable',
          }}
        >
          <div className="flex-1 px-4 py-8 sm:px-6 sm:py-10 md:py-12 mx-auto w-full max-w-6xl">
            {children}
          </div>

          <footer
            className="relative border-t px-4 py-4 sm:px-6"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 35%, transparent)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <BrandWordmarkSplit className="inline text-[inherit]" /> Campus &middot; T&amp;P Portal
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
