import { ArrowDown, ArrowRight } from 'lucide-react';

const STEPS = [
  { n: 1, title: 'Listen', body: 'Let the question finish; note keywords.' },
  { n: 2, title: 'Pause', body: '2–3s silence beats rambling.' },
  { n: 3, title: 'Frame', body: 'One line: “I’ll share context, what I did, outcome.”' },
  { n: 4, title: 'STAR', body: 'Situation → Task → Action → Result with metrics.' },
  { n: 5, title: 'Reflect', body: 'One sentence: what you’d tweak next time.' },
  { n: 6, title: 'Close', body: 'Tie back to role or learning mindset.' },
] as const;

export function HrAnswerFlowDiagram() {
  return (
    <div className="space-y-3 sm:space-y-0">
      <div className="flex flex-col gap-2 sm:hidden">
        {STEPS.map((step, i) => (
          <div key={step.n}>
            <div
              className="rounded-xl border-2 p-4"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 22%, transparent)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {step.n}
                </span>
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {step.body}
                  </p>
                </div>
              </div>
            </div>
            {i < STEPS.length - 1 ? (
              <div className="flex justify-center py-1">
                <ArrowDown className="size-5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden flex-wrap items-stretch justify-center gap-2 sm:flex lg:gap-3">
        {STEPS.map((step, i) => (
          <div key={step.n} className="flex min-w-0 items-stretch">
            <div
              className="flex w-[min(100%,9.5rem)] flex-col rounded-xl border-2 p-3 lg:w-[10.5rem] lg:p-4"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
              }}
            >
              <span
                className="mb-2 inline-flex size-8 items-center justify-center rounded-lg text-xs font-bold lg:size-9 lg:text-sm"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 22%, transparent)',
                  color: 'var(--accent-primary)',
                }}
              >
                {step.n}
              </span>
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {step.title}
              </p>
              <p className="mt-2 text-xs leading-relaxed lg:text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                {step.body}
              </p>
            </div>
            {i < STEPS.length - 1 ? (
              <div className="flex w-6 shrink-0 items-center justify-center lg:w-8" aria-hidden>
                <ArrowRight className="size-5 lg:size-6" style={{ color: 'var(--accent-primary)' }} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
