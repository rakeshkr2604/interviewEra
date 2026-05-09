'use client';

import dynamic from 'next/dynamic';

const LandingHeroScorecard = dynamic(() => import('@/components/landing/LandingHeroScorecard'), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-[20px]"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        minHeight: 'min(420px, 55vh)',
        boxShadow: 'var(--v3-score-shadow)',
      }}
      aria-hidden
    />
  ),
});

/** Client boundary required so `dynamic(..., { ssr: false })` is valid (Next.js 16). */
export default function LandingHeroScorecardSlot() {
  return (
    <div className="ie-hero-glow">
      <LandingHeroScorecard />
    </div>
  );
}
