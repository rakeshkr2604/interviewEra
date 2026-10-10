'use client';

import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { BrandChromeLockup } from '@/components/brand/BrandChromeLockup';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { PlatformSidebar } from '@/components/layout/PlatformSidebar';

export function PlatformChrome({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[35] bg-black/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={[
          'fixed left-0 top-0 z-40 flex h-dvh w-[min(15.25rem,88vw)] max-w-[246px] flex-col border-r transition-transform duration-200 ease-out',
          'lg:w-[15.25rem] lg:max-w-none lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 96%, transparent)',
          boxShadow: '4px 0 48px color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <PlatformSidebar onNavigate={() => setMobileOpen(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[15.25rem]">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-[15.25rem]" aria-hidden>
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
        </div>

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
          <BrandChromeLockup
            href="/platform/growth"
            className="min-w-0 flex-1"
            markClassName="size-8"
            markSize={32}
          />
        </header>

        <main
          className="ie-landing-type relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
          style={{
            background: 'var(--page-gradient)',
            color: 'var(--text-primary)',
            scrollbarGutter: 'stable',
          }}
        >
          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</div>
          <footer
            className="relative border-t px-4 py-4 sm:px-6"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 35%, transparent)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              <BrandWordmarkSplit className="inline text-[inherit]" />
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
