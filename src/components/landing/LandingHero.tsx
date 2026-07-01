import type { ReactNode } from 'react';
import { T } from '@/components/landing/landing-home-tokens';
import { AmbientLayer } from '@/components/landing/AmbientLayer';
import LandingHeroCtaIsland from '@/components/landing/LandingHeroCtaIsland';
import LandingHeroSimulator from '@/components/landing/LandingHeroSimulator';
import { LANDING_HOME_INNER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

export default function LandingHero({ countPill }: { countPill: ReactNode }) {

  return (
    <>
      <section className="landing-hero-section relative overflow-hidden pt-[4.5rem] pb-[5.5rem] sm:pt-[4.75rem] sm:pb-24">
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
            className="hero-grid-responsive grid items-center gap-10 lg:gap-12"
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
                className="mb-5 sm:mb-6"
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
                  that pushes back.
                </em>
              </h1>

              <p
                className="mb-8 max-w-[32rem] text-base leading-[1.75] sm:mb-9"
                style={{ color: T.text2 }}
              >
                <strong style={{ color: T.text, fontWeight: 700 }}>InterviewEra</strong> is an AI-powered mock
                interview platform for Indian campus hiring. Upload your resume and sit a realistic, voice-based
                interview that asks adaptive follow-up questions, shows live captions, and scores every answer
                across five dimensions.
              </p>

              <LandingHeroCtaIsland />

              <ul
                className="mt-6 flex list-none flex-wrap gap-x-5 gap-y-2.5 p-0 text-[12.5px] sm:mt-7"
                style={{ color: T.text2 }}
                aria-label="Trust indicators"
              >
                {[
                  { dot: T.ok, label: 'No credit card needed' },
                  { dot: T.acc, label: 'Under 60 seconds to start' },
                  { dot: T.ok, label: 'Free to begin' },
                ].map((item) => (
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
            </div>

            <div className="hero-mockup-col min-w-0">
              <LandingHeroSimulator />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
