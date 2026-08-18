'use client';

import { useEffect, useState } from 'react';

/**
 * Pricing hero H1:
 *   Practice smarter.
 *   [rotating phrase]
 *
 * CSS-only crossfade (no `motion/react`) — this is the LCP element on /pricing and
 * the landing stack deliberately dropped Framer Motion from that path.
 * Height is reserved from the longest phrase, so rotation never shifts layout.
 */

const ROTATING_PHRASES = [
  'Walk in prepared.',
  'Answer with confidence.',
  'Handle tough follow-ups.',
  'Know what to improve.',
] as const;

const ROTATE_MS = 2800;

const LONGEST_PHRASE = ROTATING_PHRASES.reduce((a, b) => (a.length >= b.length ? a : b));

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function PricingHeroHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion() || ROTATING_PHRASES.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem]">
      <span className="block">Practice smarter.</span>
      {/* Accessible name and indexable text stay stable; the rotation is decorative */}
      <span className="sr-only">{ROTATING_PHRASES[0]}</span>
      <span className="ie-hero-rotate" aria-hidden>
        <span className="ie-hero-rotate__sizer">{LONGEST_PHRASE}</span>
        {ROTATING_PHRASES.map((phrase, i) => (
          <span
            key={phrase}
            className="ie-hero-rotate__item"
            data-active={i === index ? 'true' : undefined}
          >
            {phrase}
          </span>
        ))}
      </span>
    </h1>
  );
}
