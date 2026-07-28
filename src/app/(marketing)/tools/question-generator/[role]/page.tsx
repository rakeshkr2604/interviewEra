import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  howToJsonLd,
  webApplicationJsonLd,
} from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { schemaIds } from '@/lib/seo/metadata'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import {
  getRoleBySlug,
  allToolVariantRoleParams,
  roleQuestionsPath,
  qgDeepLinkPath,
} from '@/lib/seo/programmatic'
import {
  toolVariantRoleMetadata,
  toolQGenRoleBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import { getRoleQuestionsFlat, buildFaqPairs } from '@/lib/seo/programmatic/questions'
import { LANDING_PAGE_CONTAINER, LANDING_SECTION } from '@/lib/landing/container'
import { buildToolQGenRoleLinks } from '@/lib/seo/internal-linking'

export function generateStaticParams() {
  return allToolVariantRoleParams()
}

/** Unknown slugs must 404 at the router — not soft-404 via streamed notFound() under (marketing)/loading.tsx. */
export const dynamicParams = false

type Props = { params: Promise<{ role: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) return {}
  return toolVariantRoleMetadata(role)
}

const ORIGIN = getCanonicalSiteOrigin()

const WEBAPP_LD = webApplicationJsonLd({
  name: 'Free Interview Question Generator',
  description:
    'Generate AI-powered, role-specific interview questions in seconds. Free to use, no sign-up required.',
  url: canonicalUrl('/tools/question-generator'),
  providerId: schemaIds.organization,
})

const HOWTO_STEPS = [
  {
    name: 'Enter your role',
    text: 'Type or select your target role in the question generator. You can also specify experience level and domain for more tailored output.',
  },
  {
    name: 'Generate questions',
    text: 'Click "Generate questions" to get 10 curated interview questions in under 10 seconds — no account or sign-up needed.',
  },
  {
    name: 'Practice your answers',
    text: 'Work through each question aloud or in writing. Use the STAR method for behavioral questions and think through edge cases for technical questions.',
  },
  {
    name: 'Upgrade for scored mock interviews',
    text: 'For AI-scored practice with detailed feedback across 5 dimensions, start a full mock interview session on InterviewEra.',
  },
]

export default async function QGenRolePage({ params }: Props) {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) notFound()

  const allQuestions = getRoleQuestionsFlat(role.slug)
  const previewQuestions = allQuestions.slice(0, 5)
  const faqPairs = buildFaqPairs(previewQuestions)
  const linkSections = buildToolQGenRoleLinks(role)

  const BREADCRUMB_LD = breadcrumbListJsonLd(toolQGenRoleBreadcrumbs(role), ORIGIN)
  const FAQ_LD = faqPairs.length > 0 ? faqPageJsonLd(faqPairs) : null
  const HOWTO_LD = howToJsonLd(
    `How to use the free ${role.label} interview question generator`,
    `Generate ${role.label} interview questions and practise answering them before your interview.`,
    HOWTO_STEPS,
  )

  return (
    <>
      <JsonLdScript id="qgen-role-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="qgen-role-webapp-ld" data={WEBAPP_LD} />
      <JsonLdScript id="qgen-role-howto-ld" data={HOWTO_LD} />
      {FAQ_LD ? <JsonLdScript id="qgen-role-faq-ld" data={FAQ_LD} /> : null}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${LANDING_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href="/tools/question-generator" className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Question Generator
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{role.label}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            Free tool · no sign-up · 10 seconds
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Free {role.label} Interview Question Generator
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            Generate AI-powered {role.label} interview questions instantly — technical, behavioral, and situational.
            {role.fresherFriendly ? ' Tailored for Indian campus placements and fresher hiring.' : ' Calibrated for experienced-hire interviews at Indian tech companies.'}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={qgDeepLinkPath('role', { role: role.label })}
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Generate {role.shortLabel} questions free
            </Link>
            <Link
              href={roleQuestionsPath(role.slug)}
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Browse {role.label} question bank
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className={LANDING_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            How to generate {role.label} interview questions
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOWTO_STEPS.map((step, i) => (
              <li
                key={step.name}
                className="flex flex-col gap-2 rounded-xl border p-5"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  {i + 1}
                </span>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{step.name}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Sample questions preview ──────────────────────────────────────── */}
      {previewQuestions.length > 0 ? (
        <section className={LANDING_SECTION}>
          <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
            <h2
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Sample {role.label} interview questions
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              A preview from our curated question bank. The generator produces fresh, AI-tailored questions on each run.
            </p>
            <ul className="mt-5 grid gap-3">
              {previewQuestions.map((q, i) => (
                <li
                  key={q.question}
                  className="flex gap-3 rounded-lg border p-4"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  }}
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)', color: 'var(--accent-primary)' }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{q.question}</p>
                    {q.tip ? (
                      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        Tip: {q.tip}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <Link
                href={roleQuestionsPath(role.slug)}
                className="font-medium hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                See all {allQuestions.length} curated {role.label} questions →
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={`${LANDING_SECTION} border-y`}
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
            Ready to practice your {role.label} answers?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Go beyond reading questions — upload your resume and get AI-scored mock interview feedback
            across technical depth, communication, structure, confidence, and relevance.
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
              href={qgDeepLinkPath('role', { role: role.label })}
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate questions now
            </Link>
          </div>
        </div>
      </section>

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
