import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CANDIDATE_RATING } from '@/lib/landing/trust-metrics';
import {
  buildStarRatingGlyphs,
  formatStarRatingLabel,
  StarRatingDisplay,
} from './StarRatingDisplay';

describe('StarRatingDisplay', () => {
  it('builds half-star glyphs that match the numeric average (not five filled stars)', () => {
    expect(buildStarRatingGlyphs(4.5, 5)).toBe('★★★★☆');
    expect(buildStarRatingGlyphs(5, 5)).toBe('★★★★★');
    expect(buildStarRatingGlyphs(3, 5)).toBe('★★★☆☆');
  });

  it('formats an accessible label from the dynamic rating value', () => {
    expect(formatStarRatingLabel(CANDIDATE_RATING.value, CANDIDATE_RATING.outOf)).toBe(
      '4.5 out of 5 stars',
    );
    expect(formatStarRatingLabel(4.2, 5)).toBe('4.2 out of 5 stars');
  });

  it('renders role=img with the accessible name and hides decorative glyphs', () => {
    const html = renderToStaticMarkup(
      createElement(StarRatingDisplay, {
        value: CANDIDATE_RATING.value,
        outOf: CANDIDATE_RATING.outOf,
      }),
    );
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="4.5 out of 5 stars"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('★★★★☆');
    expect(html).not.toContain('★★★★★');
  });
});
