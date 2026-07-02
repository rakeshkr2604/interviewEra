'use client';

import React from 'react';
import Link from 'next/link';
import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';
import { T, Reveal } from '@/components/landing/landing-home-shared';
import { trackLandingCtaClicked } from '@/lib/analytics/cta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { LANDING_HOME_INNER, LANDING_HOME_SECTION } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

function FlowSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const cta = isLoggedIn ? '/dashboard' : '/signup';

  const steps = [
    {
      num: '01 / UPLOAD',
      icon: '📄',
      iconBg: T.accdim,
      title: 'Upload your resume',
      body: "InterviewEra indexes your projects, skills, and experience. Every question that follows is sourced from what you actually wrote — not a generic bank someone else practiced from.",
    },
    {
      num: '02 / INTERVIEW',
      icon: '🎙',
      iconBg: 'var(--v3-pur-dim, rgba(167,139,250,0.08))',
      title: 'Sit an adaptive interview',
      body: "Answer out loud in a voice-first session. It asks intelligent follow-ups, probes vague answers, and understands Hinglish when nerves hit — with live captions to keep you steady.",
    },
    {
      num: '03 / IMPROVE',
      icon: '📊',
      iconBg: T.okdim,
      title: 'Get a score — not a feeling',
      body: 'Every answer is scored on 5 weighted dimensions. You see exactly where you sit versus the practice band highlighted in-product (often around 7.0) — plus specific gaps to fix before your next mock.',
    },
  ];

  return (
    <section id="how" className={LANDING_HOME_SECTION}>
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
              How it works
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
              Resume in. Real interview. Score out.
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
              Upload your CV once, sit a realistic adaptive interview built from your background, and walk away with a
              number you can act on — not a vague &ldquo;you did fine.&rdquo;
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="flow-steps-responsive"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 0,
              background: T.card,
              border: `1px solid ${T.bord2}`,
              borderRadius: '24px',
              overflow: 'hidden',
              marginTop: '52px',
              boxShadow: '0 12px 32px rgba(79, 70, 229, 0.04)',
            }}
          >
            {steps.map((step, i) => (
              <div
                key={step.num}
                style={{
                  padding: '46px 36px',
                  borderRight: i < steps.length - 1 ? `1px solid ${T.bord}` : 'none',
                  position: 'relative',
                  transition: 'background 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = T.stepHover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.12em',
                    color: T.text3,
                    marginBottom: '22px',
                  }}
                >
                  {step.num}
                </div>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    marginBottom: '24px',
                    border: `1px solid ${T.bord}`,
                    background: step.iconBg,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  }}
                >
                  {step.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: '18.5px',
                    fontWeight: 800,
                    marginBottom: '12px',
                    color: T.text,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: '14.5px', lineHeight: 1.75, color: T.text2 }}>{step.body}</p>
                {i < steps.length - 1 && (
                  <div
                    aria-hidden
                    className="flow-arrow-hide"
                    style={{
                      position: 'absolute',
                      right: '-16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '32px',
                      height: '32px',
                      background: T.card,
                      border: `1px solid ${T.bord}`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      color: T.text3,
                      zIndex: 1,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-10 text-center sm:mt-12">
            <StartFreeCtaLink
              href={cta}
              section="home_midfold_flow_cta"
              className="v3-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-semibold no-underline"
              style={{
                color: '#fff',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Start Free
            </StartFreeCtaLink>
            <p className="mt-3 text-[13.5px]" style={{ color: T.text2 }}>
              No credit card required · under 60 seconds to your first score
            </p>
            <Link
              href="/how-it-works"
              className="mt-3.5 inline-block text-[13.5px] font-semibold no-underline"
              style={{ color: T.acc2 }}
            >
              See the full interview journey →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

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
      body: "You haven't done structured prep before. Start with the HR Behavioural track — module by module, scored at each step. Build your baseline first, then close the gaps.",
      cta: 'Start HR Basics →',
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
      cta: 'Upload resume + get scored →',
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
      body: "No time for modules. Run a full scored session and benchmark yourself against the same rubric you see after each answer — before a real panel does.",
      cta: 'Start full mock interview →',
      ctaKey: CTA_KEYS.START_MOCK_INTERVIEW,
      ctaColor: T.warn,
      href: isLoggedIn ? '/dashboard' : '/signup',
      outcome: "You'll know",
      outcomeStrong: 'where you stand on the rubric today',
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
  return (
    <>
      <FlowSection isLoggedIn={isLoggedIn} />
      <EntrySection isLoggedIn={isLoggedIn} />
    </>
  );
}
