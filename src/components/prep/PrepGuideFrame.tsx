import type { ReactNode } from 'react'
import Link from 'next/link'
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell'
import { PrepMockCta } from '@/components/prep/PrepMockCta'
import { PrepViewBeacon } from '@/components/prep/PrepViewBeacon'
import { FREE_PLAN } from '@/lib/pricing/plans'
import type { PrepGuideKey } from '@/lib/prep/guides'
import { PREP_GUIDES, PREP_UPDATED } from '@/lib/prep/guides'
import type { ScriptStartInterviewMode } from '@/lib/interview/script-start-query'

export function PrepGuideFrame({
  guideKey,
  lede,
  sections,
  mode,
  children,
  tools,
}: {
  guideKey: PrepGuideKey
  lede: ReactNode
  sections: readonly { id: string; label: string }[]
  mode?: ScriptStartInterviewMode
  children: ReactNode
  /** Interactive tools sit outside article prose so blog heading CSS does not restyle them. */
  tools?: ReactNode
}) {
  const guide = PREP_GUIDES[guideKey]

  return (
    <BlogMarketingShell backHref="/resources" backLabel="All resources">
      <PrepViewBeacon event="prep_guide_opened" pagePath={guide.path} />
      <article className="mx-auto w-full max-w-3xl xl:max-w-[48rem]">
        <header className="mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            {guide.eyebrow}
          </p>
          <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl">
            {guide.title}
          </h1>
          <div className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {lede}
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>{guide.readTime}</span>
            <span aria-hidden>·</span>
            <time dateTime={PREP_UPDATED}>Updated 14 October 2026</time>
          </div>
        </header>

        <nav className="ie-blog-card mb-10 p-5 sm:mb-12 sm:p-6" aria-label="Jump to section">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            On this page
          </p>
          <ul className="m-0 list-none space-y-2 p-0 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="ie-blog-inline-link font-medium">
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ie-blog-prose">{children}</div>

        {tools ? <div className="mt-10">{tools}</div> : null}

        <aside className="ie-blog-card mt-12 p-5 sm:p-6">
          <h2 className="mt-0 text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Start a focused mock after you prepare
          </h2>
          <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            ChatGPT and checklists can organise what you will say. InterviewEra is where you say it aloud, take
            follow-up questions, and get a score on clarity, technical depth, structure, confidence, and relevance.
            New accounts include {FREE_PLAN.credits} free interview credits, so the first mocks are included before any
            paid plan. See <Link href="/pricing">pricing</Link> when those credits are used up.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <PrepMockCta mode={mode} section={guide.path} />
            <Link href="/how-it-works" className="ie-blog-inline-link self-center font-semibold">
              How a mock interview works
            </Link>
          </div>
        </aside>
      </article>
    </BlogMarketingShell>
  )
}
