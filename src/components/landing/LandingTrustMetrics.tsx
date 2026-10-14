'use client';

import type { LucideIcon } from 'lucide-react';
import { AudioLines, FileSearch, Sparkles, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CountUp } from '@/components/landing/landing-home-shared';
import {
  LANDING_HOME_SECTION,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import {
  TRUST_METRICS,
  type TrustMetric,
  type TrustMetricId,
} from '@/lib/landing/trust-metrics';
import { cn } from '@/lib/utils';
/** Co-located with this viewport-deferred island (Loop 18 critical CSS split). */
import './LandingTrustMetrics.css';

const COUNTER_DURATION_S = 0.7;
const STAGGER_S = 0.1;

const METRIC_ICONS: Record<TrustMetricId, LucideIcon> = {
  candidates: Users,
  interviews: AudioLines,
  resume: FileSearch,
  questions: Sparkles,
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function formatMetricValue(value: number): string {
  return value >= 1000 ? value.toLocaleString('en-US') : String(value);
}

function TrustMetricItem({
  metric,
  index,
  animate,
}: {
  metric: TrustMetric;
  index: number;
  animate: boolean;
}) {
  const Icon = METRIC_ICONS[metric.id];
  const announced = `${formatMetricValue(metric.value)}${metric.suffix} ${metric.label}`;

  return (
    <li
      className={cn(
        'ie-trust-metric group relative px-4 py-8 text-center sm:px-5 sm:py-9',
        `ie-trust-metric--${metric.tone}`,
        animate && 'ie-trust-metric--visible',
      )}
      style={{ transitionDelay: `${index * STAGGER_S}s` }}
    >
      <div className="ie-trust-metric__inner mx-auto flex max-w-[15rem] flex-col items-center">
        <div className="ie-trust-metric__symbol" aria-hidden>
          <span className="ie-trust-metric__icon-tile">
            <Icon className="size-[1.125rem]" strokeWidth={1.85} />
          </span>
        </div>

        <dl className="ie-trust-metric__body m-0 w-full">
          <dt className="sr-only">{metric.label}</dt>
          <dd className="m-0">
            <p className="ie-trust-metric__value m-0 font-[family-name:var(--font-bricolage)] text-[clamp(2rem,4.5vw,2.75rem)] font-extrabold leading-none tracking-tight">
              <span aria-hidden className="ie-trust-metric__value-inner inline-flex items-baseline justify-center tabular-nums">
                <CountUp
                  to={metric.value}
                  comma={metric.value >= 1000}
                  duration={COUNTER_DURATION_S}
                  delay={index * STAGGER_S}
                />
                <span className="ie-trust-metric__suffix">{metric.suffix}</span>
              </span>
              <span className="sr-only">{announced}</span>
            </p>

            <p className="ie-trust-metric__label ie-lh-text-primary m-0 mt-3 text-sm font-semibold leading-snug sm:text-[15px]">
              {metric.label}
            </p>

            {metric.description ? (
              <p className="ie-trust-metric__desc ie-lh-text-muted m-0 mt-1.5 text-xs leading-relaxed sm:text-[13px]">
                {metric.description}
              </p>
            ) : null}
          </dd>
        </dl>
      </div>
    </li>
  );
}

export function LandingTrustMetrics() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      const frame = requestAnimationFrame(() => setInView(true));
      return () => cancelAnimationFrame(frame);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: '-8% 0px' },
    );

    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn(
        LANDING_HOME_SECTION,
        'landing-trust-metrics ie-lh-surface-35 border-y',
        inView && 'is-in-view',
      )}
      aria-labelledby="landing-trust-metrics-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <h2 id="landing-trust-metrics-heading" className="sr-only">
          InterviewEra platform usage
        </h2>

        <ul className="ie-trust-metrics-grid m-0 grid list-none gap-0 p-0">
          {TRUST_METRICS.map((metric, index) => (
            <TrustMetricItem
              key={metric.label}
              metric={metric}
              index={index}
              animate={inView}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
