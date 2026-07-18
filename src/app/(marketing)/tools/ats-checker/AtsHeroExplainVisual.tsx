/**
 * Hero visual for /tools/ats-checker — how a parser reads a resume in one glance.
 * Presentational only; no server logic.
 */

const DIMENSIONS: ReadonlyArray<{
  id: string;
  label: string;
  score: number | null;
  width: string;
  hint: string;
  optional?: boolean;
}> = [
  { id: 'parse', label: 'Parseability', score: 92, width: '92%', hint: 'Can text be read?' },
  { id: 'fields', label: 'Field Extraction', score: 85, width: '85%', hint: 'Name, roles, skills…' },
  { id: 'struct', label: 'Structure', score: 88, width: '88%', hint: 'Headings & order' },
  { id: 'jd', label: 'JD Match', score: null, width: '62%', hint: 'When you add a JD', optional: true },
];

export function AtsHeroExplainVisual() {
  return (
    <div
      className="ats-hero-visual mx-auto w-full max-w-md text-left lg:mx-0 lg:max-w-none"
      aria-label="How the checker works: resume goes through a parser, then four explainable scores"
    >
      <style>{`
        @keyframes ats-hero-bar {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes ats-hero-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ats-hero-pulse-dot {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        .ats-hero-visual .ats-hero-step {
          animation: ats-hero-fade-up 0.55s ease-out both;
        }
        .ats-hero-visual .ats-hero-step:nth-child(1) { animation-delay: 0.05s; }
        .ats-hero-visual .ats-hero-step:nth-child(2) { animation-delay: 0.14s; }
        .ats-hero-visual .ats-hero-step:nth-child(3) { animation-delay: 0.22s; }
        .ats-hero-visual .ats-hero-bar-fill {
          transform-origin: left center;
          animation: ats-hero-bar 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ats-hero-visual .ats-hero-dot {
          animation: ats-hero-pulse-dot 1.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ats-hero-visual .ats-hero-step,
          .ats-hero-visual .ats-hero-bar-fill,
          .ats-hero-visual .ats-hero-dot {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Flow: resume column (box + ↓) → parser; scores sit under the stack */}
      <div className="mx-auto flex w-fit max-w-full flex-wrap items-start justify-center gap-2 sm:gap-3 lg:mx-0 lg:justify-start">
        <div className="flex flex-col items-center gap-1">
          <div
            className="ats-hero-step flex items-center gap-2.5 rounded-2xl border px-3 py-2.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            }}
          >
            <span
              className="relative flex h-10 w-8 shrink-0 flex-col justify-center gap-1 rounded-md border px-1"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))',
              }}
              aria-hidden
            >
              <span
                className="h-0.5 w-full rounded-full"
                style={{ background: 'color-mix(in srgb, var(--text-muted) 55%, transparent)' }}
              />
              <span
                className="h-0.5 w-[85%] rounded-full"
                style={{ background: 'color-mix(in srgb, var(--text-muted) 45%, transparent)' }}
              />
              <span
                className="h-0.5 w-[70%] rounded-full"
                style={{ background: 'color-mix(in srgb, var(--text-muted) 35%, transparent)' }}
              />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Your resume
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                PDF · DOCX · TXT
              </p>
            </div>
          </div>

          <span
            className="ats-hero-step text-lg leading-none"
            style={{ color: 'var(--text-muted)' }}
            aria-hidden
          >
            ↓
          </span>
        </div>

        <span
          className="ats-hero-step mt-4 text-lg leading-none sm:mt-5"
          style={{ color: 'var(--text-muted)' }}
          aria-hidden
        >
          →
        </span>

        <div
          className="ats-hero-step flex items-center gap-2 rounded-2xl border px-3 py-2.5"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-primary) 12%, var(--card-bg))',
          }}
        >
          <span
            className="ats-hero-dot size-2 shrink-0 rounded-full"
            style={{ background: 'var(--accent-primary)' }}
            aria-hidden
          />
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              Typical parser
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Reads text · not design
            </p>
          </div>
        </div>
      </div>

      {/* Four dimensions — the trust payload */}
      <div
        className="ats-hero-step space-y-2.5 rounded-2xl border p-3.5 sm:p-4"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            What you get back
          </p>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
            4 scores · not 1 fake “ATS %”
          </p>
        </div>

        <ul className="space-y-2.5">
          {DIMENSIONS.map((d, i) => (
            <li key={d.id} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-semibold sm:text-sm" style={{ color: 'var(--text-primary)' }}>
                    {d.label}
                  </span>
                  <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {d.hint}
                  </span>
                </div>
                <span
                  className="shrink-0 text-xs font-bold tabular-nums"
                  style={{
                    color: d.score == null ? 'var(--text-muted)' : 'var(--accent-primary)',
                  }}
                >
                  {d.score == null ? 'optional' : d.score}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--card-border) 80%, transparent)',
                  outline: d.optional
                    ? '1px dashed color-mix(in srgb, var(--text-muted) 35%, transparent)'
                    : undefined,
                  outlineOffset: d.optional ? '-1px' : undefined,
                }}
              >
                <div
                  className="ats-hero-bar-fill h-full rounded-full"
                  style={{
                    width: d.width,
                    background: d.optional
                      ? 'repeating-linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 35%, transparent) 0 4px, transparent 4px 8px)'
                      : 'var(--accent-primary)',
                    opacity: d.optional ? 0.7 : 1,
                    animationDelay: `${0.35 + i * 0.1}s`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
