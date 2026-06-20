import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function DashboardPageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  backHref,
  backLabel,
}: {
  eyebrow: ReactNode;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Renders a back-navigation link above the eyebrow when provided. */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:gap-5 lg:mb-10 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft className="size-4" aria-hidden />
            {backLabel ?? 'Back'}
          </Link>
        ) : null}
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
          style={{ color: 'var(--accent-primary)' }}
        >
          {eyebrow}
        </p>
        <h1
          className="mt-2 text-3xl font-bold tracking-tight text-balance md:text-4xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full shrink-0 justify-start sm:justify-end lg:w-auto">{action}</div>
      ) : null}
    </div>
  );
}
