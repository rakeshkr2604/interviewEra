import type { ReactNode } from 'react';
import { T } from '@/components/landing/landing-home-tokens';
import { AmbientLayer } from '@/components/landing/AmbientLayer';
import LandingHeroCtaIsland from '@/components/landing/LandingHeroCtaIsland';
import LandingHeroSimulatorIsland from '@/components/landing/LandingHeroSimulatorIsland';
import LandingHeroCommunityLinks from '@/components/landing/LandingHeroCommunityLinks';
import { LANDING_HOME_INNER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

const TRUST_ITEMS = [
  { dot: T.ok, label: 'Free to start' },
  { dot: T.acc, label: 'Resume-aware' },
  { dot: T.ok, label: 'Voice-first' },
  { dot: T.acc, label: 'Your resume stays private' },
] as const;

export default function LandingHero({ countPill }: { countPill: ReactNode }) {
  return (
    <section className="landing-hero-section relative overflow-hidden pt-[30px] pb-[5.5rem] sm:pb-24">
      <div
        aria-hidden
        className="landing-hero-dot-grid pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(${T.bord2} 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 80%)',
        }}
      />

      <AmbientLayer variant="hero" />

      <div className={cn(LANDING_HOME_INNER, 'relative z-[1]')}>
        <div
          className="hero-grid-responsive grid items-start gap-10 lg:gap-12"
          style={{ gridTemplateColumns: 'clamp(300px,46%,500px) 1fr' }}
        >
          <div className="hero-copy-col min-w-0">
            <div
              className="mb-5 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold sm:mb-6"
              style={{
                background: T.accdim,
                border: `1px solid ${T.accbrd}`,
                color: T.acc2,
              }}
            >
              <span
                aria-hidden
                className="block size-1.5 shrink-0 rounded-full"
                style={{ background: T.ok }}
              />
              {countPill}
            </div>

            <h1
              className="mb-4 sm:mb-5"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 'clamp(36px, 4.4vw, 58px)',
                fontWeight: 800,
                lineHeight: 1.04,
                letterSpacing: '-0.03em',
                color: T.text,
              }}
            >
              Practice the interview
              <br />
              <em className="v3-hero-gradient-text" style={{ fontStyle: 'normal' }}>
                that gets you placement-ready.
              </em>
            </h1>

            <div className="mb-7 max-w-[30rem] sm:mb-8">
              <p
                className="text-[15px] leading-[1.65] sm:text-base sm:leading-[1.7]"
                style={{ color: T.text, fontWeight: 500 }}
              >
                Crack placements with confidence — resume-aware voice practice that pushes back when
                answers go vague.
              </p>
              <p
                className="mt-2.5 text-[13.5px] leading-[1.65] sm:text-[14px] sm:leading-[1.7]"
                style={{ color: T.text2 }}
              >
                Upload once. Handle adaptive follow-ups. Get consistent scores across five dimensions.
                Built for Indian campus placements, internships, and early-career hiring.
              </p>
            </div>

            <LandingHeroCtaIsland
              trustStrip={
                <ul
                  className="hero-trust-strip flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-[12.5px] leading-none"
                  style={{ color: T.text2 }}
                  aria-label="Trust indicators"
                >
                  {TRUST_ITEMS.map((item) => (
                    <li key={item.label} className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="block size-[5px] shrink-0 rounded-full"
                        style={{ background: item.dot }}
                      />
                      {item.label}
                    </li>
                  ))}
                </ul>
              }
            />
          </div>

          <div className="hero-mockup-col min-w-0 w-full">
            <div className="mx-auto flex w-full max-w-[560px] flex-col items-center">
              <p className="hero-free-offer" role="status">
                <span className="hero-free-offer__dot" aria-hidden />
                <span className="hero-free-offer__text">
                  First 3 interviews free — try it once.
                </span>
              </p>
              <div className="w-full">
                <LandingHeroSimulatorIsland />
              </div>
              <LandingHeroCommunityLinks />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
