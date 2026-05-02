'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { LandingUploadZone } from '@/components/landing/LandingUploadZone';

const LIVE_STEPS = [
  {
    id: 1,
    title: 'Upload complete',
    detail: 'Resume indexed · ready for question gen',
    progress: 100,
    icon: Check,
    done: true,
  },
  {
    id: 2,
    title: 'Generating questions…',
    detail: 'From your bullets — not a static bank',
    progress: 68,
    icon: Loader2,
    done: false,
  },
  {
    id: 3,
    title: 'Scoring answer…',
    detail: '5 dimensions · rubric in motion',
    progress: 82,
    icon: Sparkles,
    done: false,
  },
] as const;

export function LandingHeroProductSim({ isLoggedIn }: { isLoggedIn: boolean }) {
  const reduce = useReducedMotion();
  const [focusStep, setFocusStep] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setFocusStep((i) => (i + 1) % LIVE_STEPS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reduce]);

  const activeIndex = reduce ? 0 : focusStep;

  return (
    <div
      className="overflow-hidden rounded-[20px] border shadow-2xl"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
        boxShadow:
          'var(--card-shadow), 0 0 72px color-mix(in srgb, var(--accent-primary) 18%, transparent), 0 0 0 1px color-mix(in srgb, white 50%, transparent) inset',
      }}
    >
      <div
        className="border-b px-5 py-4 sm:px-6"
        style={{
          borderColor: 'var(--card-border)',
          background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 14%, transparent), transparent)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Live system simulation
            </p>
            <p className="text-sm font-bold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              States cycle like a real session — then upload yours
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: 'color-mix(in srgb, var(--accent-success) 15%, transparent)',
              color: 'var(--accent-success)',
            }}
          >
            Simulated
          </span>
        </div>

        <ul className="mt-5 space-y-3">
          {LIVE_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isFocus = i === activeIndex;
            const spin = step.id === 2 && isFocus && !reduce;
            return (
              <motion.li
                key={step.id}
                className="flex items-start gap-3 rounded-xl border px-3 py-3 sm:px-4"
                style={{
                  borderColor: isFocus ? 'color-mix(in srgb, var(--accent-primary) 45%, transparent)' : 'var(--card-border)',
                  background: isFocus
                    ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
                    : 'color-mix(in srgb, var(--card-bg) 50%, transparent)',
                  boxShadow: isFocus ? '0 0 24px color-mix(in srgb, var(--accent-primary) 18%, transparent)' : undefined,
                }}
                layout
                transition={{ duration: 0.35 }}
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{
                    background: step.done
                      ? 'var(--accent-success)'
                      : 'linear-gradient(135deg, var(--accent-primary), #7c3aed)',
                  }}
                >
                  {step.done ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : (
                    <Icon className={`size-4 ${spin ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold sm:text-sm" style={{ color: 'var(--text-primary)' }}>
                    Step {step.id}: {step.title}
                  </p>
                  <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                    {step.detail}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, var(--accent-primary), #a78bfa)',
                      }}
                      initial={false}
                      animate={{ width: isFocus || step.done ? `${step.progress}%` : `${Math.min(step.progress, 28)}%` }}
                      transition={{ duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      <div className="p-5 sm:p-6">
        <p className="mb-4 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Run it on your CV — same engine, your data
        </p>
        <LandingUploadZone isLoggedIn={isLoggedIn} embeddedInHero />
      </div>
    </div>
  );
}
