import type { ReactNode } from 'react';
import { AuthCircuitDecor } from '@/components/layout/AuthCircuitDecor';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

/**
 * Same visual shell as blog / free tools: orbs, 44px grid, `LANDING_PAGE_CONTAINER`.
 * Wrap with `ie-landing-premium` + `var(--page-gradient)` on a parent for full marketing polish.
 */
export function AuthPremiumShell({ children }: { children: ReactNode }) {
  return (
    <main
      className="ie-landing-type relative flex min-h-screen flex-col overflow-hidden pb-16 pt-[30px] sm:pb-20 md:pb-24"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-[18%] top-[-16%] h-[min(22rem,72vw)] w-[min(22rem,72vw)] rounded-full blur-[100px] sm:left-0"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 26%, transparent)' }}
        />
        <div
          className="absolute -right-[12%] top-[28%] h-[min(16rem,55vw)] w-[min(16rem,55vw)] rounded-full blur-[90px]"
          style={{ background: 'color-mix(in srgb, #7c3aed 20%, transparent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.2] [mask-image:radial-gradient(ellipse_85%_75%_at_50%_10%,black,transparent)]"
          style={{
            backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--text-secondary) 7%, transparent) 1px, transparent 1px),
              linear-gradient(to bottom, color-mix(in srgb, var(--text-secondary) 7%, transparent) 1px, transparent 1px)`,
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <AuthCircuitDecor />

      <div className={cn('relative px-4 sm:px-5', LANDING_PAGE_CONTAINER)}>{children}</div>
    </main>
  );
}
