'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const LandingMeetInterviewers = dynamic(() => import('@/components/landing/LandingMeetInterviewers'), {
  loading: () => (
    <div
      className="mx-auto my-12 min-h-[420px] max-w-[1080px] animate-pulse motion-reduce:animate-none rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--bg-secondary)' }}
      aria-hidden
    />
  ),
});

const LandingTimelineSection = dynamic(() => import('@/components/landing/timeline/LandingTimelineSection'), {
  loading: () => (
    <div
      className="mx-auto my-10 min-h-[70vh] max-w-[1080px] animate-pulse motion-reduce:animate-none rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--bg-secondary)' }}
      aria-hidden
    />
  ),
});

const LandingScoringEngine = dynamic(() => import('@/components/landing/LandingScoringEngine'), {
  loading: () => (
    <div
      className="mx-auto my-12 min-h-[40vh] max-w-[1080px] animate-pulse motion-reduce:animate-none rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--card-bg)' }}
      aria-hidden
    />
  ),
});

const LandingFinalCta = dynamic(() => import('@/components/landing/LandingFinalCta'), {
  loading: () => (
    <div
      className="mx-auto my-12 min-h-[40vh] max-w-[1080px] animate-pulse motion-reduce:animate-none rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--card-bg)' }}
      aria-hidden
    />
  ),
});

const AudiencePathSection = dynamic(
  () =>
    import('@/components/landing/AudiencePathSection').then((m) => ({
      default: m.AudiencePathSection,
    })),
  {
    loading: () => (
      <div
        className="mx-auto my-10 min-h-[28rem] max-w-[1080px] animate-pulse motion-reduce:animate-none rounded-2xl px-7 opacity-40"
        style={{ background: 'var(--bg-secondary)' }}
        aria-hidden
      />
    ),
  },
);

const LandingTrustMetrics = dynamic(
  () =>
    import('@/components/landing/LandingTrustMetrics').then((m) => ({
      default: m.LandingTrustMetrics,
    })),
  {
    loading: () => (
      <div
        className="mx-auto min-h-[16rem] max-w-[1080px] animate-pulse motion-reduce:animate-none opacity-40"
        style={{ background: 'var(--bg-secondary)' }}
        aria-hidden
      />
    ),
  },
);

const InterviewTransformationSection = dynamic(
  () => import('@/components/landing/interview-transformation/InterviewTransformationSection'),
  {
    loading: () => (
      <div
        className="mx-auto my-12 min-h-[36rem] max-w-[1080px] animate-pulse motion-reduce:animate-none rounded-2xl px-7 opacity-40"
        style={{ background: 'var(--bg-secondary)' }}
        aria-hidden
      />
    ),
  },
);

const LandingFaq = dynamic(() => import('@/components/landing/LandingFaq'), {
  loading: () => (
    <div
      className="mx-auto my-12 min-h-[28rem] max-w-[1080px] animate-pulse motion-reduce:animate-none rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--card-bg)' }}
      aria-hidden
    />
  ),
});

/**
 * Lazy-load islands for below-the-fold marketing sections (kept out of the initial bundle).
 *
 * Perf: no client-side Supabase auth probe here — that pulled the large client into
 * the LCP path for a minor CTA swap. CTAs default to /signup; middleware redirects
 * already-authenticated users on to /dashboard, so logged-in users still land right.
 *
 * Viewport gate: next/dynamic alone still mounts as soon as the parent hydrates.
 * Defer the actual import until the reserved slot nears the viewport so timeline /
 * meet-interviewers media and JS stay off the initial mobile critical path.
 *
 * Exported as separate islands so `page.tsx` can interleave them with server sections.
 */

function ViewportDeferred({
  minHeightClass,
  rootMargin = '280px 0px',
  children,
}: {
  minHeightClass: string;
  rootMargin?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return;
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver: activate on next frame (avoid sync setState-in-effect lint).
    if (typeof IntersectionObserver === 'undefined') {
      const id = globalThis.requestAnimationFrame(() => setActive(true));
      return () => globalThis.cancelAnimationFrame(id);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActive(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.01 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [active, rootMargin]);

  return (
    <div ref={ref} className={minHeightClass}>
      {active ? children : null}
    </div>
  );
}

/** First below-fold client islands — keep lucide + CountUp off the LCP graph. */
export function AudiencePathSectionLazy() {
  return (
    <ViewportDeferred minHeightClass="min-h-[28rem]" rootMargin="200px 0px">
      <AudiencePathSection />
    </ViewportDeferred>
  );
}

export function LandingTrustMetricsLazy() {
  return (
    <ViewportDeferred minHeightClass="min-h-[16rem]" rootMargin="200px 0px">
      <LandingTrustMetrics />
    </ViewportDeferred>
  );
}

export function LandingTimelineSectionLazy() {
  return (
    <ViewportDeferred minHeightClass="min-h-[70vh]">
      <LandingTimelineSection />
    </ViewportDeferred>
  );
}

export function LandingMeetInterviewersLazy() {
  return (
    <ViewportDeferred minHeightClass="min-h-[420px]">
      <LandingMeetInterviewers />
    </ViewportDeferred>
  );
}

export function InterviewTransformationSectionLazy() {
  return (
    <ViewportDeferred minHeightClass="min-h-[36rem]" rootMargin="320px 0px">
      <InterviewTransformationSection />
    </ViewportDeferred>
  );
}

export function LandingFaqLazy() {
  return (
    <ViewportDeferred minHeightClass="min-h-[28rem]" rootMargin="320px 0px">
      <LandingFaq />
    </ViewportDeferred>
  );
}

export function LandingScoringEngineLazy() {
  return (
    <ViewportDeferred minHeightClass="min-h-[40vh]">
      <LandingScoringEngine />
    </ViewportDeferred>
  );
}

export function LandingFinalCtaLazy() {
  return (
    <ViewportDeferred minHeightClass="min-h-[40vh]" rootMargin="400px 0px">
      <LandingFinalCta isLoggedIn={false} />
    </ViewportDeferred>
  );
}
