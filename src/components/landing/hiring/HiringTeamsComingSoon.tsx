import Link from 'next/link'
import { ArrowRight, Building2, Mail } from 'lucide-react'
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container'
import { cn } from '@/lib/utils'

/**
 * Public Coming Soon shell for `/teams` while Hiring Teams product is unfinished.
 * Full landing remains in HiringTeamsLandingClient — toggled via Platform Admin.
 */
export function HiringTeamsComingSoon() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute left-1/2 top-[-18%] h-[min(20rem,70vw)] w-[min(20rem,70vw)] -translate-x-1/2 rounded-full blur-[100px] opacity-40"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 28%, transparent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,black,transparent)]"
          style={{
            backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--text-secondary) 6%, transparent) 1px, transparent 1px),
              linear-gradient(to bottom, color-mix(in srgb, var(--text-secondary) 6%, transparent) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <section
        className={cn(
          LANDING_PAGE_CONTAINER,
          'relative mx-auto flex max-w-3xl flex-col items-center px-4 pb-20 pt-14 text-center sm:px-5 sm:pb-28 sm:pt-20',
        )}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--accent-primary)' }}
        >
          Hiring Teams
        </p>
        <h1
          className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-bricolage), Bricolage Grotesque, sans-serif',
          }}
        >
          Coming soon
        </h1>
        <p
          className="mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg"
          style={{ color: 'var(--text-secondary)' }}
        >
          Structured AI interviews and a shared hiring pipeline — from Applied to Offer —
          so recruiting teams can compare candidates without interviewer bias. We&apos;re
          finishing the hiring model before opening public signup.
        </p>

        <ul
          className="mx-auto mt-8 inline-flex flex-col items-center gap-2.5 text-sm sm:text-base"
          style={{ color: 'var(--text-secondary)' }}
        >
          {[
            'Same rubric for every candidate',
            'Pipeline from Applied → Offer',
            'Compare shortlists without panel bias',
          ].map((line) => (
            <li key={line} className="flex items-center justify-center gap-2.5">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: 'var(--accent-primary)' }}
                aria-hidden
              />
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--ie-radius-sm)] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent-primary)' }}
          >
            <Mail className="size-4" aria-hidden />
            Request early access
          </Link>
          <Link
            href="/campus"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--ie-radius-sm)] border px-5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)',
              background: 'var(--card-bg)',
            }}
          >
            <Building2 className="size-4" aria-hidden />
            Campus placements
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <p
          className="mx-auto mt-6 max-w-md text-xs leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          For sales or demo requests:{' '}
          <a
            href="mailto:sales@interviewera.com"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-link)' }}
          >
            sales@interviewera.com
          </a>
          . Student mock interviews stay available on the free plan.
        </p>
      </section>
    </div>
  )
}
