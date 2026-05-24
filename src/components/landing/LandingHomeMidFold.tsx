'use client';

import React from 'react';
import Link from 'next/link';
import { T, Reveal } from '@/components/landing/landing-home-shared';

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
    <section id="how" style={{ padding: '80px 0', background: T.bg2 }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px' }}>
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
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
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
              }}
            >
              Start a scored interview — it&apos;s free →
            </Link>
            <p style={{ fontSize: '13.5px', color: T.text2, marginTop: '12px' }}>
              No credit card required · under 60 seconds to your first score
            </p>
            <Link
              href="/how-it-works"
              style={{
                display: 'inline-block',
                marginTop: '14px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: T.acc2,
                textDecoration: 'none',
              }}
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
  const cards = [
    {
      icon: '🌱',
      level: 'Building from scratch',
      levelColor: T.ok,
      title: 'Follow the scoring roadmap',
      body: "You haven't done structured prep before. Start with the HR Behavioural track — module by module, scored at each step. Build your baseline first, then close the gaps.",
      cta: 'Start HR Basics →',
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
      ctaColor: T.warn,
      href: isLoggedIn ? '/dashboard' : '/signup',
      outcome: "You'll know",
      outcomeStrong: 'where you stand on the rubric today',
      recommended: false,
    },
  ];

  return (
    <section style={{ padding: '88px 0', background: T.bg }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px' }}>
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
                className={card.recommended ? 'ie-card-premium ie-card-premium--accent' : 'ie-card-premium'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  border: `1px solid ${card.recommended ? T.accbrd : T.bord2}`,
                  borderRadius: '18px',
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
