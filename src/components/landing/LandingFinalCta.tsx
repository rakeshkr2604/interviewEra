'use client';

import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { T, Reveal } from '@/components/landing/landing-home-shared';
import { LANDING_HOME_INNER } from '@/lib/landing/container';

export default function LandingFinalCta({ isLoggedIn }: { isLoggedIn: boolean }) {
  const cta = isLoggedIn ? '/dashboard' : '/signup';

  return (
    <section
      className="border-t py-24 text-center sm:py-28"
      style={{ background: T.ctaBg, borderColor: T.ctaBrd }}
      aria-labelledby="landing-final-cta-heading"
    >
      <div className={LANDING_HOME_INNER}>
        <Reveal>
          <div className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold" style={{ background: T.accdim, border: `1px solid ${T.accbrd}`, color: T.acc2 }}>
            Free to start — no card required
          </div>
          <h2
            id="landing-final-cta-heading"
            className="mb-4 font-[family-name:var(--font-bricolage)] text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight text-balance"
            style={{ color: T.text, letterSpacing: '-0.028em' }}
          >
            Ready to start your first Mock Interview?
          </h2>
          <p className="mx-auto mb-9 max-w-[29rem] text-base leading-relaxed" style={{ color: T.text2 }}>
            Run a scored Mock Interview from your actual resume and leave with Answer Feedback and an
            Interview Report — not a vague “you did fine.”
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <StartFreeCtaLink
              href={cta}
              section="home_below_fold_cta"
              ctaText="Start Free Mock Interview"
              className="v3-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-semibold no-underline"
              style={{ color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
            >
              Start Free Mock Interview
            </StartFreeCtaLink>
            <TrackedCtaLink
              href="/pricing"
              ctaKey={CTA_KEYS.PRICING_CTA}
              ctaText="See Pricing"
              section="home_below_fold_cta"
              className="v3-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] px-7 py-3.5 text-[15px] font-semibold no-underline"
              style={{ color: T.text, fontFamily: "'DM Sans', sans-serif", borderColor: T.ctaBrd }}
            >
              See Pricing
            </TrackedCtaLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
