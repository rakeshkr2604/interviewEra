import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import {
  getSkillBySlug,
  getRoleBySlug,
  allSkillParams,
  roleQuestionsPath,
  questionsHubPath,
} from '@/lib/seo/programmatic'
import {
  skillPageMetadata,
  skillBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import {
  getSkillQuestionsFlat,
  buildFaqPairs,
} from '@/lib/seo/programmatic/questions'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION } from '@/lib/landing/container'
import type { SeoTextLink } from '@/lib/seo/internal-links'
import { TOOL_PAGE_BLOG_LINKS } from '@/lib/seo/internal-links'
import type { SkillSlug } from '@/lib/seo/programmatic'

export function generateStaticParams() {
  return allSkillParams()
}

type Props = { params: Promise<{ skill: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { skill: skillSlug } = await params
  const skill = getSkillBySlug(skillSlug)
  if (!skill) return {}
  return skillPageMetadata(skill)
}

const ORIGIN = getCanonicalSiteOrigin()

const CATEGORY_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  data: 'Data & ML',
  devops: 'DevOps',
  database: 'Database',
  'cs-fundamentals': 'CS Fundamentals',
  cloud: 'Cloud',
  mobile: 'Mobile',
}

export default async function SkillQuestionsPage({ params }: Props) {
  const { skill: skillSlug } = await params
  const skill = getSkillBySlug(skillSlug)
  if (!skill) notFound()

  const questions = getSkillQuestionsFlat(skill.slug as SkillSlug)
  const faqPairs = buildFaqPairs(questions)

  // Related role links from skill.relatedRoles
  const relatedRoleLinks: SeoTextLink[] = skill.relatedRoles
    .flatMap((roleSlug) => {
      const role = getRoleBySlug(roleSlug)
      if (!role) return []
      return [{ href: roleQuestionsPath(role.slug), label: `${role.label} questions` }]
    })
    .slice(0, 6)

  const BREADCRUMB_LD = breadcrumbListJsonLd(skillBreadcrumbs(skill), ORIGIN)
  const FAQ_LD = faqPairs.length > 0 ? faqPageJsonLd(faqPairs) : null

  return (
    <>
      <JsonLdScript id="skill-breadcrumb-ld" data={BREADCRUMB_LD} />
      {FAQ_LD ? <JsonLdScript id="skill-faq-ld" data={FAQ_LD} /> : null}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Questions
            </Link>
            <span aria-hidden>›</span>
            <Link href={`${questionsHubPath()}/topics`} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Topics
            </Link>
            <span aria-hidden>›</span>
            <span>{skill.label}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            {CATEGORY_LABELS[skill.category] ?? skill.category}
            {skill.fresherRelevant ? ' · Fresher-relevant' : ''}
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {skill.label} Interview Questions 2026
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {skill.description}
          </p>

          {/* Meta badges */}
          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                color: 'var(--text-secondary)',
              }}
            >
              {CATEGORY_LABELS[skill.category] ?? skill.category}
            </span>
            {skill.fresherRelevant ? (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: 'color-mix(in srgb, #22c55e 14%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                Fresher-relevant
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────────────────── */}
      <section className={CONTENT_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <QuestionsList
            questions={questions}
            heading={`${skill.label} Interview Questions`}
          />
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-y`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="max-w-xl text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Practice {skill.shortLabel} questions with your own resume
          </h2>
          <p
            className="mt-2 max-w-xl text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            InterviewEra generates role-specific questions using your actual projects and skills.
            Get scored feedback on technical depth, clarity, and structure — free to start.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free mock interview
            </Link>
            <Link
              href={`/tools/question-generator`}
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Free question generator
            </Link>
          </div>
        </div>
      </section>

      {/* ── Related roles ─────────────────────────────────────────────────── */}
      {relatedRoleLinks.length > 0 ? (
        <SeoCrossLinksSection
          heading={`Roles that use ${skill.shortLabel}`}
          links={relatedRoleLinks}
        />
      ) : null}

      <SeoCrossLinksSection heading="Related guides and tools" links={TOOL_PAGE_BLOG_LINKS} />
    </>
  )
}
