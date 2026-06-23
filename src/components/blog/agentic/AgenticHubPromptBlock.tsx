'use client'

import { AgenticHubPromptCopy } from '@/components/blog/agentic/AgenticHubPromptCopy'
import type { AgenticPromptExample } from '@/lib/seo/blog/agentic-ai-hub-prompts'

const VARIANT_CLASS = {
  poor: 'ie-agentic-prompt--poor',
  good: 'ie-agentic-prompt--good',
  improved: 'ie-agentic-prompt--improved',
} as const

function highlightPrompt(code: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // API paths first — before any <span> tags exist (avoids matching /span in closing tags)
  html = html.replace(/(\/[a-zA-Z][\w/-]*)/g, '<span class="tok-path">$1</span>')

  html = html
    .replace(
      /(Stack:|Context:|Task:|Errors:|Expected:|Files:|Also generate|Do not|Review|Threat model:|Output:|Bug:|File:|Constraint:)([^\n]*)/g,
      '<span class="tok-label">$1</span>$2',
    )
    .replace(/\b(POST|GET|Node|Express|TypeScript|vitest|ISO8601|uuid|JWT)\b/g, '<span class="tok-kw">$1</span>')
    .replace(/\b(\d{3})\b/g, '<span class="tok-num">$1</span>')
    .replace(/(\{[^}]+\})/g, '<span class="tok-str">$1</span>')

  return html
}

export function AgenticHubPromptBlock({
  examples,
  layout = 'grid',
}: {
  examples: readonly AgenticPromptExample[]
  layout?: 'grid' | 'duo'
}) {
  return (
    <div
      className={`ie-agentic-prompt-grid${layout === 'duo' ? ' ie-agentic-prompt-grid--duo' : ''}`}
      role="group"
      aria-label="Prompt examples"
    >
      {examples.map((ex) => (
        <div key={ex.title + ex.variant} className={`ie-agentic-prompt ${VARIANT_CLASS[ex.variant]}`}>
          <div className="ie-agentic-prompt__header">
            <p className="ie-agentic-prompt__label">{ex.title}</p>
            <AgenticHubPromptCopy text={ex.code} label={`Copy ${ex.title.toLowerCase()}`} />
          </div>
          <pre className="ie-agentic-prompt__pre">
            <code dangerouslySetInnerHTML={{ __html: highlightPrompt(ex.code) }} />
          </pre>
          {ex.note ? <p className="ie-agentic-prompt__note">{ex.note}</p> : null}
        </div>
      ))}
    </div>
  )
}

export function AgenticHubPromptCompare({
  poor,
  good,
  improved,
}: {
  poor: string
  good: string
  improved: string
}) {
  const items: AgenticPromptExample[] = [
    { variant: 'poor', title: 'Poor prompt', code: poor },
    { variant: 'good', title: 'Good prompt', code: good },
    { variant: 'improved', title: 'Improved prompt', code: improved, note: 'Adds context, tests, and guardrails.' },
  ]
  return <AgenticHubPromptBlock examples={items} />
}
