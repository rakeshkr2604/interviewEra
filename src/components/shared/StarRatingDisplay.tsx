import { CANDIDATE_RATING } from '@/lib/landing/trust-metrics';
import { cn } from '@/lib/utils';

type StarRatingDisplayProps = {
  className?: string;
  /** Accessible name for the rating graphic. Defaults from CANDIDATE_RATING. */
  label?: string;
  /** Override the numeric rating used for glyphs + default label (tests / previews). */
  value?: number;
  outOf?: number;
};

/**
 * Renders average rating stars that match CANDIDATE_RATING (e.g. 4.5 → ★★★★☆).
 * Avoids the misleading full ★★★★★ glyph when the numeric average is not 5.0.
 */
export function buildStarRatingGlyphs(value: number, outOf: number): string {
  const clamped = Math.max(0, Math.min(outOf, value));
  const filled = Math.floor(clamped);
  const frac = clamped - filled;
  const hasHalf = frac >= 0.25 && frac < 0.75;
  const empty = outOf - filled - (hasHalf ? 1 : 0);
  return '★'.repeat(filled) + (hasHalf ? '☆' : '') + '☆'.repeat(Math.max(0, empty));
}

export function formatStarRatingLabel(value: number, outOf: number): string {
  return `${value} out of ${outOf} stars`;
}

export function StarRatingDisplay({
  className,
  value = CANDIDATE_RATING.value,
  outOf = CANDIDATE_RATING.outOf,
  label = formatStarRatingLabel(value, outOf),
}: StarRatingDisplayProps) {
  const glyphs = buildStarRatingGlyphs(value, outOf);

  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex items-center gap-1', className)}
    >
      <span aria-hidden="true">{glyphs}</span>
    </span>
  );
}
