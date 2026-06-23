import { AGENTIC_EVOLUTION_ERAS } from '@/lib/seo/blog/agentic-ai-hub'

export function AgenticInterviewTimeline() {
  return (
    <div className="ie-agentic-pastel-table-wrap my-8 p-4 sm:my-10 sm:p-6" aria-label="Evolution of technical interviews timeline">
      <p className="ie-agentic-pastel-table-wrap__caption">Technical interview evolution (illustrative)</p>
      <ol className="relative m-0 list-none space-y-0 p-0">
        {AGENTIC_EVOLUTION_ERAS.map((era, i) => {
          const pastel = ['#f3f5fb', '#f0faf4', '#fff6ed', '#eff6ff', '#fdf2f8'] as const
          const accent = ['#5b4d8a', '#166534', '#c05621', '#1e40af', '#9d174d'] as const
          const bg = pastel[i % pastel.length]
          const color = accent[i % accent.length]
          return (
          <li
            key={era.era}
            className="relative flex gap-4 rounded-lg px-2 py-3 sm:px-3"
            style={{ background: i % 2 === 0 ? bg : 'transparent' }}
          >
            {i < AGENTIC_EVOLUTION_ERAS.length - 1 ? (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5"
                style={{ background: 'var(--card-border)' }}
                aria-hidden
              />
            ) : null}
            <span
              className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: bg,
                color,
                border: `1px solid ${color}33`,
              }}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 font-semibold" style={{ color: 'var(--text-primary)' }}>
                {era.era}
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  {era.period}
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {era.focus}
              </p>
            </div>
          </li>
          )
        })}
      </ol>
    </div>
  )
}
