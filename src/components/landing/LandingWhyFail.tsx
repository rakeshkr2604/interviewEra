import type { LucideIcon } from 'lucide-react';
import { GitBranch, Layers, AudioLines, TrendingDown } from 'lucide-react';

/**
 * Editorial "why candidates fail" section — the core positioning insight.
 *
 * Rebuilt as a centered header + 2×2 grid of elevated diagnostic cards, each with a
 * color-coded icon tile. Color system mirrors the interview demo card:
 *   accent-primary (blue)   → skill / technique gaps (follow-up, explanation)
 *   accent-warning (amber)  → pressure / confidence failures
 *
 * Server-rendered (no client JS).
 */

type FailureMode = {
  Icon: LucideIcon;
  head: string;
  body: string;
  color: string;
};

const FAILURE_MODES: FailureMode[] = [
  {
    Icon: GitBranch,
    head: 'The follow-up breaks them',
    body: 'The first answer is rehearsed. The second question — "why that approach and not the other?" — is where preparation runs out.',
    color: 'var(--accent-primary)',
  },
  {
    Icon: Layers,
    head: 'Structure collapses under pressure',
    body: 'Nerves turn a clear point into a loop of "basically… we sort of… I think". Panels can only score what they can follow.',
    color: 'var(--accent-warning)',
  },
  {
    Icon: AudioLines,
    head: 'They have never explained their work out loud',
    body: 'A project that reads well on a resume becomes hard to narrate when someone is listening and waiting.',
    color: 'var(--accent-primary)',
  },
  {
    Icon: TrendingDown,
    head: 'Confidence drops mid-answer',
    body: 'One uncertain pause snowballs. Without practice, there is no muscle memory for recovering and finishing strong.',
    color: 'var(--accent-warning)',
  },
];

export function LandingWhyFail() {
  return (
    <section className="px-5 py-20 sm:py-24">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl text-center">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--accent-hover)' }}
        >
          The real reason
        </span>
        <h2
          className="mt-3.5 text-balance text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-[42px]"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: 'var(--text-primary)' }}
        >
          Most candidates don&rsquo;t fail because they lack knowledge
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-[17px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          They know the concepts. They have done the projects. They fail in the gap between knowing
          something and explaining it clearly, under pressure, while someone keeps asking
          &ldquo;why?&rdquo;.
        </p>
      </div>

      {/* ── Failure mode cards ──────────────────────────────────────────── */}
      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
        {FAILURE_MODES.map((m) => (
          <div
            key={m.head}
            className="rounded-2xl border p-6 transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
              boxShadow: '0 8px 28px -20px color-mix(in srgb, var(--text-primary) 40%, transparent)',
            }}
          >
            {/* Icon tile */}
            <div
              className="flex size-11 items-center justify-center rounded-xl"
              style={{
                background: `color-mix(in srgb, ${m.color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${m.color} 28%, transparent)`,
              }}
            >
              <m.Icon className="size-5" style={{ color: m.color }} aria-hidden />
            </div>

            <h3
              className="mt-4 text-base font-bold leading-snug tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {m.head}
            </h3>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {m.body}
            </p>
          </div>
        ))}
      </div>

      {/* ── Resolution band ─────────────────────────────────────────────── */}
      <div
        className="mx-auto mt-6 max-w-4xl rounded-2xl border-l-2 px-6 py-5"
        style={{
          borderColor: 'var(--accent-primary)',
          background: 'color-mix(in srgb, var(--accent-primary) 7%, var(--card-bg))',
        }}
      >
        <p
          className="text-base font-medium leading-relaxed sm:text-[17px]"
          style={{ color: 'var(--text-primary)' }}
        >
          InterviewEra recreates those exact conditions{' '}
          <span style={{ color: 'var(--accent-primary)' }}>before the real interview does</span> —
          adaptive follow-ups, realistic pacing, and a score that shows you where the structure broke.
        </p>
      </div>
    </section>
  );
}
