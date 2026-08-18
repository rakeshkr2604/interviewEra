'use client';

import { useEffect, useState } from 'react';

/**
 * Homepage hero H1 (left column):
 *   Mock Interview practice
 *   [rotating accent]
 *
 * CSS-only crossfade (no `motion/react`) — landing deliberately dropped Framer
 * Motion from the LCP path. Height is reserved from the longest phrase so
 * rotation never shifts the CTA / trust strip.
 */

export const LANDING_HERO_ROTATING_PHRASES = [
  'built for campus placements.',
  'built for real interviews.',
  'built for early-career hiring.',
  'built around your resume.',
] as const;

const ROTATE_MS = 2800;

const LONGEST_PHRASE = LANDING_HERO_ROTATING_PHRASES.reduce((a, b) =>
  a.length >= b.length ? a : b,
);

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export default function LandingHeroHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion() || LANDING_HERO_ROTATING_PHRASES.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % LANDING_HERO_ROTATING_PHRASES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <h1
      id="landing-hero-heading"
      className="hero-copy-heading mb-3.5 text-pretty sm:mb-5"
      style={{
        fontFamily: "'Bricolage Grotesque', sans-serif",
        fontWeight: 800,
        letterSpacing: '-0.03em',
        color: 'var(--text-primary)',
      }}
    >
      <span className="hero-copy-heading__lead block">Mock Interview practice</span>
      {/* Stable accessible / indexable name; rotation is decorative */}
      <span className="sr-only">{LANDING_HERO_ROTATING_PHRASES[0]}</span>
      <span className="ie-lh-hero-rotate hero-copy-heading__accent" aria-hidden>
        <span className="ie-lh-hero-rotate__sizer">{LONGEST_PHRASE}</span>
        {LANDING_HERO_ROTATING_PHRASES.map((phrase, i) => (
          <span
            key={phrase}
            className="ie-lh-hero-rotate__item v3-hero-gradient-text"
            data-active={i === index ? 'true' : undefined}
          >
            {phrase}
          </span>
        ))}
      </span>
    </h1>
  );
}
