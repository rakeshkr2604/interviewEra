import { cn } from '@/lib/utils';

type BrandWordmarkSplitProps = {
  className?: string;
  interviewClassName?: string;
  eraClassName?: string;
};

/** Inline Interview + Era (theme tokens); no `.com`. Use wherever the navbar lockup repeats. */
export function BrandWordmarkSplit({
  className,
  interviewClassName = 'font-semibold',
  eraClassName = 'font-bold',
}: BrandWordmarkSplitProps) {
  return (
    <span className={cn('inline-flex items-baseline gap-0 whitespace-nowrap leading-none', className)}>
      <span className={interviewClassName} style={{ color: 'var(--text-primary)' }}>
        Interview
      </span>
      <span className={eraClassName} style={{ color: 'var(--accent-link)' }}>
        Era
      </span>
    </span>
  );
}
