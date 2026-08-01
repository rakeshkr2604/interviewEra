'use client';

import { T, Reveal } from '@/components/landing/landing-home-shared';
import { LANDING_HOME_INNER, LANDING_HOME_SECTION } from '@/lib/landing/container';

export default function LandingScoringEngine() {
  return (
    <section
      className={LANDING_HOME_SECTION}
      style={{ background: 'color-mix(in srgb, var(--bg-secondary) 55%, transparent)' }}
    >
      <div className={LANDING_HOME_INNER}>
        <Reveal>
          <div style={{ textAlign: 'center' }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: '14px' }}>
              Interview scoring engine
            </span>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(26px,3.4vw,42px)', fontWeight: 800, marginBottom: '18px', color: T.text, letterSpacing: '-0.028em', lineHeight: 1.06 }}>
              Know exactly why an answer scored well — and what to fix
            </h2>
            <p style={{ fontSize: '16px', lineHeight: 1.8, color: T.text2, maxWidth: '560px', margin: '0 auto' }}>
              The same five-dimension rubric runs on every answer, so your score stays consistent and shows you
              what to improve before your next interview — not a vague “you did fine.”
            </p>
          </div>
        </Reveal>

        {/* Score engine breakdown */}
        <Reveal delay={0.12}>
          <div style={{ marginTop: '52px', background: T.card, border: `1px solid ${T.bord2}`, borderRadius: '20px', overflow: 'hidden' }}>
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
                        <div
                          className="v3-bar-fill-solid"
                          style={{ height: '100%', width: `${bar.pct}%`, borderRadius: '99px', background: barColor }}
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
