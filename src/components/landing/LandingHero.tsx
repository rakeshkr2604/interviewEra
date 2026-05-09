import Link from 'next/link';
import { T } from '@/components/landing/landing-home-tokens';
import LandingHeroScorecardSlot from '@/components/landing/LandingHeroScorecardSlot';

export default function LandingHero({ isLoggedIn, displayCount }: { isLoggedIn: boolean; displayCount: string }) {
  const cta = isLoggedIn ? '/dashboard' : '/signup';

  return (
    <>
      {/* Pain bar */}
      <div
        style={{
          background: T.painBg,
          borderBottom: `1px solid ${T.painBrd}`,
          padding: '10px 0',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: T.painText,
            maxWidth: '640px',
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          Most candidates don&apos;t fail because of what they know — they fail because they{' '}
          <strong style={{ color: T.err, fontWeight: 700 }}>can&apos;t structure answers under pressure</strong>. You
          can&apos;t fix what you can&apos;t measure.
        </p>
      </div>

      <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 0 96px' }}>
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

        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px', position: 'relative' }}>
          <div className="hero-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'clamp(300px,52%,600px) 1fr', gap: '64px', alignItems: 'start' }}>
            <div>
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
                {displayCount} students · Built for Indian campus hiring
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
                Know your score
                <br />
                before the company
                <br />
                <em className="v3-hero-gradient-text" style={{ fontStyle: 'normal' }}>
                  decides for you
                </em>
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {[
                  { n: '1', label: 'Upload resume' },
                  { n: '2', label: 'Answer AI questions' },
                  { n: '3', label: 'Get scored' },
                ].map((step, i) => (
                  <span key={step.n} style={{ display: 'contents' }}>
                    {i > 0 && <span style={{ color: T.text3, fontSize: '14px' }}>→</span>}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: T.bg3,
                        border: `1px solid ${T.bord2}`,
                        borderRadius: '8px',
                        padding: '5px 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: T.text2,
                      }}
                    >
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '5px',
                          background: T.acc,
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {step.n}
                      </span>
                      {step.label}
                    </div>
                  </span>
                ))}
              </div>

              <p
                style={{
                  fontSize: '16px',
                  lineHeight: 1.8,
                  color: T.text2,
                  maxWidth: '460px',
                  marginBottom: '32px',
                }}
              >
                Upload your resume. Get grilled on what you actually wrote. Every answer is scored on 5 dimensions — the
                exact criteria campus panels use to build their shortlists. No more guessing. No more hoping. Just a
                number that tells you the truth.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
                <Link
                  href={cta}
                  className="v3-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '15px 32px',
                    borderRadius: '12px',
                    background: T.acc,
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Start a scored interview — free →
                </Link>
                <Link
                  href="#how"
                  className="v3-btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '15px 32px',
                    borderRadius: '12px',
                    background: 'transparent',
                    color: T.text,
                    fontSize: '15px',
                    fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    border: `1.5px solid ${T.bord2}`,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  See how scoring works
                </Link>
              </div>

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

            <LandingHeroScorecardSlot />
          </div>
        </div>
      </section>
    </>
  );
}
