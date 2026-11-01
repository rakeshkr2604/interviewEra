'use client';

import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '@/lib/community/use-community-storage';

/** Keep in sync with the sr-only fallback sentence below. */
const ROTATING_PHRASES = [
  'resume analysis',
  'role-specific questions',
  'structured answers',
  'realistic mock interviews',
] as const;

const INTERVAL_MS = 2400;

/**
 * Hero subtitle word rotator. Index 0 always renders first (matches SSR),
 * so there is no hydration mismatch or layout shift on mount; the interval
 * only starts after hydration and is skipped entirely under
 * prefers-reduced-motion.
 */
export function PricingHeroRotator() {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % ROTATING_PHRASES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  return (
    <>
      <span className="sr-only">
        resume analysis, role-specific questions, structured answers, and realistic mock
        interviews
      </span>
      <span className="ie-hero-rotator" aria-hidden="true">
        <span key={index} className="ie-hero-rotator__word">
          {ROTATING_PHRASES[index]}
        </span>
      </span>
    </>
  );
}
