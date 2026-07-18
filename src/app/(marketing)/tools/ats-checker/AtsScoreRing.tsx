'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Score-band tokens — same CSS vars as landing Scoring Engine / ATS status text. */
export function scoreBand(score: number): {
  color: string;
  label: string;
  /** Subtle card fill — 8% mix keeps WCAG text contrast on --text-primary */
  surface: string;
  topAccent: string;
} {
  if (score >= 75) {
    return {
      color: 'var(--accent-success)',
      label: 'Strong',
      surface: 'color-mix(in srgb, var(--accent-success) 8%, var(--card-bg))',
      topAccent: 'var(--accent-success)',
    };
  }
  if (score >= 50) {
    return {
      color: 'var(--accent-warning)',
      label: 'Needs work',
      surface: 'color-mix(in srgb, var(--accent-warning) 8%, var(--card-bg))',
      topAccent: 'var(--accent-warning)',
    };
  }
  return {
    color: 'var(--accent-danger)',
    label: 'At risk',
    surface: 'color-mix(in srgb, var(--accent-danger) 8%, var(--card-bg))',
    topAccent: 'var(--accent-danger)',
  };
}

/** @deprecated alias — prefer scoreBand when surface/accent needed */
export function scoreTone(score: number) {
  const b = scoreBand(score);
  return { color: b.color, label: b.label };
}

/**
 * Per-dimension score ring — never used as a blended overall gauge.
 * Animates once on mount unless prefers-reduced-motion.
 */
export function AtsScoreRing({
  score,
  size = 64,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const tone = scoreBand(score);
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    const id = requestAnimationFrame(() => setReady(true));
    return () => {
      mq.removeEventListener('change', sync);
      cancelAnimationFrame(id);
    };
  }, []);

  const offset = ready || reduceMotion ? c * (1 - clamped / 100) : c;

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${clamped} out of 100 — ${tone.label}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="color-mix(in srgb, var(--card-border) 85%, transparent)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: reduceMotion ? undefined : 'stroke-dashoffset 0.85s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex items-baseline leading-none">
          <span
            className={cn(
              'font-bold tabular-nums',
              size >= 64 ? 'text-sm sm:text-base' : 'text-xs',
            )}
            style={{ color: tone.color }}
          >
            {clamped}
          </span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              size >= 64 ? 'text-[9px] sm:text-[10px]' : 'text-[8px]',
            )}
            style={{ color: 'var(--text-muted)' }}
          >
            /100
          </span>
        </span>
      </div>
    </div>
  );
}
