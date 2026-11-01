'use client';

import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { T, Reveal } from '@/components/landing/landing-home-shared';
import { LANDING_HOME_INNER } from '@/lib/landing/container';
import { StarRatingDisplay } from '@/components/shared/StarRatingDisplay';
import { CANDIDATE_RATING } from '@/lib/landing/trust-metrics';

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
          <p
            className="mb-4 text-sm font-medium"
            style={{ color: T.text2 }}
          >
            <span className="tracking-wide" style={{ color: T.warn }}>
              <StarRatingDisplay />{' '}
              {CANDIDATE_RATING.value} / {CANDIDATE_RATING.outOf} {CANDIDATE_RATING.label}
            </span>
          </p>
          <div className="mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold" style={{ background: T.accdim, border: `1px solid ${T.accbrd}`, color: T.acc2 }}>
            Free to start — no card required
          </div>
          <h2
            id="landing-final-cta-heading"
            className="mb-4 font-[family-name:var(--font-bricolage)] text-[clamp(28px,4vw,48px)] font-extrabold tracking-tight text-balance"
            style={{ color: T.text, letterSpacing: '-0.028em' }}
          >
            Your next interview deserves better preparation.
          </h2>
          <p className="mx-auto mb-9 max-w-[32rem] text-base leading-relaxed" style={{ color: T.text2 }}>
            Start with free preparation tools, practise a realistic mock interview and understand what
            to improve before your next real interview.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <StartFreeCtaLink
              href={cta}
              section="home_below_fold_cta"
              ctaText="Create Your Free Account"
              className="v3-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-semibold no-underline"
              style={{ color: '#fff', fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              Create Your Free Account
            </StartFreeCtaLink>
            <TrackedCtaLink
              href="/pricing"
              ctaKey={CTA_KEYS.PRICING_CTA}
              ctaText="Compare Plans"
              section="home_below_fold_cta"
              className="v3-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] px-7 py-3.5 text-[15px] font-semibold no-underline"
              style={{ color: T.text, fontFamily: 'var(--font-dm-sans), sans-serif', borderColor: T.ctaBrd }}
            >
              Compare Plans
            </TrackedCtaLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
