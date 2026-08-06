import type { ReactNode } from 'react';
import { T } from '@/components/landing/landing-home-tokens';
import { AmbientLayer } from '@/components/landing/AmbientLayer';
import LandingHeroCtaIsland from '@/components/landing/LandingHeroCtaIsland';
import LandingHeroSimulatorIsland from '@/components/landing/LandingHeroSimulatorIsland';
import LandingHeroCommunityLinks from '@/components/landing/LandingHeroCommunityLinks';
import { LANDING_HOME_INNER } from '@/lib/landing/container';
import { LANDING_DEMO_DISCLOSURE } from '@/lib/landing/demo-disclosure';
import { cn } from '@/lib/utils';

const TRUST_ITEMS = [
  { dot: T.ok, label: 'Free to start' },
  { dot: T.acc, label: 'Answer Feedback on every response' },
  { dot: T.ok, label: 'Voice-first Mock Interview' },
  { dot: T.acc, label: 'Your resume stays private' },
] as const;

export default function LandingHero({ countPill }: { countPill: ReactNode }) {
  return (
    <section
      className="landing-hero-section relative overflow-hidden pt-6 pb-4 sm:pt-[30px] sm:pb-6"
      aria-labelledby="landing-hero-heading"
    >
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
          className="hero-grid-responsive grid items-start gap-8 sm:gap-10 lg:gap-12"
          style={{ gridTemplateColumns: 'clamp(300px,46%,500px) 1fr' }}
        >
          <div className="hero-copy-col min-w-0">
            <div
              className="mb-3.5 inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold leading-snug sm:mb-6 sm:px-3.5 sm:py-1.5 sm:text-xs"
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
              <span className="min-w-0 text-pretty">{countPill}</span>
            </div>

            <h1
              id="landing-hero-heading"
              className="hero-copy-heading mb-3.5 text-pretty sm:mb-5"
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: T.text,
              }}
            >
              <span className="hero-copy-heading__lead block">
                Mock Interview practice
              </span>
              <em className="v3-hero-gradient-text hero-copy-heading__accent block" style={{ fontStyle: 'normal' }}>
                built for campus placements.
              </em>
            </h1>

            <div className="hero-copy-body mb-5 max-w-[30rem] sm:mb-8">
              <p
                className="hero-copy-body__lead text-[14px] leading-[1.55] sm:text-base sm:leading-[1.7]"
                style={{ color: T.text, fontWeight: 500 }}
              >
                InterviewEra is voice-first Mock Interview practice for Indian campus placements,
                internships, and early-career hiring.
              </p>
              <p
                className="hero-copy-body__offer mt-2 text-[13px] leading-[1.5] sm:mt-2.5 sm:text-[14px] sm:leading-[1.7]"
                style={{ color: T.text2 }}
              >
                Upload your resume once. Three free Mock Interviews to start — no card required.
              </p>
            </div>

            <LandingHeroCtaIsland
              trustStrip={
                <ul
                  className="hero-trust-strip grid list-none grid-cols-1 gap-2 p-0 text-[12.5px] leading-snug sm:flex sm:flex-wrap sm:gap-x-4 sm:gap-y-2 sm:leading-none"
                  style={{ color: T.text2 }}
                  aria-label="Trust indicators"
                >
                  {TRUST_ITEMS.map((item) => (
                    <li key={item.label} className="flex items-start gap-1.5 sm:items-center">
                      <span
                        aria-hidden
                        className="mt-1.5 block size-[5px] shrink-0 rounded-full sm:mt-0"
                        style={{ background: item.dot }}
                      />
                      <span className="min-w-0 text-pretty">{item.label}</span>
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
              <p className="ie-lh-text-muted mt-3 w-full px-1 text-center text-xs">{LANDING_DEMO_DISCLOSURE}</p>
              <LandingHeroCommunityLinks />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
