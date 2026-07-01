import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Premium shell aligned with dashboard `dashboard-premium-card` + analytics section headers */
export function ReportPanel({
  eyebrow,
  title,
  children,
  className,
  contentClassName,
  id,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Optional id for aria-labelledby on nested landmarks */
  id?: string;
}) {
  const titleId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      className={cn('dashboard-premium-card px-6 py-5 sm:px-7 sm:py-6', className)}
      aria-labelledby={titleId}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
        style={{ color: 'var(--accent-primary)' }}
      >
        {eyebrow}
      </p>
      <h2 id={titleId} className="mt-1 text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      <div className={cn('mt-5', contentClassName)}>{children}</div>
    </section>
  );
}
