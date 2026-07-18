'use client';

import { useEffect, useState } from 'react';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import type { AtsResultV2 } from './ats-types';
import { scoreBand } from './AtsScoreRing';

type Axis = { key: string; label: string; short: string; score: number };

function buildAxes(result: AtsResultV2): Axis[] {
  const axes: Axis[] = [
    { key: 'parse', label: 'Parseability', short: 'Parse', score: result.parseability.score },
    { key: 'fields', label: 'Field Extraction', short: 'Fields', score: result.fieldExtraction.score },
    { key: 'struct', label: 'Structure', short: 'Structure', score: result.structureQuality.score },
  ];
  if (result.jdMatch) {
    axes.push({
      key: 'jd',
      label: 'JD Match',
      short: 'JD Match',
      score: result.jdMatch.score,
    });
  }
  return axes;
}

/**
 * Signature multi-axis overview — each axis is an independent dimension.
 * Never averages or blends into a single score.
 * Layout mirrors landing “How your interview is evaluated”: chart | supporting scores.
 */
export function AtsDimensionsOverview({ result }: { result: AtsResultV2 }) {
  const axes = buildAxes(result);
  const chartData = axes.map((a) => ({
    dimension: a.short,
    score: Math.max(0, Math.min(100, a.score)),
    fullMark: 100,
  }));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const axisCountLabel =
    axes.length === 4
      ? 'Four independent dimensions'
      : 'Three independent dimensions (add a JD for Match)';

  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
        background:
          'linear-gradient(160deg, color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg)) 0%, var(--card-bg) 55%)',
      }}
      aria-label={`${axisCountLabel}. Radar shows each score separately — not a combined ATS score.`}
    >
      <div
        className="border-b px-4 py-3 sm:px-5"
        style={{ borderColor: 'color-mix(in srgb, var(--accent-primary) 18%, var(--card-border))' }}
      >
        <p className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
          Dimension overview
        </p>
        <p className="mt-0.5 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
          {axisCountLabel} — each axis is its own check. This is not one blended “ATS %.”
        </p>
      </div>

      <div className="grid items-center gap-4 p-4 sm:grid-cols-2 sm:gap-6 sm:p-5">
        <div
          className="mx-auto w-full min-h-[200px] max-w-sm sm:min-h-[240px] sm:max-w-none"
          role="img"
          aria-label={axes.map((a) => `${a.label} ${a.score} of 100`).join('. ')}
        >
          <ResponsiveContainer width="100%" height={220}>
            <RechartsRadarChart data={chartData} cx="50%" cy="50%" outerRadius="68%">
              <PolarGrid stroke="color-mix(in srgb, var(--text-muted) 28%, transparent)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Dimension score"
                dataKey="score"
                stroke="var(--accent-primary)"
                fill="var(--accent-primary)"
                fillOpacity={0.22}
                strokeWidth={2}
                isAnimationActive={!reduceMotion}
              />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <p className="text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
            Read each axis on its own. A strong Parseability score does not raise Field Extraction — and
            nothing here is averaged into a fake overall ATS score.
          </p>
          <ul className="space-y-3" aria-label="Per-dimension scores">
            {axes.map((a) => {
              const band = scoreBand(a.score);
              const pct = Math.max(0, Math.min(100, a.score));
              return (
                <li key={a.key} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold sm:text-sm" style={{ color: 'var(--text-primary)' }}>
                      {a.label}
                    </span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: band.color }}>
                      {Math.round(a.score)}
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        /100
                      </span>
                    </span>
                  </div>
                  {/* Landing Scoring Engine bar pattern: 6px track + success/warn/danger fill */}
                  <div
                    className="h-1.5 overflow-hidden rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--card-border) 80%, transparent)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: band.color,
                        transition: reduceMotion ? undefined : 'width 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  </div>
                  <p className="text-[11px] font-medium" style={{ color: band.color }}>
                    {band.label}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
