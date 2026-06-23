import type { ReactNode } from 'react'
import { agenticPastelCardClass } from '@/lib/seo/blog/agentic-pastel'

export function AgenticHubTable({
  caption,
  headers,
  rows,
  wide = false,
}: {
  caption?: string
  headers: readonly string[]
  rows: readonly (readonly string[])[]
  wide?: boolean
}) {
  return (
    <figure
      className={`ie-agentic-pastel-table-wrap my-8 sm:my-10${wide ? ' ie-agentic-hub-table-wide' : ''}`}
      style={{ marginLeft: 0, marginRight: 0 }}
    >
      {caption ? (
        <figcaption className="ie-agentic-pastel-table-wrap__caption">{caption}</figcaption>
      ) : null}
      <div className="overflow-x-auto">
        <table className="ie-agentic-pastel-table">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join('|')}>
                {row.map((cell, i) => (
                  <td key={`${i}-${cell.slice(0, 24)}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

export function AgenticGeoLead({ children }: { children: ReactNode }) {
  return (
    <p className="ie-hub-geo-summary ie-agentic-pastel-lead mt-3 max-w-3xl text-sm leading-relaxed sm:text-base">
      {children}
    </p>
  )
}

export function AgenticStatusBadge({ status }: { status: 'confirmed' | 'emerging' | 'projected' }) {
  const labels = { confirmed: 'Confirmed', emerging: 'Emerging', projected: 'Projected' } as const
  const variant = { confirmed: 'mint', emerging: 'lavender', projected: 'peach' } as const
  return (
    <span className={`ie-agentic-pastel-badge ie-agentic-pastel-badge--${variant[status]}`}>
      {labels[status]}
    </span>
  )
}

export function AgenticMistakeCard({
  index,
  mistake,
  consequence,
  fix,
}: {
  index: number
  mistake: string
  consequence: string
  fix: string
}) {
  return (
    <div className={agenticPastelCardClass(index)}>
      <p className="ie-agentic-pastel-card__eyebrow">#{index}</p>
      <p className="ie-agentic-pastel-card__title">{mistake}</p>
      <p className="ie-agentic-pastel-card__body">
        <strong>Consequence: </strong>
        {consequence}
      </p>
      <p className="ie-agentic-pastel-card__body">
        <strong>Fix: </strong>
        {fix}
      </p>
    </div>
  )
}

export function AgenticQuestionCard({
  question,
  guidance,
  signal,
  variantIndex = 0,
}: {
  question: string
  guidance: string
  signal: string
  variantIndex?: number
}) {
  return (
    <div className={agenticPastelCardClass(variantIndex)}>
      <p className="ie-agentic-pastel-card__title">{question}</p>
      <p className="ie-agentic-pastel-card__body">
        <strong>Guidance: </strong>
        {guidance}
      </p>
      <p className="ie-agentic-pastel-card__meta">Signal: {signal}</p>
    </div>
  )
}
