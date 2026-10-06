import { Fragment } from 'react';
import { BRAND_COLORS, BRAND_TAGLINE, BRAND_TAGLINE_PARTS } from '@/lib/brand/assets';
import { cn } from '@/lib/utils';

type BrandTaglineProps = {
  className?: string;
};

/** Crisp CSS tagline for small UI (navbar). Matches package “PRACTICE • PREPARE • PROGRESS”. */
export function BrandTagline({ className }: BrandTaglineProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-start gap-[0.28em] whitespace-nowrap font-semibold uppercase leading-none tracking-[0.16em]',
        className,
      )}
      style={{ color: BRAND_COLORS.deepNavy }}
      aria-label={BRAND_TAGLINE}
    >
      {BRAND_TAGLINE_PARTS.map((part, index) => (
        <Fragment key={part}>
          {index > 0 ? (
            <span aria-hidden style={{ color: BRAND_COLORS.primaryPurple }}>
              •
            </span>
          ) : null}
          <span>{part}</span>
        </Fragment>
      ))}
    </span>
  );
}
