import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { questionsHubMetadata } from '@/lib/seo/programmatic/metadata'
import { getFeaturedContentEntries, getAllContentEntries } from '@/lib/seo/content/registry'
import {
  ROLES,
  COMPANIES,
  SKILLS,
  roleQuestionsPath,
  companyQuestionsPath,
  skillQuestionsPath,
  questionsHubPath,
} from '@/lib/seo/programmatic'
import { isRoleIndexable } from '@/lib/seo/programmatic/indexing'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION, LANDING_HOME_EYEBROW, LANDING_HOME_HEADING, LANDING_HOME_SUBHEAD } from '@/lib/landing/container'
import { MarketingSectionHeader } from '@/components/layout/MarketingSectionHeader'
import {
  IE_MARKETING_CTA_PRIMARY_CLASS,
  IE_MARKETING_CTA_PRIMARY_STYLE,
  IE_MARKETING_CTA_SECONDARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_STYLE,
} from '@/lib/theme/component-classes'

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
  const featured = getFeaturedContentEntries().filter(
    (e) => e.type === 'role-hub' || e.type === 'company-role-hub' || e.type === 'blog',
  )
  const indexableCount = getAllContentEntries().filter(
    (e) => e.type !== 'resource-index' && e.type !== 'questions-hub',
  ).length

  return (
    <>
      <JsonLdScript id="iq-hub-breadcrumb-ld" data={HUB_BREADCRUMB_LD} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <p className={LANDING_HOME_EYEBROW}>
            Interview Preparation · India · 2026
          </p>
          <h1 className={`${LANDING_HOME_HEADING} max-w-3xl`}>
            Interview Questions for Indian Placements 2026
          </h1>
          <p className={`${LANDING_HOME_SUBHEAD} max-w-2xl text-left sm:text-lg`}>
            Browse curated interview questions by role, company, or technology. Every page covers
            technical, behavioral, and HR rounds with preparation tips — built for Indian campus
            placements.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/resources"
              className={IE_MARKETING_CTA_PRIMARY_CLASS}
              style={IE_MARKETING_CTA_PRIMARY_STYLE}
            >
              All prep resources
            </Link>
            <Link
              href="/blog"
              className={IE_MARKETING_CTA_SECONDARY_CLASS}
              style={IE_MARKETING_CTA_SECONDARY_STYLE}
            >
              Read guides
            </Link>
          </div>

          {/* Stats strip */}
          <dl
            className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            {[
              { label: 'Roles covered', value: String(ROLES.length) },
              { label: 'Companies covered', value: String(COMPANIES.length) },
              { label: 'Technologies covered', value: String(SKILLS.length) },
              { label: 'Indexed guides', value: String(indexableCount) },
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

      {/* ── Featured editorial hubs ─────────────────────────────────────── */}
      {featured.length > 0 ? (
        <section
          className={`${CONTENT_SECTION} border-b`}
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
            <MarketingSectionHeader
              eyebrow="Featured"
              title="Featured Interview Guides"
              subtitle="Deep-dive prep hubs with hiring process, roadmaps, and expanded question banks."
            />
            <ul className="mt-6 grid gap-3 p-0 list-none sm:grid-cols-2 lg:grid-cols-3" role="list">
              {featured.map((entry) => (
                <li key={entry.id} className="p-0">
                  <Link
                    href={entry.path}
                    className="group flex h-full flex-col rounded-xl border px-4 py-3.5 transition-colors hover:border-(--accent-primary)"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    }}
                  >
                    <span className="text-sm font-semibold leading-snug group-hover:text-(--accent-primary)">
                      {entry.title.replace(/ \(2026\)$/, '')}
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {entry.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ── Browse by Role ────────────────────────────────────────────────── */}
      <section
        className={`${CONTENT_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <MarketingSectionHeader
            eyebrow="By role"
            title="Browse by Job Role"
            subtitle="Pick your target role to see curated questions covering technical depth, behavioral scenarios, and HR rounds."
          />
          <ul className="mt-6 grid gap-3 p-0 list-none sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" role="list">
            {ROLES.filter(isRoleIndexable).map((role) => (
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
          <MarketingSectionHeader
            eyebrow="By company"
            title="Browse by Company"
            subtitle="Get company-specific interview questions, process overviews, and preparation tips for top Indian employers."
          />

          <CompanyGroup heading="IT Service Companies" companies={SERVICE_COMPANIES} />
          <CompanyGroup heading="Indian Product & Startups" companies={PRODUCT_COMPANIES} />
          <CompanyGroup heading="Global MNCs" companies={MNC_COMPANIES} />
        </div>
      </section>

      {/* ── Browse by Skill ───────────────────────────────────────────────── */}
      <section className={CONTENT_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <MarketingSectionHeader
            eyebrow="By technology"
            title="Browse by Skill / Topic"
            subtitle="Deep-dive question sets for specific technologies and computer science subjects — essential for technical rounds."
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
