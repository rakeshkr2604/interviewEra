import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

interface BlogMarketingShellProps {
  children: ReactNode;
  /** When set, shows a back row above content (e.g. `/blog`). */
  backHref?: string;
  backLabel?: string;
}

/**
 * Premium marketing shell for /blog — matches free tools: orbs, grid, `LANDING_PAGE_CONTAINER`, theme tokens.
 */
export function BlogMarketingShell({
  children,
  backHref,
  backLabel = 'All guides',
}: BlogMarketingShellProps) {
  return (
    <main
      className="ie-landing-type relative overflow-hidden pb-20 pt-10 sm:pb-28 sm:pt-14 md:pb-32 md:pt-20"
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
          className="absolute inset-0 opacity-[0.2] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_-10%,black,transparent)]"
          style={{
            backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--text-secondary) 7%, transparent) 1px, transparent 1px),
              linear-gradient(to bottom, color-mix(in srgb, var(--text-secondary) 7%, transparent) 1px, transparent 1px)`,
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <div className={cn('relative px-4 sm:px-5', LANDING_PAGE_CONTAINER)}>
        {backHref ? (
          <Link
            href={backHref}
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:mb-10 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {backLabel}
          </Link>
        ) : null}

        {children}
      </div>
    </main>
  );
}
