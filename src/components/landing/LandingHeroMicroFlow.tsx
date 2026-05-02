'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BarChart3, ChevronRight, FileText, ListOrdered, Mic, TrendingUp } from 'lucide-react';

/** Ultra-scannable: full product loop in one glance */
const STEPS = [
  { key: 'resume', label: 'Resume', Icon: FileText },
  { key: 'questions', label: 'Questions', Icon: ListOrdered },
  { key: 'answers', label: 'Answers', Icon: Mic },
  { key: 'score', label: 'Score', Icon: BarChart3 },
  { key: 'improve', label: 'Improve', Icon: TrendingUp },
] as const;

export function LandingHeroMicroFlow() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % STEPS.length), 1100);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border px-3 py-3.5 sm:px-4 sm:py-4"
      style={{
        borderColor: 'var(--card-border)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 90%, transparent), color-mix(in srgb, var(--accent-primary) 8%, transparent))',
        boxShadow: '0 0 48px color-mix(in srgb, var(--accent-primary) 14%, transparent), inset 0 1px 0 rgba(255,255,255,0.55)',
      }}
    >
      <p className="mb-2.5 text-center text-[10px] font-bold uppercase tracking-[0.22em] lg:text-left" style={{ color: 'var(--text-muted)' }}>
        One session · full loop
      </p>
      <div className="flex flex-wrap items-center justify-center gap-0.5 sm:gap-1 lg:justify-start">
        {STEPS.map((step, i) => {
          const Icon = step.Icon;
          const isActive = !reduce && i === active;
          return (
            <motion.div
              key={step.key}
              className="flex items-center gap-0.5 sm:gap-1"
              initial={false}
              animate={isActive ? { scale: [1, 1.04, 1] } : {}}
              transition={{ duration: 0.5, repeat: isActive ? Infinity : 0, repeatDelay: 0.6 }}
            >
              <div
                className="flex items-center gap-1 rounded-lg border px-2 py-1.5 sm:gap-1.5 sm:rounded-xl sm:px-2.5 sm:py-2"
                style={{
                  borderColor: isActive ? 'color-mix(in srgb, var(--accent-primary) 50%, transparent)' : 'var(--card-border)',
                  background: isActive
                    ? 'color-mix(in srgb, var(--accent-primary) 16%, transparent)'
                    : 'color-mix(in srgb, var(--card-bg) 75%, transparent)',
                  boxShadow: isActive ? '0 0 22px color-mix(in srgb, var(--accent-primary) 28%, transparent)' : undefined,
                }}
              >
                <Icon
                  className="size-[15px] shrink-0 sm:size-4"
                  style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="text-[10px] font-bold leading-none sm:text-[11px]" style={{ color: 'var(--text-primary)' }}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="mx-0.5 size-3 shrink-0 opacity-35 sm:size-3.5" style={{ color: 'var(--text-muted)' }} aria-hidden />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
