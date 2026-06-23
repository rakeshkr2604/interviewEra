import type { AgenticMistake } from '@/lib/seo/blog/agentic-ai-hub-mistakes'

export function AgenticHubMistakesAccordion({ items }: { items: readonly AgenticMistake[] }) {
  return (
    <div className="ie-blog-faq-stack ie-blog-faq-stack--accordion ie-agentic-hub-mistakes-accordion">
      {items.map((m, i) => (
        <details key={m.mistake} className="ie-blog-faq-item ie-blog-faq-item--accordion">
          <summary className="ie-blog-faq-item__question">
            <span className="ie-agentic-hub-mistake-index">#{i + 1}</span>
            {m.mistake}
          </summary>
          <div className="ie-agentic-hub-mistake-body">
            <p>
              <strong>Consequence: </strong>
              {m.consequence}
            </p>
            <p>
              <strong>Fix: </strong>
              {m.fix}
            </p>
          </div>
        </details>
      ))}
    </div>
  )
}
