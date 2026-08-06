'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { HERO_ROTATING_PHRASES } from '@/lib/landing/campus-content';
import { cn } from '@/lib/utils';

const ROTATE_MS = 2800;

/**
 * Structured campus hero H1:
 *   Improve
 *   [rotating phrase]
 *   with structured mock interviews at scale
 *
 * Intentional line blocks — avoids word-by-word wrapping that looks broken.
 */
export function CampusHeroHeadline({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const active = HERO_ROTATING_PHRASES[index] ?? HERO_ROTATING_PHRASES[0];

  useEffect(() => {
    if (reduce || HERO_ROTATING_PHRASES.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_ROTATING_PHRASES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <h1
      className={cn(
        'w-full max-w-[22rem] font-extrabold tracking-tight sm:max-w-[28rem] lg:max-w-none',
        'text-center text-[1.875rem] leading-[1.2] sm:text-[2.75rem] sm:leading-[1.16] md:text-[3.15rem] lg:text-left lg:text-[3.25rem]',
        className,
      )}
      style={{ color: 'var(--text-primary)' }}
    >
      <span className="block">Improve</span>

      <span
        className="relative mt-1.5 block min-h-[1.25em]"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Height reserve from longest phrase */}
        <span className="invisible block whitespace-nowrap" aria-hidden>
          {HERO_ROTATING_PHRASES.reduce((a, b) => (a.length >= b.length ? a : b))}
        </span>

        {reduce ? (
          <span
            className="absolute inset-x-0 top-0 block whitespace-nowrap font-extrabold"
            style={{ color: 'var(--accent-primary)' }}
          >
            {HERO_ROTATING_PHRASES[0]}
          </span>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={active}
              className="absolute inset-x-0 top-0 block whitespace-nowrap font-extrabold"
              style={{ color: 'var(--accent-primary)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {active}
            </motion.span>
          </AnimatePresence>
        )}
      </span>

      <span
        className="mx-auto mt-1.5 block max-w-[17ch] text-[0.9em] font-bold leading-[1.28] sm:max-w-[20ch] sm:text-[0.92em] lg:mx-0"
        style={{ color: 'var(--text-primary)' }}
      >
        with structured mock interviews at scale
      </span>
    </h1>
  );
}
