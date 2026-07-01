import {
  LANDING_HOME_EYEBROW,
  MARKETING_SECTION_HEADER_MB,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';

interface MarketingSectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  id?: string;
  /** Heading level for in-page sections (default h2). */
  as?: 'h2' | 'h3';
}

/**
 * Shared in-page section header for marketing / SEO surfaces.
 */
export function MarketingSectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
  id,
  as: Heading = 'h2',
}: MarketingSectionHeaderProps) {
  return (
    <header className={cn(MARKETING_SECTION_HEADER_MB, className)}>
      {eyebrow ? <p className={LANDING_HOME_EYEBROW}>{eyebrow}</p> : null}
      <Heading
        id={id}
        className={cn(
          'font-bold tracking-tight text-[var(--text-primary)]',
          eyebrow ? 'mt-2' : '',
          Heading === 'h3'
            ? 'text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]'
            : 'text-xl sm:text-2xl',
        )}
      >
        {title}
      </Heading>
      {subtitle ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
}
