import type { ReactNode } from 'react';
import { T } from '@/components/landing/landing-home-tokens';
import { AmbientLayer } from '@/components/landing/AmbientLayer';
import LandingHeroCtaIsland from '@/components/landing/LandingHeroCtaIsland';
import LandingHeroSimulator from '@/components/landing/LandingHeroSimulator';

export default function LandingHero({ countPill }: { countPill: ReactNode }) {

  return (
    <>
      <section style={{ position: 'relative', overflow: 'hidden', padding: '72px 0 88px' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `radial-gradient(${T.bord2} 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 80%)',
          }}
        />

        <AmbientLayer variant="hero" />

        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px', position: 'relative', zIndex: 1 }}>
          <div className="hero-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'clamp(300px,46%,500px) 1fr', gap: '48px', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: T.accdim,
                  border: `1px solid ${T.accbrd}`,
                  borderRadius: '99px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: T.acc2,
                  marginBottom: '24px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: T.ok,
                    flexShrink: 0,
                    display: 'block',
                  }}
                />
                {countPill}
              </div>

              <h1
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 'clamp(36px, 4.4vw, 58px)',
                  fontWeight: 800,
                  lineHeight: 1.04,
                  letterSpacing: '-0.03em',
                  marginBottom: '20px',
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
                style={{
                  marginTop: '20px',
                  fontSize: '16px',
                  lineHeight: 1.8,
                  color: T.text2,
                  maxWidth: '460px',
                  marginBottom: '32px',
                }}
              >
                <strong style={{ color: T.text, fontWeight: 700 }}>InterviewEra</strong> is an AI-powered mock
                interview platform for Indian campus hiring. Upload your resume and sit a realistic, voice-based
                interview that asks adaptive follow-up questions, shows live captions, and scores every answer
                across five dimensions.
              </p>

              <LandingHeroCtaIsland />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12.5px', color: T.text2 }}>
                {[
                  { dot: T.ok, label: 'No credit card needed' },
                  { dot: T.acc, label: 'Under 60 seconds to start' },
                  { dot: T.ok, label: 'Free to begin' },
                ].map((item) => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: item.dot,
                        display: 'block',
                      }}
                    />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            <LandingHeroSimulator />
          </div>
        </div>
      </section>
    </>
  );
}
