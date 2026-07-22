'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LandingHeroSimulatorPoster } from '@/components/landing/LandingHeroSimulatorPoster';
import { T } from '@/components/landing/landing-home-tokens';
import {
  SCROLL_SHOWCASE_REPORT_DIMS,
  SCROLL_SHOWCASE_REPORT_SCORE,
  SCROLL_SHOWCASE_STEPS,
} from '@/components/landing/LandingScrollShowcase.data';
import { LANDING_HOME_INNER, LANDING_HOME_SECTION } from '@/lib/landing/container';
import { cn } from '@/lib/utils';
import './LandingScrollShowcase.css';

const EQ_BARS = [
  { h: 18, dur: 0.9, d: 0 },
  { h: 28, dur: 1.1, d: 0.1 },
  { h: 14, dur: 0.85, d: 0.2 },
  { h: 32, dur: 1.05, d: 0.05 },
  { h: 22, dur: 0.95, d: 0.15 },
  { h: 36, dur: 1.15, d: 0.08 },
  { h: 16, dur: 0.88, d: 0.22 },
  { h: 30, dur: 1.0, d: 0.12 },
  { h: 20, dur: 0.92, d: 0.18 },
  { h: 34, dur: 1.08, d: 0.04 },
  { h: 24, dur: 0.98, d: 0.14 },
  { h: 12, dur: 0.82, d: 0.24 },
] as const;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function ResumeVisual() {
  return (
    <div className="relative w-[min(100%,330px)]">
      <div
        className="relative overflow-hidden rounded-[var(--ss-card-radius)] border p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
          background: `linear-gradient(165deg, color-mix(in srgb, var(--accent-primary) 9%, transparent), color-mix(in srgb, var(--card-bg) 80%, transparent))`,
        }}
      >
        <div className="mb-5 flex items-center gap-3.5">
          <div
            className="size-11 shrink-0 rounded-full"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--v3-pur, #a855f7))' }}
            aria-hidden
          />
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-[7.5rem] rounded-full" style={{ background: 'color-mix(in srgb, var(--text-primary) 28%, transparent)' }} />
            <div className="h-2 w-20 rounded-full" style={{ background: 'color-mix(in srgb, var(--text-primary) 12%, transparent)' }} />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {[92, 76, 88, 60, 84, 48].map((w, i) => (
            <div
              key={i}
              className="h-2 rounded"
              style={{
                width: `${w}%`,
                background:
                  i === 1 || i === 3
                    ? 'color-mix(in srgb, var(--accent-primary) 45%, transparent)'
                    : 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
                boxShadow: i === 1 || i === 3 ? '0 0 12px color-mix(in srgb, var(--accent-primary) 35%, transparent)' : undefined,
              }}
            />
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {['React', 'Node.js', 'Kafka'].map((tag) => (
            <span
              key={tag}
              className="rounded-md border px-2.5 py-1 text-[11px] font-semibold"
              style={{
                color: 'var(--accent-hover)',
                borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
        <div
          className="ie-ss-scan pointer-events-none absolute inset-x-2 h-14 rounded-xl"
          style={{
            background:
              'linear-gradient(180deg, transparent, color-mix(in srgb, var(--accent-primary) 18%, transparent), transparent)',
          }}
          aria-hidden
        />
      </div>
      <div
        className="ie-ss-float absolute -right-2 top-6 max-w-[10.5rem] rounded-xl border px-3 py-2.5 text-xs leading-snug shadow-lg sm:-right-10"
        style={{
          color: 'var(--text-primary)',
          background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
          borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, var(--card-border))',
        }}
      >
        Asks about <strong style={{ color: 'var(--accent-hover)' }}>your</strong> Kafka pipeline
      </div>
      <div
        className="ie-ss-float-delay absolute -right-1 bottom-14 max-w-[10.5rem] rounded-xl border px-3 py-2.5 text-xs leading-snug shadow-lg sm:-right-8"
        style={{
          color: 'var(--text-primary)',
          background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
          borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, var(--card-border))',
        }}
      >
        Difficulty tuned to your experience
      </div>
    </div>
  );
}

function VoiceVisual({ active }: { active: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && !prefersReducedMotion()) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [active]);

  return (
    <div className="ie-ss-voice flex w-[min(100%,300px)] flex-col items-center">
      <div
        className="ie-ss-live-badge mb-2 self-start inline-flex items-center gap-1.5 rounded-full border px-3 py-1"
        style={{
          background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
          borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, var(--card-border))',
        }}
      >
        <span className="ie-ss-blink size-1.5 rounded-full bg-[var(--accent-danger)]" aria-hidden />
        <span className="text-[10px] font-bold tracking-[0.16em]" style={{ color: 'var(--text-primary)' }}>
          LIVE INTERVIEW
        </span>
      </div>

      <div className="ie-ss-media relative w-full">
        <LandingHeroSimulatorPoster />
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster="/assets/female-avatar-600.webp"
          aria-hidden
        >
          <source src="/assets/female-ai.mp4" type="video/mp4" />
        </video>
      </div>

      <p className="ie-ss-avatar-name mt-2 mb-0 text-center text-[13px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
        Priya <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>· AI Interviewer</span>
      </p>

      <div className="ie-ss-eq mt-1.5 flex h-8 items-center gap-1" aria-hidden>
        {EQ_BARS.map((b, i) => (
          <div
            key={i}
            className="ie-ss-eq-bar"
            style={{
              height: Math.round(b.h * 0.72),
              ['--ss-eq-dur' as string]: `${b.dur}s`,
              ['--ss-eq-delay' as string]: `${b.d}s`,
            }}
          />
        ))}
      </div>

      <div
        className="mt-3.5 w-full rounded-2xl border px-[18px] py-3.5"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
          background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
        }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="ie-ss-blink size-1.5 rounded-full" style={{ background: 'var(--v3-pur, #a855f7)' }} aria-hidden />
          <span className="text-[10px] font-bold tracking-[0.18em]" style={{ color: 'var(--accent-hover)' }}>
            LIVE FOLLOW-UP
          </span>
        </div>
        <p className="m-0 text-[15px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
          “You mentioned caching — how did you handle invalidation?”
        </p>
      </div>
    </div>
  );
}

function ReportVisual({ active }: { active: boolean }) {
  const [filled, setFilled] = useState(false);
  const [score, setScore] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const reduce = prefersReducedMotion();
    let raf = 0;
    let raf2 = 0;
    raf = requestAnimationFrame(() => {
      setFilled(true);
      if (reduce) {
        setScore(SCROLL_SHOWCASE_REPORT_SCORE);
        return;
      }
      const target = SCROLL_SHOWCASE_REPORT_SCORE;
      const t0 = performance.now();
      const duration = 1100;
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setScore(Number((target * (1 - Math.pow(1 - p, 3))).toFixed(1)));
        if (p < 1) raf2 = requestAnimationFrame(step);
      };
      raf2 = requestAnimationFrame(step);
    });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
    };
  }, [active]);

  return (
    <div
      className="w-[min(100%,350px)] rounded-[var(--ss-card-radius)] border p-7 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, var(--card-border))',
        background: `linear-gradient(165deg, color-mix(in srgb, var(--accent-primary) 10%, transparent), color-mix(in srgb, var(--card-bg) 85%, transparent))`,
      }}
    >
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="mb-1.5 text-[11px] font-bold tracking-[0.18em]" style={{ color: 'var(--accent-hover)' }}>
            INTERVIEW REPORT
          </div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Backend · Round 2
          </div>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span
            className="bg-clip-text text-[42px] font-extrabold text-transparent"
            style={{ backgroundImage: 'linear-gradient(120deg, var(--accent-hover), var(--v3-pur, #c084fc))' }}
          >
            {score.toFixed(1)}
          </span>
          <span className="text-[15px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            /10
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-3.5">
        {SCROLL_SHOWCASE_REPORT_DIMS.map((d) => (
          <div key={d.label} className="flex flex-col gap-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {d.label}
              </span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                {d.w}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded" style={{ background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)' }}>
              <div
                className="ie-ss-bar-fill"
                data-filled={filled ? 'true' : 'false'}
                style={{ ['--ss-bar-w' as string]: `${d.w}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        className="mt-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, var(--card-border))',
          background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
        }}
      >
        <span className="size-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} aria-hidden />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Strong practice signal
        </span>
      </div>
    </div>
  );
}

export default function LandingScrollShowcase() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const ticking = useRef(false);

  const syncActive = useCallback(() => {
    const nodes = stepRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const mid = window.innerHeight * 0.45;
    let next = 0;
    nodes.forEach((node, i) => {
      const r = node.getBoundingClientRect();
      if (r.top <= mid) next = i;
    });
    setActive((prev) => (prev === next ? prev : next));
  }, []);

  useEffect(() => {
    const boot = requestAnimationFrame(() => syncActive());
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        ticking.current = false;
        syncActive();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(boot);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [syncActive]);

  return (
    <section id="how" className={cn(LANDING_HOME_SECTION, 'ie-scroll-showcase')} aria-labelledby="scroll-showcase-heading">
      <div className={LANDING_HOME_INNER}>
        <div className="max-w-[540px]">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
              background: 'var(--v3-accdim)',
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} aria-hidden />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent-hover)' }}>
              How it works
            </span>
          </div>
          <h2
            id="scroll-showcase-heading"
            className="mt-5 text-balance font-[family-name:var(--font-bricolage)] text-[clamp(28px,3.6vw,48px)] font-extrabold leading-[1.08] tracking-tight"
            style={{ color: T.text }}
          >
            Practice like it&apos;s the real thing.
          </h2>
          <p className="mt-4 max-w-[34rem] text-base leading-relaxed sm:text-lg" style={{ color: T.text2 }}>
            One interview loop, three built-in advantages. Scroll through what happens under the hood.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] lg:gap-16">
          <div className="min-w-0">
            {SCROLL_SHOWCASE_STEPS.map((step, i) => (
              <article
                key={step.id}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="ie-ss-step"
                data-active={active === i ? 'true' : 'false'}
                aria-current={active === i ? 'step' : undefined}
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-[13px] font-bold tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>
                    {step.num}
                  </span>
                  <span
                    className="h-px max-w-[60px] flex-1"
                    style={{ background: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)' }}
                    aria-hidden
                  />
                </div>
                <h3
                  className="m-0 text-balance font-[family-name:var(--font-bricolage)] text-[clamp(22px,2.4vw,32px)] font-bold leading-snug tracking-tight"
                  style={{ color: T.text }}
                >
                  {step.title}
                </h3>
                <p className="m-0 max-w-[26rem] text-[17px] leading-[1.65]" style={{ color: T.text2 }}>
                  {step.body}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2.5">
                  {step.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border px-3.5 py-1.5 text-[13px] font-medium"
                      style={{
                        color: 'var(--text-secondary)',
                        borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
                        background: 'color-mix(in srgb, var(--accent-primary) 7%, transparent)',
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="ie-ss-stage" aria-hidden={false}>
              <div className="ie-ss-visual" data-active={active === 0 ? 'true' : 'false'} aria-hidden={active !== 0}>
                <ResumeVisual />
              </div>
              <div className="ie-ss-visual" data-active={active === 1 ? 'true' : 'false'} aria-hidden={active !== 1}>
                <VoiceVisual active={active === 1} />
              </div>
              <div className="ie-ss-visual" data-active={active === 2 ? 'true' : 'false'} aria-hidden={active !== 2}>
                <ReportVisual active={active === 2} />
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-2" aria-hidden>
              {SCROLL_SHOWCASE_STEPS.map((step, i) => (
                <span key={step.id} className="ie-ss-dot" data-active={active === i ? 'true' : 'false'} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
