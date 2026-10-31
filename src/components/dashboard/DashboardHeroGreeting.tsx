import { Quote } from 'lucide-react'
import { DashboardTargetIllustration } from './DashboardTargetIllustration'

const QUOTES = [
  'Consistent practice today leads to dream opportunities tomorrow.',
  'Every mock interview is a rehearsal for the offer you want.',
  "Confidence is built one honest answer at a time.",
  'Small daily reps beat one big cram session every time.',
  'The interview you practice for is the one you walk into calm.',
] as const

/** Deterministic pick by day-of-year — same quote all day, no client hydration mismatch risk. */
function quoteOfTheDay(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  )
  return QUOTES[dayOfYear % QUOTES.length]!
}

export function DashboardHeroGreeting({ displayName }: { displayName: string }) {
  return (
    <section
      className="dashboard-section dashboard-premium-card relative flex min-h-[11rem] items-stretch overflow-hidden px-5 py-5 sm:px-7 sm:py-6"
      style={{
        background:
          'linear-gradient(120deg, color-mix(in srgb, var(--accent-primary) 16%, var(--bg-secondary)), color-mix(in srgb, var(--accent-primary) 5%, var(--bg-secondary)))',
        border: 'none',
        boxShadow: 'none',
      }}
    >
      <div className="grid w-full grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex h-full flex-col justify-center">
          <h1 className="text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Hi, {displayName}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Ready to ace your next interview?
          </p>
          <p className="mt-1 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            Keep practicing and track your progress.
          </p>
        </div>

        <div className="hidden h-full w-52 shrink-0 self-stretch lg:block" aria-hidden>
          <DashboardTargetIllustration />
        </div>

        <div
          className="flex h-full max-w-xs items-center gap-2.5 justify-self-end rounded-2xl px-5 py-4"
          style={{ background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)' }}
        >
          <Quote
            className="mt-0.5 size-4 shrink-0"
            style={{ color: 'var(--accent-primary)' }}
            fill="var(--accent-primary)"
            aria-hidden
          />
          <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            &ldquo;{quoteOfTheDay()}&rdquo;
          </p>
        </div>
      </div>
    </section>
  )
}
