import { AGENTIC_EXECUTIVE_SUMMARY } from '@/lib/seo/blog/agentic-ai-hub-chapters'

export function AgenticHubExecutiveSummary() {
  return (
    <aside className="ie-agentic-hub-exec-summary" aria-label="60-second executive summary">
      <div className="ie-agentic-hub-exec-summary__badge">60-second executive summary</div>
      <p className="ie-agentic-hub-exec-summary__lead">
        Everything in this guide in one scan — then dive into any chapter from the sidebar.
      </p>
      <ul className="ie-agentic-hub-exec-summary__list">
        {AGENTIC_EXECUTIVE_SUMMARY.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  )
}
