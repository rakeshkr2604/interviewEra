import Link from 'next/link'
import { LifeBuoy } from 'lucide-react'
import { TECHNICAL_ISSUE_FEEDBACK_HREF } from '@/lib/technical-failures/ux'

export function TechnicalIssueProtection() {
  return (
    <aside
      className="mx-auto max-w-3xl rounded-2xl border px-5 py-5 sm:px-6"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
      }}
      aria-labelledby="technical-issue-protection"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl"
            style={{
              color: 'var(--accent-primary)',
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            }}
          >
            <LifeBuoy className="size-4" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <h3
              id="technical-issue-protection"
              className="font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Experienced a technical problem during your interview?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Report it through Feedback so our team can investigate.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Target resolution: 48–72 hours. If investigation takes longer, a complimentary
              service-recovery credit may be provided where applicable.
            </p>
          </div>
        </div>
        <Link
          href={TECHNICAL_ISSUE_FEEDBACK_HREF}
          className="inline-flex h-10 shrink-0 items-center justify-center self-start rounded-xl px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: 'var(--accent-primary)',
            boxShadow:
              '0 8px 24px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
          }}
        >
          Report a technical issue
        </Link>
      </div>
    </aside>
  )
}
