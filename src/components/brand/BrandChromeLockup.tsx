import type { ReactNode } from 'react';
import Link from 'next/link';
import { BrandMarkIcon } from '@/components/brand/BrandMarkIcon';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { cn } from '@/lib/utils';

type BrandChromeLockupProps = {
  href?: string;
  className?: string;
  markSize?: number;
  markClassName?: string;
  wordmarkClassName?: string;
  interviewClassName?: string;
  eraClassName?: string;
  /** Extra label after the wordmark (e.g. “Campus”). */
  suffix?: ReactNode;
};

/**
 * Theme-safe chrome brand row: purple square mark + CSS wordmark.
 * Use in dashboard/admin headers instead of wordmark-only (dark-safe).
 */
export function BrandChromeLockup({
  href = '/',
  className,
  markSize = 28,
  markClassName,
  wordmarkClassName,
  interviewClassName = 'font-semibold',
  eraClassName = 'font-bold',
  suffix,
}: BrandChromeLockupProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-w-0 items-center gap-2 transition-opacity hover:opacity-90',
        className,
      )}
      aria-label="InterviewEra home"
    >
      <BrandMarkIcon size={markSize} className={cn('size-7', markClassName)} />
      <span className="inline-flex min-w-0 items-baseline gap-1.5">
        <BrandWordmarkSplit
          className={wordmarkClassName}
          interviewClassName={interviewClassName}
          eraClassName={eraClassName}
        />
        {suffix}
      </span>
    </Link>
  );
}
