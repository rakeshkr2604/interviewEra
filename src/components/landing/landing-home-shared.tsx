'use client';

import React from 'react';
import {
  motion,
  useReducedMotion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from 'motion/react';

/** Design tokens — CSS custom properties / theme-only literals. */
export const T = {
  bg: 'var(--bg-primary)',
  bg2: 'var(--bg-secondary)',
  bg3: 'var(--bg-tertiary)',
  card: 'var(--card-bg)',
  bord: 'var(--v3-bord)',
  bord2: 'var(--card-border)',
  text: 'var(--text-primary)',
  text2: 'var(--text-secondary)',
  text3: 'var(--text-muted)',
  acc: 'var(--accent-primary)',
  acc2: 'var(--accent-hover)',
  accdim: 'var(--v3-accdim)',
  accbrd: 'var(--v3-accbrd)',
  ok: 'var(--accent-success)',
  okdim: 'var(--v3-okdim)',
  okbrd: 'var(--v3-ok-brd)',
  warn: 'var(--accent-warning)',
  err: 'var(--accent-danger)',
  pur: 'var(--v3-pur)',
  ansBg: 'var(--v3-ans-bg)',
  scoreShadow: 'var(--v3-score-shadow)',
  ctaBg: 'var(--v3-cta-bg)',
  ctaBrd: 'var(--v3-cta-brd)',
  stepHover: 'var(--v3-step-hover)',
  badHi: 'var(--v3-bad-hi)',
  painBg: 'var(--v3-pain-bg)',
  painBrd: 'var(--v3-pain-brd)',
  painText: 'var(--v3-pain-text)',
} as const;

export function Reveal({
  children,
  delay = 0,
  className,
  /**
   * When the wrapped content is above-the-fold (LCP-critical), set
   * `instant` so we don't render at opacity:0 and bottleneck the LCP
   * paint on Framer hydration. The element still benefits from the
   * shared API surface so callers don't have to fork.
   */
  instant = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  instant?: boolean;
}) {
  const reduce = useReducedMotion();
  if (instant || reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

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
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? to : 0);
  const display = useTransform(mv, (v) => {
    if (decimals > 0) return v.toFixed(decimals);
    if (comma) return Math.round(v).toLocaleString('en-IN');
    return Math.round(v).toString();
  });

  React.useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(mv, to, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [inView, to, duration, delay, mv, reduce]);

  return <motion.span ref={ref}>{display}</motion.span>;
}
