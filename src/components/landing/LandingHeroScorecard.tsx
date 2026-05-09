'use client';

import React, { useEffect, useRef, useState } from 'react';
import { T, CountUp } from '@/components/landing/landing-home-shared';

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

const DIMS = [
  { label: 'Communication', value: 7.8, pct: 78 },
  { label: 'Technical depth', value: 7.2, pct: 72 },
  { label: 'STAR structure', value: 8.4, pct: 84 },
  { label: 'Confidence', value: 6.8, pct: 68 },
] as const;

function ScoringBars() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    let io: IntersectionObserver | undefined;

    queueMicrotask(() => {
      if (!node) return;

      const reduced =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        setFilled(true);
        return;
      }

      if (!('IntersectionObserver' in window)) {
        setFilled(true);
        return;
      }

      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              setFilled(true);
              io?.disconnect();
              break;
            }
          }
        },
        { threshold: 0.25, rootMargin: '0px 0px -5% 0px' },
      );
      io.observe(node);
    });

    return () => {
      io?.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '14px' }}>
      {DIMS.map((d) => {
        const isHigh = d.value >= 7.0;
        const barColor = isHigh ? T.ok : T.warn;
        return (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: T.text2, width: '88px', flexShrink: 0 }}>{d.label}</span>
            <div style={{ flex: 1, height: '5px', background: T.bg3, borderRadius: '99px', overflow: 'hidden' }}>
              <div
                className="v3-bar-fill-solid"
                style={{
                  height: '100%',
                  borderRadius: '99px',
                  background: barColor,
                  width: filled ? `${d.pct}%` : '0%',
                  transition: 'width 900ms cubic-bezier(0.16, 1, 0.3, 1) 300ms',
                  willChange: filled ? 'auto' : 'width',
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                fontWeight: 600,
                color: barColor,
                width: '28px',
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {d.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Above-the-fold mock scoring UI — deferred with `dynamic(..., { ssr: false })` from Server Hero. */
export default function LandingHeroScorecard() {
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

      <div style={{ padding: '18px 20px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: T.text3,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
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
        <div
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: T.text3,
            marginBottom: '6px',
          }}
        >
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
          In Q4 2023, our payment service was dropping ~8% of transactions silently. I owned the backend debug — traced a
          race condition in the retry worker using logs, added idempotent keys and exponential backoff...
          <CursorBlink />
        </div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: T.text3,
            marginBottom: '10px',
          }}
        >
          AI scoring in progress
        </div>
        <ScoringBars />
      </div>

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
