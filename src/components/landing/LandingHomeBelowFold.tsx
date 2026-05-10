'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { T, Reveal, CountUp } from '@/components/landing/landing-home-shared';

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
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: T.text }}>Your resume</h3>
              <p style={{ fontSize: '13px', color: T.text2, lineHeight: 1.65 }}>Parsed once on upload. Skills, projects, work experience, and education are all indexed.</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: T.bg3, border: `1px solid ${T.bord2}`, borderRadius: '8px', padding: '6px 11px', fontSize: '12.5px', fontWeight: 600, color: T.text2, marginTop: '14px', marginBottom: '8px' }}>
                📄 Sample_resume_demo.pdf
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
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: T.text }}>Your questions</h3>
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
              <h3 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '15px', fontWeight: 700, marginBottom: '6px', color: T.text }}>Scored answers</h3>
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
                Structured vs unstructured — illustrative scores only.
              </h3>
              <p style={{ fontSize: '14.5px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
                Same question. The only difference shown here is structure — numbers are demo values, not a guarantee of outcomes.
              </p>
            </div>

            <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${T.acc} 30%, transparent), transparent)`, margin: '0 auto 36px auto', width: '75%' }} />

            <div className="transf-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Bad panel */}
              <div style={{ borderRadius: '18px', padding: '26px', background: T.card, border: `1.5px solid ${T.painBrd}`, boxShadow: `0 8px 32px -16px color-mix(in srgb, ${T.err} 40%, transparent)` }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, background: `color-mix(in srgb, ${T.err} 12%, transparent)`, color: T.err, border: `1px solid color-mix(in srgb, ${T.err} 25%, transparent)`, marginBottom: '16px' }}>
                  <span><CountUp to={3.8} decimals={1} duration={0.9} /></span><span style={{ fontSize: '12px' }}>/10</span>
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
              <div style={{ borderRadius: '18px', padding: '26px', background: T.card, border: `1.5px solid ${T.okbrd}`, boxShadow: `0 8px 32px -16px color-mix(in srgb, ${T.ok} 40%, transparent)` }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 700, background: T.okdim, color: T.ok, border: `1px solid ${T.okbrd}`, marginBottom: '16px' }}>
                  <span><CountUp to={8.4} decimals={1} duration={0.9} delay={0.15} /></span><span style={{ fontSize: '12px' }}>/10</span>
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
                7.0+ = example “strong band” in the rubric UI
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
                  ↑ Example profile averaging above the 7.0 practice band shown in-product
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

/* ─── 6. EARLY ACCESS ─── */
function SocialProofSection() {
  return (
    <section style={{ padding: '88px 0 96px', background: T.bg2 }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 28px' }}>
        <Reveal>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: '14px' }}>
              Early access
            </span>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(26px,3.4vw,42px)', fontWeight: 800, marginBottom: '18px', color: T.text, letterSpacing: '-0.028em', lineHeight: 1.06 }}>
              Beta launching May 2026. Join early access for free Pro features.
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto 28px' }}>
              We&apos;re inviting a small cohort first — structured mocks, resume-native questions, and rubric scoring. No paid
              actor testimonials; product proof only.
            </p>
            <Link
              href="/signup"
              className="v3-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                borderRadius: '12px',
                background: T.acc,
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                textDecoration: 'none',
              }}
            >
              Join the waitlist →
            </Link>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div
            className="strip-responsive"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: '1px',
              background: T.bord,
              border: `1px solid ${T.bord2}`,
              borderRadius: '16px',
              overflow: 'hidden',
              marginTop: '52px',
            }}
          >
            {[
              {
                label: 'Illustrative score jump shown in demos (not an aggregate cohort metric)',
                render: (
                  <>
                    <CountUp to={4.6} decimals={1} duration={0.8} />
                    <span style={{ color: T.text3, margin: '0 10px', fontWeight: 600 }}>→</span>
                    <CountUp to={7.4} decimals={1} duration={0.9} delay={0.55} />
                  </>
                ),
              },
              {
                label: 'Now in private beta — join the waitlist',
                render: <span style={{ fontSize: 'clamp(22px,3vw,34px)', letterSpacing: '-0.02em' }}>Waitlist</span>,
              },
              {
                label: 'Typical time from signup flow to first scored prompt (depends on resume parse)',
                render: (
                  <>
                    <CountUp to={60} duration={0.9} />
                    <span style={{ color: T.acc2 }}>s</span>
                  </>
                ),
              },
            ].map((item) => (
              <div key={item.label} style={{ background: T.card, padding: '28px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: '38px', fontWeight: 800, color: T.text, lineHeight: 1, marginBottom: '6px' }}>
                  {item.render}
                </div>
                <div style={{ fontSize: '13.5px', color: T.text2, lineHeight: 1.55 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
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
            Run a scored mock from your actual resume and leave with measurable feedback — not a vague “you did fine.”
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


export default function LandingHomeBelowFold({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      <ScoringEngineSection />
      <SocialProofSection />
      <CTASection isLoggedIn={isLoggedIn} />
    </>
  );
}
