'use client';

import Link from 'next/link';
import { T, Reveal } from '@/components/landing/landing-home-shared';
import { trackLandingCtaClicked } from '@/lib/analytics/cta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { LANDING_HOME_INNER, LANDING_HOME_SECTION } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

function EntrySection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const cards: Array<{
    icon: string;
    level: string;
    levelColor: string;
    title: string;
    body: string;
    cta: string;
    ctaKey: (typeof CTA_KEYS)[keyof typeof CTA_KEYS];
    ctaColor: string;
    href: string;
    outcome: string;
    outcomeStrong: string;
    recommended: boolean;
  }> = [
    {
      icon: '🌱',
      level: 'Building from scratch',
      levelColor: T.ok,
      title: 'Follow the scoring roadmap',
      body: "You haven't done structured prep before. Start with the HR Behavioural track — module by module, with answer feedback at each step. Build your baseline first, then close the gaps.",
      cta: 'Start Free Mock Interview',
      ctaKey: CTA_KEYS.GET_STARTED,
      ctaColor: T.ok,
      href: isLoggedIn ? '/dashboard' : '/signup',
      outcome: "You'll have a",
      outcomeStrong: 'baseline score in 3 sessions',
      recommended: false,
    },
    {
      icon: '⚡',
      level: 'Actively preparing',
      levelColor: T.warn,
      title: 'Score your own questions',
      body: "You have a resume. Upload it, get questions built from your actual background, and practice until every answer scores above 7. No generic prep — just yours.",
      cta: 'Start Free Mock Interview',
      ctaKey: CTA_KEYS.GET_STARTED,
      ctaColor: T.acc2,
      href: isLoggedIn ? '/dashboard' : '/signup',
      outcome: "You'll have a",
      outcomeStrong: 'personal score in 20 minutes',
      recommended: true,
    },
    {
      icon: '🎯',
      level: 'Interview this week',
      levelColor: T.acc2,
      title: 'Run a full mock right now',
      body: "No time for modules. Run a full scored session and benchmark yourself against the same answer feedback you see after each response — before a real panel does.",
      cta: 'Start Free Mock Interview',
      ctaKey: CTA_KEYS.START_MOCK_INTERVIEW,
      ctaColor: T.warn,
      href: isLoggedIn ? '/dashboard' : '/signup',
      outcome: "You'll know",
      outcomeStrong: 'where you stand before the real interview',
      recommended: false,
    },
  ];

  return (
    <section className={LANDING_HOME_SECTION}>
      <div className={LANDING_HOME_INNER}>
        <Reveal instant>
          <div style={{ textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: T.acc2,
                marginBottom: '14px',
              }}
            >
              Your starting point
            </span>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 'clamp(26px,3.4vw,42px)',
                fontWeight: 800,
                marginBottom: '18px',
                color: T.text,
                letterSpacing: '-0.028em',
                lineHeight: 1.06,
              }}
            >
              Pick your lane. Start scoring.
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
              Three types of candidates use InterviewEra. Each has a different entry point — and a different first score to
              aim for.
            </p>
          </div>
        </Reveal>

        <div
          className="entry-grid-responsive"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginTop: '52px' }}
        >
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.07}>
              <Link
                href={card.href}
                onClick={() => {
                  trackLandingCtaClicked({
                    ctaKey: card.ctaKey,
                    ctaText: card.cta,
                    section: 'home_midfold',
                    authenticated: isLoggedIn,
                  });
                }}
                className={cn(card.recommended ? 'ie-card-premium ie-card-premium--accent' : 'ie-card-premium')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  border: `1px solid ${card.recommended ? T.accbrd : T.bord2}`,
                  borderRadius: '16px',
                  padding: '28px',
                  cursor: 'pointer',
                  background: card.recommended ? T.accdim : T.card,
                  position: 'relative',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  height: '100%',
                  transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, box-shadow 0.22s ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-3px)';
                  el.style.borderColor = card.recommended ? T.acc : T.bord;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(0)';
                  el.style.borderColor = card.recommended ? T.accbrd : T.bord2;
                }}
              >
                {card.recommended && (
                  <span
                    className="ie-badge-pulse"
                    style={{
                      top: '16px',
                      right: '16px',
                      background: T.acc,
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '99px',
                    }}
                  >
                    Most common
                  </span>
                )}
                <span style={{ fontSize: '28px', lineHeight: 1 }}>{card.icon}</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: card.levelColor,
                  }}
                >
                  {card.level}
                </span>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18px', fontWeight: 700, color: T.text, margin: 0 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '13.5px', color: T.text2, lineHeight: 1.7, flex: 1 }}>{card.body}</p>
                <span
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 600, color: card.ctaColor, marginTop: '4px' }}
                >
                  {card.cta}
                </span>
                <div
                  style={{
                    fontSize: '12px',
                    color: T.text3,
                    fontWeight: 500,
                    borderTop: `1px solid ${T.bord}`,
                    paddingTop: '12px',
                    marginTop: '4px',
                  }}
                >
                  {card.outcome} <strong style={{ color: T.text2 }}>{card.outcomeStrong}</strong>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingHomeMidFold({ isLoggedIn }: { isLoggedIn: boolean }) {
  return <EntrySection isLoggedIn={isLoggedIn} />;
}
