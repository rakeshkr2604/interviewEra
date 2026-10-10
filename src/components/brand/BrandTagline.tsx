import { Fragment } from 'react';
import { BRAND_COLORS, BRAND_TAGLINE_PARTS } from '@/lib/brand/assets';
import { cn } from '@/lib/utils';

type BrandTaglineProps = {
  className?: string;
  /**
   * `chrome` — follows theme text tokens (dark chrome keeps AA contrast).
   * `light-plate` — deep navy on white lockup plates (full navbar / footer-style).
   */
  surface?: 'chrome' | 'light-plate';
};

/**
 * Crisp CSS tagline for small UI (navbar). Matches package “PRACTICE • PREPARE • PROGRESS”.
 * Default chrome surface uses theme text tokens so dark theme keeps WCAG AA contrast.
 * Do not hardcode deep navy on open dark surfaces — only on light plates.
 */
export function BrandTagline({ className, surface = 'chrome' }: BrandTaglineProps) {
  const wordColor =
    surface === 'light-plate' ? BRAND_COLORS.deepNavy : 'var(--text-primary)';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-start gap-[0.28em] whitespace-nowrap font-semibold uppercase leading-none tracking-[0.16em]',
        className,
      )}
      style={{ color: wordColor }}
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
