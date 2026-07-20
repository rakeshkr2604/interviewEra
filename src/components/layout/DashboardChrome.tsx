'use client'

import { useState, useEffect } from 'react'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { Sidebar } from '@/components/layout/Sidebar'
import { StreakCounter } from '@/components/layout/StreakCounter'
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container'
import { NAV_SHELL_HEIGHT_CLASS } from '@/lib/theme/nav-classes'
import { cn } from '@/lib/utils'
import { useHeartbeat } from '@/hooks/useHeartbeat'

export function DashboardChrome({ children }: { children: React.ReactNode }) {
  useHeartbeat(true);
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname() ?? ''
  const isScriptSetup =
    pathname === '/interview/script/start' ||
    pathname === '/interview/script/test' ||
    pathname.startsWith('/interview/script/start/') ||
    pathname.startsWith('/interview/script/test/')
  const isOnboarding = pathname.startsWith('/onboarding') || isScriptSetup
  /** Live interview (v1 or v2.1 script engine) — viewport-fitted shell (no footer scroll, compact chrome). */
  const isInterviewSession =
    pathname.startsWith('/interview/session/') ||
    (pathname.startsWith('/interview/script/') && !isScriptSetup)
  const isImmersiveViewport = isOnboarding || isInterviewSession

  /*
   * Onboarding mobile scroll (BUG #1 root cause):
   * - `h-dvh` + `overflow-hidden` on the shell column clamps height to one viewport.
   * - Step cards used `flex-1 min-h-0 overflow-hidden` with nested `overflow-y-auto`,
   *   creating an inner scroll trap (scrollbar inside the white card).
   * - Touch scrolling on iOS/Android often stays trapped in that inner pane, so users
   *   cannot reach JD, preferences, or the Start CTA without desktop mode.
   * Fix: below `lg`, let the shell and cards grow with content; keep a single scroller
   * on `<main>`. At `lg+`, restore viewport-fitted split-column internal scroll.
   */

  // iOS body scroll lock: prevents background page rubber-banding through
  // the mobile drawer overlay on Safari/PWA. Saves + restores scroll position.
  //
  // [scroll-lock] logs are emitted on lock and unlock so we can rule this
  // effect in or out when diagnosing iOS "page stops scrolling" reports —
  // every lock MUST have a matching unlock; an orphaned lock here would
  // exactly match those symptoms.
  useEffect(() => {
    if (typeof window === 'undefined' || !mobileOpen) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    console.log('[scroll-lock]', { action: 'lock', reason: 'mobile_drawer_open', scrollY });
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
      console.log('[scroll-lock]', { action: 'unlock', reason: 'mobile_drawer_closed', restoredScrollY: scrollY });
    };
  }, [mobileOpen])

  return (
    <div className={cn('flex', !isImmersiveViewport && 'min-h-screen')} style={{ background: 'var(--bg-secondary)' }}>
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
          'fixed left-0 top-0 z-40 flex h-dvh w-[min(15.25rem,88vw)] max-w-[246px] flex-col border-r transition-transform duration-200 ease-out lg:w-[15.25rem] lg:max-w-none',
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
          isImmersiveViewport
            ? 'min-h-dvh max-lg:overflow-visible lg:h-dvh lg:max-h-dvh lg:min-h-0 lg:overflow-hidden'
            : 'min-h-screen',
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
          className={cn(
            'sticky top-0 z-20 flex items-center gap-3 border-b px-4 pb-3 lg:hidden',
            NAV_SHELL_HEIGHT_CLASS,
          )}
          style={{
            paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
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
          <StreakCounter />
        </header>

        {/*
         * iPhone scroll freeze (do not reintroduce): below `lg` the shell column
         * grows with content, so the WINDOW is the only real scroller and this
         * <main> is a full-viewport overflow container with nothing to scroll.
         * `overscroll-behavior: contain` (ie-overscroll-contain) here blocks
         * touch-scroll chaining from <main> to the window even though <main>
         * cannot scroll — freezing onboarding/session pages on iOS at scrollY 0.
         * Drawer rubber-banding is already handled by the body scroll lock above.
         */}
        <main
          className={cn(
            'ie-landing-premium ie-landing-type relative z-10 flex min-w-0 flex-1 flex-col overflow-x-hidden',
            isImmersiveViewport
              ? 'ie-touch-scroll min-h-0 overflow-y-auto lg:overflow-hidden'
              : 'overflow-y-visible',
          )}
          style={{
            background: 'var(--page-gradient)',
            color: 'var(--text-primary)',
            scrollbarGutter: isImmersiveViewport ? 'stable' : undefined,
          }}
        >
          <div
            className={cn(
              'relative flex min-w-0 flex-col',
              isImmersiveViewport && 'min-h-0 flex-1',
              isOnboarding
                ? 'px-4 py-2 sm:px-5 md:py-3 lg:py-1.5 lg:pt-2'
                : isInterviewSession
                  ? 'flex-1 p-0'
                  : 'px-4 sm:px-5 py-5 sm:py-8 md:py-10 lg:py-12',
              isInterviewSession ? 'w-full min-w-0 max-w-none' : LANDING_PAGE_CONTAINER,
            )}
          >
            {children}
          </div>

          {!isImmersiveViewport ? (
            <footer
              className="relative border-t px-4 py-4 sm:px-6"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 35%, transparent)',
                paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
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
