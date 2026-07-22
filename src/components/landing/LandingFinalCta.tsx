'use client';

import Link from 'next/link';
import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';
import { T, Reveal } from '@/components/landing/landing-home-shared';
import { LANDING_HOME_INNER } from '@/lib/landing/container';

export default function LandingFinalCta({ isLoggedIn }: { isLoggedIn: boolean }) {
  const cta = isLoggedIn ? '/dashboard' : '/signup';

  return (
    <div className="border-t py-24 text-center sm:py-28" style={{ background: T.ctaBg, borderColor: T.ctaBrd }}>
      <div className={LANDING_HOME_INNER}>
        <Reveal>
          <div className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold" style={{ background: T.accdim, border: `1px solid ${T.accbrd}`, color: T.acc2 }}>
            Free to start — no card required
          </div>
          <h2 className="mb-4 font-[family-name:var(--font-bricolage)] text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight" style={{ color: T.text, letterSpacing: '-0.028em' }}>
            Your next interview<br />shouldn&apos;t be a guess.
          </h2>
          <p className="mx-auto mb-9 max-w-[29rem] text-base leading-relaxed" style={{ color: T.text2 }}>
            Run a scored mock from your actual resume and leave with measurable feedback — not a vague “you did fine.”
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <StartFreeCtaLink
              href={cta}
              section="home_below_fold_cta"
              className="v3-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-semibold no-underline"
              style={{ color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
            >
              Start Free
            </StartFreeCtaLink>
            <Link
              href="/pricing"
              className="v3-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] px-7 py-3.5 text-[15px] font-semibold no-underline"
              style={{ color: T.text, fontFamily: "'DM Sans', sans-serif", borderColor: T.ctaBrd }}
            >
              See pricing
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
