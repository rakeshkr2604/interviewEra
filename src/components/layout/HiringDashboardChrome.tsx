'use client';

import { LogOut } from 'lucide-react';
import { BrandChromeLockup } from '@/components/brand/BrandChromeLockup';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';
import { performClientLogout } from '@/lib/supabase/client-logout';

interface HiringDashboardChromeProps {
  children: React.ReactNode;
  orgName: string;
  showWorkspaceSwitcher?: boolean;
}

export function HiringDashboardChrome({
  children,
  orgName,
  showWorkspaceSwitcher = false,
}: HiringDashboardChromeProps) {
  async function handleLogout() {
    await performClientLogout({ redirectTo: '/teams' });
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-secondary)' }}>
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <BrandChromeLockup
                href="/hiring/dashboard"
                wordmarkClassName="text-sm font-bold sm:text-base"
              />
              <p className="mt-0.5 truncate text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                HR Dashboard · {orgName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 text-sm font-medium"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
              >
                <LogOut className="size-3.5" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
          {showWorkspaceSwitcher ? (
            <div
              className="rounded-xl border px-2 py-2"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
            >
              <WorkspaceSwitcher current="hiring" />
            </div>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
