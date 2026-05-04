'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { T, Reveal, CountUp } from '@/components/landing/landing-home-shared';

const LandingHomeBelowFold = dynamic(
  () => import('@/components/landing/LandingHomeBelowFold'),
  {
    loading: () => (
      <div
        className="mx-auto my-12 min-h-[40vh] max-w-[1080px] animate-pulse rounded-2xl px-7 opacity-40"
        style={{ background: 'var(--card-bg)' }}
        aria-hidden
      />
    ),
  }
);

/* ─── 1. PAIN BAR ─── */
function PainBar() {
  return (
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
        <strong style={{ color: T.err, fontWeight: 700 }}>
          can&apos;t structure answers under pressure
        </strong>
        . You can&apos;t fix what you can&apos;t measure.
      </p>
    </div>
  );
}

/* ─── 2. HERO ─── */
function LivePulse() {
  return (
    <span
      className="ie-live-pulse"
      style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: T.ok,
        flexShrink: 0,
      }}
    />
  );
}

function CursorBlink() {
  return (
    <span
      className="ie-cursor-blink"
      style={{
        display: 'inline-block',
        width: '2px',
        height: '13px',
        background: T.acc,
        marginLeft: '2px',
        verticalAlign: 'middle',
      }}
    />
  );
}

function BarFill({ color, pct }: { color: string; pct: number }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [filled, setFilled] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) {
      setFilled(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setFilled(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="v3-bar-fill-solid"
      style={{
        height: '100%',
        borderRadius: '99px',
        background: color,
        width: filled ? `${pct}%` : '0%',
        transition: 'width 900ms cubic-bezier(0.16,1,0.3,1) 300ms',
        willChange: filled ? 'auto' : 'width',
      }}
    />
  );
}

function ScoringCard() {
  const dims = [
    { label: 'Communication', value: 7.8, pct: 78 },
    { label: 'Technical depth', value: 7.2, pct: 72 },
    { label: 'STAR structure', value: 8.4, pct: 84 },
    { label: 'Confidence', value: 6.8, pct: 68 },
  ];

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.bord2}`,
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: T.scoreShadow,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: T.bg2,
          borderBottom: `1px solid ${T.bord}`,
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '5px' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: T.bord2,
                display: 'block',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: T.ok }}>
          <LivePulse /> Scoring live
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: T.text3, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Question 2 of 5 · Technical
        </div>
        <div
          style={{
            background: T.bg2,
            border: `1px solid ${T.bord}`,
            borderRadius: '10px',
            padding: '13px 15px',
            fontSize: '14px',
            fontWeight: 600,
            color: T.text,
            lineHeight: 1.5,
            marginBottom: '16px',
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}
        >
          &ldquo;Walk me through the payment API failure you handled in your final-year project.&rdquo;
        </div>
        <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.text3, marginBottom: '6px' }}>
          Your answer
        </div>
        <div
          style={{
            background: T.ansBg,
            border: `1px solid ${T.bord2}`,
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '13.5px',
            color: T.text2,
            lineHeight: 1.65,
            marginBottom: '16px',
            minHeight: '56px',
          }}
        >
          In Q4 2023, our payment service was dropping ~8% of transactions silently. I owned the backend debug — traced a race condition in the retry worker using logs, added idempotent keys and exponential backoff...<CursorBlink />
        </div>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.text3, marginBottom: '10px' }}>
          AI scoring in progress
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
          {dims.map((d) => {
            const isHigh = d.value >= 7.0;
            const barColor = isHigh ? T.ok : T.warn;
            return (
            <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: T.text2, width: '88px', flexShrink: 0 }}>{d.label}</span>
              <div style={{ flex: 1, height: '5px', background: T.bg3, borderRadius: '99px', overflow: 'hidden' }}>
                <BarFill color={barColor} pct={d.pct} />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: barColor, width: '28px', textAlign: 'right', flexShrink: 0 }}>
                {d.value}
              </span>
            </div>
          )})}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: `1px solid ${T.bord}`,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', color: T.text3 }}>Session average</span>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
          <span style={{ fontSize: '22px', color: T.acc }}>
            <CountUp to={7.6} decimals={1} duration={1.4} delay={0.5} />
          </span>
          <span style={{ fontSize: '13px', color: T.text3, marginLeft: '4px' }}>/ 10</span>
        </div>
      </div>
    </div>
  );
}

function HeroSection({ isLoggedIn, displayCount }: { isLoggedIn: boolean; displayCount: string }) {
  const cta = isLoggedIn ? '/dashboard' : '/signup';

  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '80px 0 96px' }}>
      {/* Dot texture */}
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

          {/* Left: Copy */}
          <div>
            <Reveal instant>
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
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.ok, flexShrink: 0, display: 'block' }} />
                {displayCount} students · Built for Indian campus hiring
              </div>
            </Reveal>

            <Reveal instant>
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
                Know your score<br />
                before the company<br />
                <em className="v3-hero-gradient-text" style={{ fontStyle: 'normal' }}>
                  decides for you
                </em>
              </h1>
            </Reveal>

            {/* Mechanism line — instant: delayed Reveal stays opacity:0 on SSR (bad for LCP/FCP). */}
            <Reveal instant>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {[
                  { n: '1', label: 'Upload resume' },
                  { n: '2', label: 'Answer AI questions' },
                  { n: '3', label: 'Get scored' },
                ].map((step, i) => (
                  <React.Fragment key={step.n}>
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
                  </React.Fragment>
                ))}
              </div>
            </Reveal>

            <Reveal instant>
              <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '460px', marginBottom: '32px' }}>
                Upload your resume. Get grilled on what you actually wrote. Every answer is scored on 5 dimensions — the exact criteria campus panels use to build their shortlists. No more guessing. No more hoping. Just a number that tells you the truth.
              </p>
            </Reveal>

            <Reveal instant>
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
            </Reveal>

            <Reveal instant>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12.5px', color: T.text2 }}>
                {[
                  { dot: T.ok,  label: 'No credit card needed' },
                  { dot: T.acc, label: 'Under 60 seconds to start' },
                  { dot: T.ok,  label: 'Free to begin' },
                ].map((item) => (
                  <span key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: item.dot, display: 'block' }} />
                    {item.label}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Right: Scoring card */}
          <Reveal instant>
            <div className="ie-hero-glow">
              <ScoringCard />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ─── 3. FLOW SECTION ─── */
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
      num: '02 / ANSWER',
      icon: '🎙',
      iconBg: 'var(--v3-pur-dim, rgba(167,139,250,0.08))',
      title: 'Answer panel-style questions',
      body: "A structured session — technical depth, behavioural scenarios, pressure follow-ups. Sequenced the way real campus panels run. Answer like you're in the room.",
    },
    {
      num: '03 / IMPROVE',
      icon: '📊',
      iconBg: T.okdim,
      title: 'Get a score — not a feeling',
      body: 'Every answer is scored on 5 weighted dimensions. You see exactly where you fall below 7.0 — the shortlist threshold — with specific gaps to fix before the next company process.',
    },
  ];

  return (
    <section id="how" style={{ padding: '80px 0', background: T.bg2 }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px' }}>
        <Reveal instant>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: '14px' }}>
              The scoring system
            </span>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(26px,3.4vw,42px)', fontWeight: 800, marginBottom: '18px', color: T.text, letterSpacing: '-0.028em', lineHeight: 1.06 }}>
              Resume in. Score out. Three steps.
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
              Everything you need to know if you&apos;re ready — before the company tests you. Upload your CV once, get a session built from your background, and walk away with a number.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="flow-steps-responsive"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, background: T.card, border: `1px solid ${T.bord2}`, borderRadius: '24px', overflow: 'hidden', marginTop: '52px', boxShadow: '0 12px 32px rgba(79, 70, 229, 0.04)' }}
          >
            {steps.map((step, i) => (
              <div
                key={step.num}
                style={{ padding: '46px 36px', borderRight: i < steps.length - 1 ? `1px solid ${T.bord}` : 'none', position: 'relative', transition: 'background 0.3s ease' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = T.stepHover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: T.text3, marginBottom: '22px' }}>
                  {step.num}
                </div>
                <div style={{ width: '54px', height: '54px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '24px', border: `1px solid ${T.bord}`, background: step.iconBg, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  {step.icon}
                </div>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18.5px', fontWeight: 800, marginBottom: '12px', color: T.text, letterSpacing: '-0.01em' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14.5px', lineHeight: 1.75, color: T.text2 }}>{step.body}</p>
                {i < steps.length - 1 && (
                  <div aria-hidden className="flow-arrow-hide" style={{ position: 'absolute', right: '-16px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', background: T.card, border: `1px solid ${T.bord}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: T.text3, zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
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
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', borderRadius: '12px', background: T.acc, color: '#fff', fontSize: '15px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
            >
              Start a scored interview — it&apos;s free →
            </Link>
            <p style={{ fontSize: '13.5px', color: T.text2, marginTop: '12px' }}>
              No credit card required · under 60 seconds to your first score
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── 4. ENTRY SECTION ─── */
function EntrySection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const cards = [
    {
      icon: '🌱', level: 'Building from scratch', levelColor: T.ok,
      title: 'Follow the scoring roadmap',
      body: "You haven't done structured prep before. Start with the HR Behavioural track — module by module, scored at each step. Build your baseline first, then close the gaps.",
      cta: 'Start HR Basics →', ctaColor: T.ok,
      href: isLoggedIn ? '/dashboard' : '/signup',
      outcome: "You'll have a", outcomeStrong: 'baseline score in 3 sessions',
      recommended: false,
    },
    {
      icon: '⚡', level: 'Actively preparing', levelColor: T.warn,
      title: 'Score your own questions',
      body: "You have a resume. Upload it, get questions built from your actual background, and practice until every answer scores above 7. No generic prep — just yours.",
      cta: 'Upload resume + get scored →', ctaColor: T.acc2,
      href: isLoggedIn ? '/dashboard' : '/signup',
      outcome: "You'll have a", outcomeStrong: 'personal score in 20 minutes',
      recommended: true,
    },
    {
      icon: '🎯', level: 'Interview this week', levelColor: T.acc2,
      title: 'Run a full mock right now',
      body: "No time for modules. Run a full 5-question scored session and find out if you're above 7.0 — the threshold panels use to decide shortlists — before they do.",
      cta: 'Start full mock interview →', ctaColor: T.warn,
      href: isLoggedIn ? '/dashboard' : '/signup',
      outcome: "You'll know", outcomeStrong: "if you're shortlist-ready today",
      recommended: false,
    },
  ];

  return (
    <section style={{ padding: '88px 0', background: T.bg }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px' }}>
        <Reveal instant>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: '14px' }}>
              Your starting point
            </span>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(26px,3.4vw,42px)', fontWeight: 800, marginBottom: '18px', color: T.text, letterSpacing: '-0.028em', lineHeight: 1.06 }}>
              Pick your lane. Start scoring.
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
              Three types of candidates use InterviewEra. Each has a different entry point — and a different first score to aim for.
            </p>
          </div>
        </Reveal>

        <div className="entry-grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginTop: '52px' }}>
          {cards.map((card, i) => (
            <Reveal key={card.title} delay={i * 0.07}>
              <Link
                href={card.href}
                className={card.recommended ? 'ie-card-premium ie-card-premium--accent' : 'ie-card-premium'}
                style={{
                  display: 'flex', flexDirection: 'column', gap: '14px',
                  border: `1px solid ${card.recommended ? T.accbrd : T.bord2}`,
                  borderRadius: '18px', padding: '28px', cursor: 'pointer',
                  background: card.recommended ? T.accdim : T.card,
                  position: 'relative', overflow: 'hidden', textDecoration: 'none', height: '100%',
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
                  <span className="ie-badge-pulse" style={{ top: '16px', right: '16px', background: T.acc, color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '99px' }}>
                    Most common
                  </span>
                )}
                <span style={{ fontSize: '28px', lineHeight: 1 }}>{card.icon}</span>
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: card.levelColor }}>
                  {card.level}
                </span>
                <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '18px', fontWeight: 700, color: T.text, margin: 0 }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: '13.5px', color: T.text2, lineHeight: 1.7, flex: 1 }}>{card.body}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 600, color: card.ctaColor, marginTop: '4px' }}>
                  {card.cta}
                </span>
                <div style={{ fontSize: '12px', color: T.text3, fontWeight: 500, borderTop: `1px solid ${T.bord}`, paddingTop: '12px', marginTop: '4px' }}>
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

/* ─── ROOT EXPORT ─── */
export default function LandingHomeClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [displayCount, setDisplayCount] = useState('1,000+');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    /**
     * Defer Supabase auth + stats off the LCP critical path.
     * `requestIdleCallback` (or a microtask fallback) keeps the initial
     * page chunk free of `@supabase/ssr` until the browser is idle.
     */
    const work = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled) return;
        const supabase = createClient();
        void supabase.auth.getUser().then(({ data }) => {
          if (!cancelled) setIsLoggedIn(Boolean(data.user));
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setIsLoggedIn(Boolean(session?.user));
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch {
        /* network / chunk error — landing still works */
      }

      try {
        const res = await fetch('/api/stats/student-count');
        const body = (await res.json()) as { displayCount?: string };
        if (!cancelled && typeof body.displayCount === 'string') {
          setDisplayCount(body.displayCount);
        }
      } catch {
        /* keep fallback */
      }
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    const w = window as IdleWindow;
    const handle: number | ReturnType<typeof setTimeout> = w.requestIdleCallback
      ? w.requestIdleCallback(() => void work(), { timeout: 1500 })
      : setTimeout(() => void work(), 0);

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (typeof handle === 'number' && 'cancelIdleCallback' in window) {
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(handle);
      } else {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      }
    };
  }, []);

  return (
    <main id="main-content">
      <PainBar />
      <HeroSection isLoggedIn={isLoggedIn} displayCount={displayCount} />
      <FlowSection isLoggedIn={isLoggedIn} />
      <EntrySection isLoggedIn={isLoggedIn} />
      <LandingHomeBelowFold isLoggedIn={isLoggedIn} />
    </main>
  );
}
