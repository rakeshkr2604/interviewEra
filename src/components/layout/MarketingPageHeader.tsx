import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADING,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_SUBHEAD,
} from '@/lib/landing/container';
import {
  IE_MARKETING_EYEBROW_PILL_CLASS,
  IE_MARKETING_EYEBROW_PILL_STYLE,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

interface MarketingPageHeaderProps {
  eyebrow?: string;
  /** When set with `eyebrow`, renders the pill-style badge used on blog/tools pages. */
  eyebrowIcon?: LucideIcon;
  /** Optional icon or badge above the eyebrow (e.g. legal pages). */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
  children?: ReactNode;
}

/**
 * Shared marketing page hero header — eyebrow, title, subtitle, optional CTAs.
 * Uses `LANDING_HOME_*` tokens from the homepage design system.
 */
export function MarketingPageHeader({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  leading,
  title,
  subtitle,
  align = 'center',
  className,
  children,
}: MarketingPageHeaderProps) {
  const centered = align === 'center';
  const pillEyebrow = eyebrow && EyebrowIcon;

  return (
    <header
      className={cn(
        centered ? cn(LANDING_HOME_HEADER_BLOCK, 'lg:max-w-4xl') : 'max-w-2xl space-y-4 text-left',
        className,
      )}
    >
      {leading ? (
        <div className={cn('mb-5', centered && 'mx-auto flex w-fit')}>{leading}</div>
      ) : null}

      {eyebrow ? (
        pillEyebrow ? (
          <div
            className={cn(
              IE_MARKETING_EYEBROW_PILL_CLASS,
              centered ? 'mx-auto mb-5 sm:mb-6' : 'mb-5 lg:mx-0',
            )}
            style={IE_MARKETING_EYEBROW_PILL_STYLE}
          >
            <EyebrowIcon className="size-3.5 text-[var(--accent-primary)]" aria-hidden />
            {eyebrow}
          </div>
        ) : (
          <span className={cn(LANDING_HOME_EYEBROW, centered ? 'block' : 'inline-block')}>
            {eyebrow}
          </span>
        )
      ) : null}

      <h1
        className={cn(
          LANDING_HOME_HEADING,
          pillEyebrow && 'mt-0',
          !centered && 'text-left',
        )}
      >
        {title}
      </h1>

      {subtitle ? (
        <p
          className={cn(
            LANDING_HOME_SUBHEAD,
            centered ? 'sm:text-lg' : 'mx-0 max-w-none text-left',
          )}
        >
          {subtitle}
        </p>
      ) : null}

      {children ? (
        <div className={cn('mt-6 flex flex-wrap gap-3', centered && 'justify-center')}>
          {children}
        </div>
      ) : null}
    </header>
  );
}
