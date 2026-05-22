import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import {
  getRoleBySlug,
  allRoleParams,
  questionsHubPath,
} from '@/lib/seo/programmatic'
import {
  rolePageMetadata,
  roleBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import {
  getRoleQuestionsFlat,
  buildFaqPairs,
} from '@/lib/seo/programmatic/questions'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION } from '@/lib/landing/container'
import { buildRolePageLinks, buildRoleSkillLinks } from '@/lib/seo/internal-linking'

export function generateStaticParams() {
  return allRoleParams()
}

type Props = { params: Promise<{ role: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) return {}
  return rolePageMetadata(role)
}

const ORIGIN = getCanonicalSiteOrigin()

export default async function RoleQuestionsPage({ params }: Props) {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) notFound()

  const questions = getRoleQuestionsFlat(role.slug)
  const faqPairs = buildFaqPairs(questions)

  const skillLinks = buildRoleSkillLinks(role)
  const linkSections = buildRolePageLinks(role)

  const BREADCRUMB_LD = breadcrumbListJsonLd(roleBreadcrumbs(role), ORIGIN)
  const FAQ_LD = faqPairs.length > 0 ? faqPageJsonLd(faqPairs) : null

  return (
    <>
      <JsonLdScript id="role-breadcrumb-ld" data={BREADCRUMB_LD} />
      {FAQ_LD ? <JsonLdScript id="role-faq-ld" data={FAQ_LD} /> : null}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Questions
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{role.label}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            {role.category} · {role.fresherFriendly ? 'Fresher-friendly' : 'Experienced'}
          </p>
          <h1
            className="mt-2 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {role.label} Interview Questions India 2026
          </h1>
          <p
            className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            {role.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {role.fresherFriendly ? (
              <InfoBadge label="Fresher-friendly" color="#22c55e" />
            ) : null}
            <InfoBadge label={`${role.category} role`} color="var(--accent-primary)" />
            {questions.length > 0 ? (
              <InfoBadge label={`${questions.length} curated questions`} color="var(--accent-primary)" />
            ) : null}
            <InfoBadge label="Updated 2026" color="var(--text-muted)" />
          </div>
        </div>
      </section>

      {/* ── Questions ────────────────────────────────────────────────────── */}
      <section className={CONTENT_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <QuestionsList
            questions={questions}
            heading={`${role.pluralLabel} Interview Questions`}
          />
        </div>
      </section>

      {/* ── Key skill topics (pill badges) ───────────────────────────────── */}
      {skillLinks.length > 0 ? (
        <section className={CONTENT_SECTION}>
          <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
            <h2
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Key topics to prepare for {role.label} interviews
            </h2>
            <p
              className="mt-2 max-w-2xl text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Recruiters test these skill areas specifically. Click any topic to see curated questions.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {skillLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-(--accent-primary)"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-y`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <p
            className="text-xs font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--accent-primary)' }}
          >
            Practice, not just reading
          </p>
          <h2
            className="mt-2 max-w-xl text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Get scored on your {role.label} answers
          </h2>
          <p
            className="mt-2 max-w-xl text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Upload your resume and practice a full {role.label} mock interview with AI-generated
            questions and rubric-based scoring across 5 dimensions — free to start.
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
              href="/tools/question-generator"
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate more questions free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Engine-driven cross-link sections ────────────────────────────── */}
      {linkSections.map((section) => (
        <SeoCrossLinksSection
          key={section.heading}
          heading={section.heading}
          links={section.links}
        />
      ))}
    </>
  )
}

function InfoBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color: 'var(--text-secondary)',
      }}
    >
      {label}
    </span>
  )
}
