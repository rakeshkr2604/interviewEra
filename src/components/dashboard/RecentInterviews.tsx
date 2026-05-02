'use client'
import Link from 'next/link'

interface Interview {
  id: string
  role: string
  difficulty: string
  status: string
  started_at: string
  score?: number | null
}

interface RecentInterviewsProps {
  interviews: Interview[]
}

export function RecentInterviews({ interviews }: RecentInterviewsProps) {
  if (interviews.length === 0) {
    return (
      <p
        className="text-sm py-6 text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        No interviews yet — start your first one!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {interviews.map((interview) => {
        const isCompleted = interview.status === 'completed'
        const date = new Date(interview.started_at).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
        })

        return (
          <Link
            key={interview.id}
            href={isCompleted ? `/report/${interview.id}` : `/interview/${interview.id}`}
            className="flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all duration-150 hover:-translate-y-0.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 82%, transparent)',
              textDecoration: 'none',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {interview.role}
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {interview.difficulty} · {date}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--text-secondary)' }}
              >
                {interview.score != null ? `${interview.score}/10` : '0/10'}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={{
                  background: isCompleted
                    ? 'var(--accent-success)20'
                    : 'var(--accent-warning)20',
                  color: isCompleted
                    ? 'var(--accent-success)'
                    : 'var(--accent-warning)',
                }}
              >
                {isCompleted ? 'completed' : 'in-progress'}
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
