'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

/*
 * Design tokens — all values are CSS custom property references.
 * They resolve through the ThemeProvider (dark/light) automatically.
 * Hardcoded rgba/hex values below are only for decorative overlays
 * that are intentionally mode-independent (e.g. avatar gradients).
 */
const T = {
  bg:       'var(--bg-primary)',
  bg2:      'var(--bg-secondary)',
  bg3:      'var(--bg-tertiary)',
  card:     'var(--card-bg)',
  bord:     'var(--v3-bord)',
  bord2:    'var(--card-border)',
  text:     'var(--text-primary)',
  text2:    'var(--text-secondary)',
  text3:    'var(--text-muted)',
  acc:      'var(--accent-primary)',
  acc2:     'var(--accent-hover)',
  accdim:   'var(--v3-accdim)',
  accbrd:   'var(--v3-accbrd)',
  ok:       'var(--accent-success)',
  okdim:    'var(--v3-okdim)',
  okbrd:    'var(--v3-ok-brd)',
  warn:     'var(--accent-warning)',
  err:      'var(--accent-danger)',
  pur:      'var(--v3-pur)',
  ansBg:    'var(--v3-ans-bg)',
  scoreShadow: 'var(--v3-score-shadow)',
  ctaBg:    'var(--v3-cta-bg)',
  ctaBrd:   'var(--v3-cta-brd)',
  stepHover: 'var(--v3-step-hover)',
  badHi:    'var(--v3-bad-hi)',
  painBg:   'var(--v3-pain-bg)',
  painBrd:  'var(--v3-pain-brd)',
  painText: 'var(--v3-pain-text)',
} as const;

/* ─── Reveal animation wrapper ─── */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

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
    <motion.span
      style={{
        display: 'inline-block',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: T.ok,
        flexShrink: 0,
      }}
      animate={{ opacity: [1, 0.4, 1], scale: [1, 1.55, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function CursorBlink() {
  return (
    <motion.span
      style={{
        display: 'inline-block',
        width: '2px',
        height: '13px',
        background: T.acc,
        marginLeft: '2px',
        verticalAlign: 'middle',
      }}
      animate={{ opacity: [1, 1, 0, 0, 1, 1] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
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
                <motion.div
                  className="v3-bar-fill-solid"
                  style={{ height: '100%', borderRadius: '99px', background: barColor }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${d.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                />
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
          <span style={{ fontSize: '22px', color: T.acc }}>7.6</span>
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
            <Reveal>
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

            <Reveal delay={0.05}>
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

            {/* Mechanism line */}
            <Reveal delay={0.1}>
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

            <Reveal delay={0.13}>
              <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '460px', marginBottom: '32px' }}>
                Upload your resume. Get grilled on what you actually wrote. Every answer is scored on 5 dimensions — the exact criteria campus panels use to build their shortlists. No more guessing. No more hoping. Just a number that tells you the truth.
              </p>
            </Reveal>

            <Reveal delay={0.16}>
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

            <Reveal delay={0.19}>
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
          <Reveal delay={0.08}>
            <ScoringCard />
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
        <Reveal>
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
        <Reveal>
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
                style={{
                  display: 'flex', flexDirection: 'column', gap: '14px',
                  border: `1px solid ${card.recommended ? T.accbrd : T.bord2}`,
                  borderRadius: '18px', padding: '28px', cursor: 'pointer',
                  background: card.recommended ? T.accdim : T.card,
                  position: 'relative', overflow: 'hidden', textDecoration: 'none', height: '100%',
                  transition: 'transform 0.18s ease, border-color 0.18s ease',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-3px)';
                  el.style.borderColor = T.bord;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(0)';
                  el.style.borderColor = card.recommended ? T.accbrd : T.bord2;
                }}
              >
                {card.recommended && (
                  <span style={{ position: 'absolute', top: '16px', right: '16px', background: T.acc, color: '#fff', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '99px' }}>
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

/* ─── 5. SCORING ENGINE ─── */
function ScoringEngineSection() {
  return (
    <section style={{ padding: '88px 0', background: T.bg2 }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px' }}>
        <Reveal>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: '14px' }}>
              Interview scoring engine
            </span>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(26px,3.4vw,42px)', fontWeight: 800, marginBottom: '18px', color: T.text, letterSpacing: '-0.028em', lineHeight: 1.06 }}>
              How your interview is evaluated
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
              Three layers running in sequence — personalised questions from your resume, a structured answer framework, and a 5-dimension scoring rubric that gives you a single actionable number.
            </p>
          </div>
        </Reveal>

        {/* Layer 1: Resume → Questions pipeline */}
        <Reveal delay={0.1}>
          <div className="pipeline-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr 48px 1fr', alignItems: 'center', gap: 0, marginTop: '52px' }}>

            <div style={{ background: T.card, border: `1px solid ${T.bord2}`, borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3, marginBottom: '10px' }}>Input</div>
              <h4 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: T.text }}>Your resume</h4>
              <p style={{ fontSize: '13px', color: T.text2, lineHeight: 1.65 }}>Parsed once on upload. Skills, projects, work experience, and education are all indexed.</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: T.bg3, border: `1px solid ${T.bord2}`, borderRadius: '8px', padding: '6px 11px', fontSize: '12.5px', fontWeight: 600, color: T.text2, marginTop: '14px', marginBottom: '8px' }}>
                📄 Ananya_Resume_2025.pdf
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {[{ tag: 'React + TS', dim: true }, { tag: 'Payment APIs', dim: true }, { tag: 'NIT Trichy', dim: false }].map(({ tag, dim }) => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '99px', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: dim ? T.accdim : T.okdim, color: dim ? T.acc2 : T.ok }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pipe-arrow-hide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text3, fontSize: '18px' }}>→</div>

            <div style={{ background: T.card, border: `1px solid ${T.bord2}`, borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3, marginBottom: '10px' }}>Generated</div>
              <h4 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: T.text }}>Your questions</h4>
              <p style={{ fontSize: '13px', color: T.text2, lineHeight: 1.65 }}>Questions are built from what you actually wrote — not from a generic bank.</p>
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['"Walk me through the payment API failure you handled."', '"Tell me about the React + TS project you built."'].map((q) => (
                  <div key={q} style={{ background: T.bg2, border: `1px solid ${T.bord}`, borderRadius: '7px', padding: '6px 10px', fontSize: '12.5px', color: T.text2, lineHeight: 1.4 }}>{q}</div>
                ))}
              </div>
            </div>

            <div className="pipe-arrow-hide" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text3, fontSize: '18px' }}>→</div>

            <div style={{ background: T.card, border: `1px solid ${T.bord2}`, borderRadius: '16px', padding: '24px' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.text3, marginBottom: '10px' }}>Output</div>
              <h4 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: T.text }}>Scored answers</h4>
              <p style={{ fontSize: '13px', color: T.text2, lineHeight: 1.65 }}>Every answer is evaluated on 5 weighted dimensions. You see a number after each response.</p>
              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {[{ label: 'STAR structure', val: '8.4', color: T.ok, pct: 84 }, { label: 'Technical depth', val: '6.4', color: T.warn, pct: 64 }].map((bar) => (
                  <div key={bar.label}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', color: T.text2, marginBottom: '3px' }}>
                      <span>{bar.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: bar.color, fontWeight: 700 }}>{bar.val} / 10</span>
                    </div>
                    <div style={{ height: '4px', background: T.bg3, borderRadius: '99px', overflow: 'hidden' }}>
                      <motion.div
                        className="v3-bar-fill-solid"
                        style={{ height: '100%', background: bar.color, borderRadius: '99px' }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${bar.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Layer 2: Before / After */}
        <Reveal delay={0.12}>
          <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: `1px solid ${T.bord}` }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: '14px' }}>
                The exact difference
              </span>
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(22px,2.8vw,34px)', fontWeight: 800, marginBottom: '10px', color: T.text, letterSpacing: '-0.028em' }}>
                The answer that gets shortlisted vs the one that doesn&apos;t.
              </h3>
              <p style={{ fontSize: '14.5px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
                Same question. Same candidate. The only difference is structure — and it&apos;s worth 4.6 points on the scoring engine.
              </p>
            </div>

            <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${T.acc} 30%, transparent), transparent)`, margin: '0 auto 36px auto', width: '75%' }} />

            <div className="transf-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Bad panel */}
              <div style={{ borderRadius: '18px', padding: '26px', background: T.card, border: `1.5px dashed ${T.painBrd}` }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, background: `color-mix(in srgb, ${T.err} 12%, transparent)`, color: T.err, border: `1px solid color-mix(in srgb, ${T.err} 25%, transparent)`, marginBottom: '16px' }}>
                  <span>3.8</span><span style={{ fontSize: '12px' }}>/10</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>Score</span>
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px', color: T.err }}>
                  ❌ Unstructured — panels can&apos;t score this
                </div>
                <div style={{ fontSize: '12.5px', color: T.text3, fontStyle: 'italic', marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${T.painBrd}` }}>
                  &ldquo;Tell me about a time you solved a hard technical problem under a deadline.&rdquo;
                </div>
                <p style={{ fontSize: '14px', lineHeight: 1.8, color: T.text2, fontStyle: 'italic' }}>
                  &ldquo;<mark style={{ background: T.badHi, borderRadius: '3px', padding: '1px 2px', color: 'inherit' }}>Yeah so basically in my project we had some issues</mark> and I worked with my team.{' '}
                  <mark style={{ background: T.badHi, borderRadius: '3px', padding: '1px 2px', color: 'inherit' }}>We used different things and I did my best.</mark>{' '}
                  It was tough but we managed to finish it. I learned a lot and I&apos;m a quick learner.&rdquo;
                </p>
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${T.painBrd}`, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {["✕ No ownership — could be anyone's story", '✕ No measurable outcome — panel defaults low', '✕ Unscoreable → lowest band by default'].map((pt) => (
                    <div key={pt} style={{ fontSize: '13px', fontWeight: 500, color: T.err, display: 'flex', alignItems: 'flex-start', gap: '7px' }}>{pt}</div>
                  ))}
                </div>
              </div>

              {/* Good panel */}
              <div style={{ borderRadius: '18px', padding: '26px', background: T.card, border: `1.5px solid ${T.okbrd}` }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, background: T.okdim, color: T.ok, border: `1px solid ${T.okbrd}`, marginBottom: '16px' }}>
                  <span>8.4</span><span style={{ fontSize: '12px' }}>/10</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>Score</span>
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px', color: T.ok }}>
                  ✅ STAR-structured — fully scoreable
                </div>
                <div style={{ fontSize: '12.5px', color: T.text3, fontStyle: 'italic', marginBottom: '14px', paddingBottom: '12px', borderBottom: `1px solid ${T.okbrd}` }}>
                  &ldquo;Tell me about a time you solved a hard technical problem under a deadline.&rdquo;
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { tag: 'Situation', text: 'Payment API failing on 8% of transactions — two days before the demo, team of four.' },
                    { tag: 'Task',      text: 'I owned the backend debug without breaking the existing checkout flow.' },
                    { tag: 'Action',    text: 'Traced a race condition in the retry worker, added idempotent keys + exponential backoff.' },
                    { tag: 'Result',    text: 'Zero failed demos. Professor used it as the class example for error handling.' },
                  ].map((row) => (
                    <div key={row.tag}>
                      <span style={{ display: 'inline-block', background: T.okdim, color: T.ok, fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '5px', marginBottom: '3px' }}>
                        {row.tag}
                      </span>
                      <p style={{ fontSize: '13.5px', color: T.text2, lineHeight: 1.65 }}>{row.text}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${T.okbrd}` }}>
                  {['✓ Ownership clear', '✓ Metric in result', '✓ Fully scoreable'].map((tag) => (
                    <span key={tag} style={{ background: T.okdim, color: T.ok, fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px' }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Why STAR */}
            <div style={{ marginTop: '28px', background: T.bg3, border: `1px solid ${T.bord2}`, borderRadius: '14px', padding: '18px 22px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>💡</span>
              <p style={{ fontSize: '13.5px', color: T.text2, lineHeight: 1.7 }}>
                <strong style={{ color: T.text }}>Why structured answers score higher:</strong> Panels can only evaluate what they can measure. A STAR answer has a clear situation, ownership, action, and result — each one maps to a scoring dimension. A rambling answer gives panellists nothing to anchor to, so it defaults to the lowest band — even when the underlying work was strong.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Layer 3: Score engine breakdown */}
        <Reveal delay={0.15}>
          <div style={{ marginTop: '40px', background: T.card, border: `1px solid ${T.bord2}`, borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${T.bord}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: T.text }}>Interview Scoring Engine — 5 Dimensions</div>
                <div style={{ fontSize: '12.5px', color: T.text2, marginTop: '3px' }}>Same rubric every session · no mood scoring · consistent across all roles</div>
              </div>
              <div style={{ background: T.accdim, border: `1px solid ${T.accbrd}`, borderRadius: '99px', padding: '4px 12px', fontSize: '11.5px', fontWeight: 600, color: T.acc2 }}>
                7.0+ = shortlist-ready threshold
              </div>
            </div>

            <div className="engine-body-responsive" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 0 }}>
              {/* Left: score bars */}
              <div style={{ padding: '28px', borderRight: `1px solid ${T.bord}` }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: T.text3, marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Example profile (illustrative)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { name: 'Communication clarity', val: 7.4, pct: 74 },
                    { name: 'Technical depth',        val: 6.4, pct: 64 },
                    { name: 'STAR structure',         val: 8.4, pct: 84 },
                    { name: 'Confidence',             val: 6.5, pct: 65 },
                    { name: 'Relevance',              val: 7.6, pct: 76 },
                  ].map((bar) => {
                    const isHigh = bar.val >= 7.0;
                    const barColor = isHigh ? T.ok : T.warn;
                    return (
                    <div key={bar.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13.5px', color: T.text }}>{bar.name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 600, color: barColor }}>
                          {bar.val} <span style={{ color: barColor, opacity: 0.8 }}>/ 10</span>
                        </span>
                      </div>
                      <div style={{ height: '6px', background: T.bg3, borderRadius: '99px', overflow: 'hidden' }}>
                        <motion.div
                          className="v3-bar-fill-solid"
                          style={{ height: '100%', borderRadius: '99px', background: barColor }}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${bar.pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )})}
                </div>
                <div style={{ marginTop: '18px', background: T.okdim, border: `1px solid ${T.okbrd}`, borderRadius: '9px', padding: '9px 14px', fontSize: '13px', fontWeight: 600, color: T.ok, textAlign: 'center' }}>
                  ↑ Above 7.0 average — shortlist-ready
                </div>
              </div>

              {/* Right: dimension list */}
              <div style={{ padding: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: T.text3, marginBottom: '18px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  How each score is calculated
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { name: 'Communication clarity', weight: '20%', desc: 'Concise, professional wording — no filler or hedging' },
                    { name: 'Technical depth',       weight: '25%', desc: 'Accuracy, correct terminology, domain knowledge shown' },
                    { name: 'Answer structure',      weight: '20%', desc: 'STAR-style flow — panels can follow and score it' },
                    { name: 'Confidence',            weight: '15%', desc: '"I did X" not "we maybe tried…" — direct ownership' },
                    { name: 'Relevance',             weight: '20%', desc: "Stays on the question — doesn't drift or pivot away" },
                  ].map((dim, i, arr) => (
                    <div key={dim.name} style={{ padding: '12px 0', borderBottom: i < arr.length - 1 ? `1px solid ${T.bord}` : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: T.text }}>{dim.name}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: T.acc2 }}>{dim.weight}</span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: T.text2 }}>{dim.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ─── 6. SOCIAL PROOF ─── */
function SocialProofSection() {
  const testimonials = [
    { initials: 'AK', gradient: 'linear-gradient(135deg,#6366f1,#7c3aed)', name: 'Ananya K.', meta: 'NIT Trichy · CSE · 2024 batch', quote: '"Random stories became STAR answers after 3 sessions. The feedback highlighted exactly what panels actually care about — not generic \'be confident\' advice."', outcome: '✓ Shortlisted at 3 product companies' },
    { initials: 'RM', gradient: 'linear-gradient(135deg,#a855f7,#6366f1)', name: 'Rahul M.',  meta: 'VIT · ECE → Software · 2024 batch', quote: '"The questions were from my actual resume — I wasn\'t practicing hypotheticals. Knew which answers needed fixing before each company process started."',  outcome: '✓ First offer after 12 scored sessions' },
    { initials: 'AY', gradient: 'linear-gradient(135deg,#10b981,#0891b2)', name: 'Ayush T.',  meta: 'B.Tech CSE · Tier-3 · 2024 batch',  quote: '"Went from blanking on follow-up questions to having actual structure. Score jumped 4.6 → 7.4 in 3 sessions. The number made it real — not just a feeling."',   outcome: '✓ Score: 4.6 → 7.4 in 3 sessions' },
  ];

  return (
    <section style={{ padding: '88px 0', background: T.bg2 }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px' }}>
        <Reveal>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: '14px' }}>
              Real outcomes
            </span>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(26px,3.4vw,42px)', fontWeight: 800, marginBottom: '18px', color: T.text, letterSpacing: '-0.028em', lineHeight: 1.06 }}>
              They stopped hoping they&apos;d sound good — and started knowing their score.
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
              When you have a number after every session, the improvement is concrete — not a feeling.
            </p>
          </div>
        </Reveal>

        {/* Result strip */}
        <Reveal delay={0.08}>
          <div className="strip-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: T.bord, border: `1px solid ${T.bord2}`, borderRadius: '16px', overflow: 'hidden', marginTop: '52px' }}>
            {[
              { num: '4.6 → 7.4', suffix: '',  label: 'Average score jump after 3 sessions (illustrative)' },
              { num: '1,000',      suffix: '+', label: 'Students using InterviewEra across India' },
              { num: '60',         suffix: 's', label: 'From signup to your first scored interview question' },
            ].map((item) => (
              <div key={item.label} style={{ background: T.card, padding: '28px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '38px', fontWeight: 800, color: T.text, lineHeight: 1, marginBottom: '6px' }}>
                  {item.num}<span style={{ color: T.acc2 }}>{item.suffix}</span>
                </div>
                <div style={{ fontSize: '13.5px', color: T.text2, lineHeight: 1.55 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Testimonials */}
        <div className="testi-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '18px', marginTop: '52px' }}>
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.07}>
              <div style={{ background: T.card, border: `1px solid ${T.bord}`, borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '14px', fontWeight: 800, color: '#fff', background: t.gradient }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: T.text, marginBottom: '2px' }}>{t.name}</div>
                    <div style={{ fontSize: '12px', color: T.text3 }}>{t.meta}</div>
                  </div>
                </div>
                <div style={{ color: T.warn, fontSize: '13px', letterSpacing: '2px' }}>★★★★★</div>
                <p style={{ fontSize: '14px', lineHeight: 1.75, color: T.text2, flex: 1 }}>{t.quote}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: T.okdim, borderRadius: '99px', padding: '5px 12px', fontSize: '12.5px', fontWeight: 700, color: T.ok, alignSelf: 'flex-start' }}>
                  {t.outcome}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── 7. CTA ─── */
function CTASection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const cta = isLoggedIn ? '/dashboard' : '/signup';

  return (
    <div style={{ padding: '100px 0', textAlign: 'center', background: T.ctaBg, borderTop: `1px solid ${T.ctaBrd}` }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px' }}>
        <Reveal>
          <div style={{ display: 'inline-block', background: T.accdim, border: `1px solid ${T.accbrd}`, borderRadius: '99px', padding: '5px 16px', fontSize: '12px', fontWeight: 600, color: T.acc2, marginBottom: '20px' }}>
            Free to start — no card required
          </div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, marginBottom: '16px', color: T.text, letterSpacing: '-0.028em' }}>
            Your next interview<br />shouldn&apos;t be a guess.
          </h2>
          <p style={{ fontSize: '16px', color: T.text2, maxWidth: '460px', margin: '0 auto 36px' }}>
            Run a scored mock from your actual resume. Walk into every company process knowing your number — not hoping for the best.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              href={cta}
              className="v3-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', borderRadius: '12px', background: T.acc, color: '#fff', fontSize: '15px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
            >
              Start a scored interview — it&apos;s free →
            </Link>
            <Link
              href="/pricing"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '15px 32px', borderRadius: '12px', background: 'transparent', color: T.text, fontSize: '15px', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", border: `1.5px solid ${T.ctaBrd}`, textDecoration: 'none' }}
            >
              See pricing
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ─── ROOT EXPORT ─── */
export default function LandingHomeClient({
  isLoggedIn,
  displayCount,
}: {
  isLoggedIn: boolean;
  displayCount: string;
}) {
  return (
    <>
      <PainBar />
      <HeroSection isLoggedIn={isLoggedIn} displayCount={displayCount} />
      <FlowSection isLoggedIn={isLoggedIn} />
      <EntrySection isLoggedIn={isLoggedIn} />
      <ScoringEngineSection />
      <SocialProofSection />
      <CTASection isLoggedIn={isLoggedIn} />
    </>
  );
}
