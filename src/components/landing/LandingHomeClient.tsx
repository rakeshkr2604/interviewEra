'use client';

import dynamic from 'next/dynamic';

const LandingMeetInterviewers = dynamic(() => import('@/components/landing/LandingMeetInterviewers'), {
  loading: () => (
    <div
      className="mx-auto my-12 min-h-[420px] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--bg-secondary)' }}
      aria-hidden
    />
  ),
});

const LandingScrollShowcase = dynamic(() => import('@/components/landing/LandingScrollShowcase'), {
  loading: () => (
    <div
      className="mx-auto my-10 min-h-[70vh] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--bg-secondary)' }}
      aria-hidden
    />
  ),
});

const LandingHomeMidFold = dynamic(() => import('@/components/landing/LandingHomeMidFold'), {
  loading: () => (
    <div
      className="mx-auto min-h-[560px] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--bg-secondary)' }}
      aria-hidden
    />
  ),
});

const LandingScoringEngine = dynamic(() => import('@/components/landing/LandingScoringEngine'), {
  loading: () => (
    <div
      className="mx-auto my-12 min-h-[40vh] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--card-bg)' }}
      aria-hidden
    />
  ),
});

const LandingFinalCta = dynamic(() => import('@/components/landing/LandingFinalCta'), {
  loading: () => (
    <div
      className="mx-auto my-12 min-h-[40vh] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
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
 * Exported as separate islands so `page.tsx` can interleave them with server sections.
 */

export function LandingScrollShowcaseLazy() {
  return <LandingScrollShowcase />;
}

export function LandingMeetInterviewersLazy() {
  return <LandingMeetInterviewers />;
}

/** Readiness-stage cards — sits after AudiencePath (role) in the Phase 3j hierarchy. */
export function LandingHomeMidFoldLazy() {
  return <LandingHomeMidFold isLoggedIn={false} />;
}

export function LandingScoringEngineLazy() {
  return <LandingScoringEngine />;
}

export function LandingFinalCtaLazy() {
  return <LandingFinalCta isLoggedIn={false} />;
}
