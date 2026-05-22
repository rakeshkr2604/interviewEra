import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { questionsHubMetadata } from '@/lib/seo/programmatic/metadata'
import {
  ROLES,
  COMPANIES,
  SKILLS,
  roleQuestionsPath,
  companyQuestionsPath,
  skillQuestionsPath,
  questionsHubPath,
} from '@/lib/seo/programmatic'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION } from '@/lib/landing/container'

export const metadata: Metadata = questionsHubMetadata()

const ORIGIN = getCanonicalSiteOrigin()

const HUB_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Interview Questions', path: questionsHubPath() },
  ],
  ORIGIN,
)

// Split companies by tier for the browse grid
const SERVICE_COMPANIES = COMPANIES.filter((c) => c.tier === 'service')
const PRODUCT_COMPANIES = COMPANIES.filter((c) => c.tier === 'product' || c.tier === 'startup')
const MNC_COMPANIES = COMPANIES.filter((c) => c.tier === 'mnc')

export default function InterviewQuestionsHubPage() {
  return (
    <>
      <JsonLdScript id="iq-hub-breadcrumb-ld" data={HUB_BREADCRUMB_LD} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            Interview Preparation · India · 2026
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl md:text-[2.4rem]"
            style={{ color: 'var(--text-primary)' }}
          >
            Interview Questions for Indian Placements 2026
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            Browse curated interview questions by role, company, or technology. Every page covers
            technical, behavioral, and HR rounds with preparation tips — built for Indian campus
            placements.
          </p>

          {/* Stats strip */}
          <dl
            className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {[
              { label: 'Roles covered', value: String(ROLES.length) },
              { label: 'Companies covered', value: String(COMPANIES.length) },
              { label: 'Technologies covered', value: String(SKILLS.length) },
            ].map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1.5">
                <dd className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stat.value}
                </dd>
                <dt>{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Browse by Role ────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <SectionHeader
            eyebrow="By role"
            title="Browse by Job Role"
            description="Pick your target role to see curated questions covering technical depth, behavioral scenarios, and HR rounds."
          />
          <ul className="mt-6 grid gap-3 p-0 list-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
            {ROLES.map((role) => (
              <li key={role.slug} className="p-0">
                <Link
                  href={roleQuestionsPath(role.slug)}
                  className="group flex h-full flex-col justify-between rounded-xl border px-4 py-3.5 transition-colors hover:border-(--accent-primary)"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  }}
                >
                  <span
                    className="text-sm font-semibold leading-snug"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {role.label}
                  </span>
                  <span
                    className="mt-2 flex items-center gap-2 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {role.fresherFriendly ? (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: 'color-mix(in srgb, #22c55e 16%, transparent)' }}
                      >
                        Fresher-friendly
                      </span>
                    ) : null}
                    <span className="capitalize">{role.category}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Browse by Company ─────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <SectionHeader
            eyebrow="By company"
            title="Browse by Company"
            description="Get company-specific interview questions, process overviews, and preparation tips for top Indian employers."
          />

          <CompanyGroup heading="IT Service Companies" companies={SERVICE_COMPANIES} />
          <CompanyGroup heading="Indian Product & Startups" companies={PRODUCT_COMPANIES} />
          <CompanyGroup heading="Global MNCs" companies={MNC_COMPANIES} />
        </div>
      </section>

      {/* ── Browse by Skill ───────────────────────────────────────────────── */}
      <section className={CONTENT_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <SectionHeader
            eyebrow="By technology"
            title="Browse by Skill / Topic"
            description="Deep-dive question sets for specific technologies and computer science subjects — essential for technical rounds."
          />
          <ul
            className="mt-6 flex flex-wrap gap-2.5 p-0 list-none"
            role="list"
          >
            {SKILLS.map((skill) => (
              <li key={skill.slug} className="p-0">
                <Link
                  href={skillQuestionsPath(skill.slug)}
                  className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors hover:border-(--accent-primary) hover:text-(--accent-primary)"
                  style={{
                    borderColor: 'var(--card-border)',
                    color: 'var(--text-secondary)',
                    background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  }}
                >
                  {skill.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-t`}
        style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5 text-center`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Ready to practice, not just read?
          </h2>
          <p
            className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--text-secondary)' }}
          >
            InterviewEra generates questions from your actual resume and scores your answers across
            five dimensions — the same rubric campus panels use.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: 'var(--accent-primary)',
              color: '#fff',
            }}
          >
            Start free mock interview
          </Link>
        </div>
      </section>
    </>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-2xl">
      <p
        className="text-xs font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--accent-primary)' }}
      >
        {eyebrow}
      </p>
      <h2
        className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
    </div>
  )
}

function CompanyGroup({
  heading,
  companies,
}: {
  heading: string
  companies: typeof COMPANIES[number][]
}) {
  return (
    <div className="mt-8 first:mt-6">
      <h3
        className="mb-3 text-xs font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {heading}
      </h3>
      <ul className="flex flex-wrap gap-2.5 p-0 list-none" role="list">
        {companies.map((company) => (
          <li key={company.slug} className="p-0">
            <Link
              href={companyQuestionsPath(company.slug)}
              className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium transition-colors hover:border-(--accent-primary) hover:text-(--accent-primary)"
              style={{
                borderColor: 'var(--card-border)',
                color: 'var(--text-secondary)',
                background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
              }}
            >
              {company.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
