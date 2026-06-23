import { AGENTIC_PROCESS_STEPS } from '@/lib/seo/blog/agentic-ai-hub'
import { ArrowDown, ArrowRight } from 'lucide-react'

const FLOW_PASTELS = ['#f3f5fb', '#f0faf4', '#fff6ed', '#eff6ff', '#fdf2f8'] as const
const FLOW_BORDERS = ['#d8d0ea', '#b8e0cc', '#f5d5b8', '#bfdbfe', '#f9c5df'] as const

export function AgenticInterviewFlow() {
  return (
    <div className="ie-agentic-pastel-table-wrap my-8 p-4 sm:my-10 sm:p-6" aria-label="Agentic AI interview process flow">
      <p className="ie-agentic-pastel-table-wrap__caption">End-to-end agentic interview process</p>
      <div className="flex flex-col items-stretch gap-1 sm:hidden">
        {AGENTIC_PROCESS_STEPS.map((step, i) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className="w-full rounded-xl border px-4 py-3 text-center text-sm font-medium"
              style={{
                borderColor: FLOW_BORDERS[i % FLOW_BORDERS.length],
                background: FLOW_PASTELS[i % FLOW_PASTELS.length],
                color: 'var(--text-primary)',
              }}
            >
              {step}
            </div>
            {i < AGENTIC_PROCESS_STEPS.length - 1 ? (
              <ArrowDown className="my-1 size-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
      <div className="hidden flex-wrap items-center justify-center gap-2 sm:flex">
        {AGENTIC_PROCESS_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className="rounded-lg border px-3 py-2 text-xs font-medium lg:text-sm"
              style={{
                borderColor: FLOW_BORDERS[i % FLOW_BORDERS.length],
                background: FLOW_PASTELS[i % FLOW_PASTELS.length],
                color: 'var(--text-primary)',
              }}
            >
              {step}
            </div>
            {i < AGENTIC_PROCESS_STEPS.length - 1 ? (
              <ArrowRight className="size-4 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
