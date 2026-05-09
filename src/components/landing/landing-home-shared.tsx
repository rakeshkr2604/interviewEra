'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export { T } from '@/components/landing/landing-home-tokens';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Reveal — IntersectionObserver + CSS only.
 * Drops `motion/react` from the initial landing chunk; the previous
 * Framer-Motion implementation cost ~50 KiB on the LCP path.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  /**
   * For above-the-fold (LCP-critical) content set `instant` so we render
   * the children immediately without any opacity transition.
   */
  instant = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  instant?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = React.useState<boolean>(instant);

  React.useEffect(() => {
    if (instant) return;
    if (prefersReducedMotion()) {
      setShown(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '-8% 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [instant]);

  if (instant) return <div className={className}>{children}</div>;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 520ms cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 520ms cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: shown ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

/**
 * CountUp — rAF-driven, no `motion/react` dependency.
 * Same easing curve (cubic out) and locale formatting as before.
 */
export function CountUp({
  to,
  decimals = 0,
  duration = 1.0,
  comma = false,
  delay = 0,
}: {
  to: number;
  decimals?: number;
  duration?: number;
  comma?: boolean;
  delay?: number;
}) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = React.useState<number>(0);

  const formatted = React.useMemo(() => {
    if (decimals > 0) return value.toFixed(decimals);
    if (comma) return Math.round(value).toLocaleString('en-IN');
    return Math.round(value).toString();
  }, [value, decimals, comma]);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      setValue(to);
      return;
    }
    if (!('IntersectionObserver' in window)) {
      setValue(to);
      return;
    }

    let raf = 0;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      const startAt = performance.now() + delay * 1000;
      const ease = (t: number) => 1 - Math.pow(1 - t, 3);
      const tick = (now: number) => {
        const elapsed = Math.max(0, now - startAt);
        const t = Math.min(1, elapsed / (duration * 1000));
        setValue(to * ease(t));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            start();
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '-10% 0px' },
    );
    io.observe(node);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to, duration, delay]);

  const widthClass = comma ? 'min-w-[5ch]' : decimals > 0 ? 'min-w-[3.2ch]' : 'min-w-[2.5ch]';

  return (
    <span ref={ref} className={cn('tabular-nums inline-block text-right', widthClass)}>
      {formatted}
    </span>
  );
}
