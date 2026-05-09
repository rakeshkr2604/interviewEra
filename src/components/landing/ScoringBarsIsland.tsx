'use client';

import { useEffect, useRef, useState } from 'react';
import { T } from '@/components/landing/landing-home-tokens';

const DIMS = [
  { label: 'Communication', value: 7.8, pct: 78 },
  { label: 'Technical depth', value: 7.2, pct: 72 },
  { label: 'STAR structure', value: 8.4, pct: 84 },
  { label: 'Confidence', value: 6.8, pct: 68 },
] as const;

export function ScoringBarsIsland() {
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
                fontFamily: 'var(--font-jetbrains), ui-monospace, monospace',
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
