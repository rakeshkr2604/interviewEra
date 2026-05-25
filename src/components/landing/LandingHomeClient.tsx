'use client';

import dynamic from 'next/dynamic';

const LandingHomeMidFold = dynamic(() => import('@/components/landing/LandingHomeMidFold'), {
  loading: () => (
    <div
      className="mx-auto min-h-[560px] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
      style={{ background: 'var(--bg-secondary)' }}
      aria-hidden
    />
  ),
});

const LandingHomeBelowFold = dynamic(
  () => import('@/components/landing/LandingHomeBelowFold'),
  {
    loading: () => (
      <div
        className="mx-auto my-12 min-h-[40vh] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
        style={{ background: 'var(--card-bg)' }}
        aria-hidden
      />
    ),
  },
);

/**
 * Lazy-loads the below-the-fold marketing sections (kept out of the initial bundle).
 *
 * Perf: no client-side Supabase auth probe here — that pulled the large client into
 * the LCP path for a minor CTA swap. CTAs default to /signup; middleware redirects
 * already-authenticated users on to /dashboard, so logged-in users still land right.
 */
export default function LandingHomeClient() {
  return (
    <>
      <LandingHomeMidFold isLoggedIn={false} />
      <LandingHomeBelowFold isLoggedIn={false} />
    </>
  );
}
