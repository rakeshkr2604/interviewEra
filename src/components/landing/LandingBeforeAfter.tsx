import { AmbientLayer } from '@/components/landing/AmbientLayer';

/**
 * Grounded before/after comparison — observational, not motivational.
 * Server-rendered. Frames the behavioural shift from unstructured prep to repeatable practice.
 */

const BEFORE = [
  'Prep scattered across YouTube videos and random question lists',
  'Answers memorised, then lost the moment a follow-up lands',
  'Mind goes blank when the interviewer digs into the "why"',
  'No real signal on whether this week is better than last',
] as const;

const AFTER = [
  'Answers built on a structure you can repeat under pressure',
  'Steadier when a question goes off the script you rehearsed',
  'Follow-up pressure feels familiar — you have sat with it before',
  'A score after each session that shows exactly what to tighten',
] as const;

export function LandingBeforeAfter() {
  return (
    <section className="relative overflow-hidden px-5 py-20 sm:py-24">
      <AmbientLayer variant="before-after" />
      <div className="relative z-1 mx-auto max-w-3xl text-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent-hover)' }}>
          What changes
        </span>
        <h2
          className="mt-3.5 text-balance text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-[1.08]"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          The difference a few real sessions make
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Not a transformation story — just what tends to shift once practice is structured, repeated,
          and measured instead of improvised.
        </p>
      </div>

      <div className="relative z-1 mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2 md:gap-5">
        {/* Before */}
        <div className="rounded-2xl border-2 p-6 sm:p-7" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)' }}>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Without structured practice
          </h3>
          <ul className="mt-5 space-y-3.5 p-0">
            {BEFORE.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full" style={{ background: 'var(--text-muted)' }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* After */}
        <div
          className="rounded-2xl border-2 p-6 sm:p-7"
          style={{ borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)', background: 'color-mix(in srgb, var(--accent-primary) 7%, transparent)' }}
        >
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            After a few InterviewEra sessions
          </h3>
          <ul className="mt-5 space-y-3.5 p-0">
            {AFTER.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="none" aria-hidden>
                  <path d="M16.7 5.3 8 14l-4.7-4.7" stroke="var(--accent-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
