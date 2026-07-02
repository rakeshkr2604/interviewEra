import Image from 'next/image'
import Link from 'next/link'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import { TcsResponsiveDataTable } from '@/components/programmatic/TcsResponsiveDataTable'
import type { Company } from '@/lib/seo/programmatic/companies'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import { questionsHubPath } from '@/lib/seo/programmatic'
import {
  COMPANY_HUB_CARD_STYLE,
  COMPANY_HUB_CONTENT_CLASS,
  COMPANY_HUB_PROSE_CLASS,
  COMPANY_HUB_SECTION_H2_CLASS,
  COMPANY_HUB_SECTION_H3_CLASS,
  COMPANY_HUB_TOUCH_TARGET_CLASS,
} from '@/lib/seo/programmatic/company-hub-blueprint'
import {
  WIPRO_2026_TRENDS,
  WIPRO_AUTHOR_NAME,
  WIPRO_CAREER_GROWTH,
  WIPRO_COMPANY_OVERVIEW,
  WIPRO_CONTEXTUAL_LINKS,
  WIPRO_DOCUMENTS_CHECKLIST,
  WIPRO_EDITORIAL_NOTE,
  WIPRO_ELIGIBILITY_COLUMNS,
  WIPRO_ELIGIBILITY_ROWS,
  WIPRO_FAQ_ITEMS,
  WIPRO_GEO_HIRING_STATUS,
  WIPRO_GEO_OVERVIEW,
  WIPRO_HERO_ALT,
  WIPRO_HERO_HEIGHT,
  WIPRO_HERO_LEAD,
  WIPRO_HERO_PATH,
  WIPRO_HERO_WIDTH,
  WIPRO_HIRING_PROGRAMS,
  WIPRO_HIRING_TIMELINE,
  WIPRO_HR_TOPICS,
  WIPRO_HUB_QUESTIONS,
  WIPRO_LAST_UPDATED,
  WIPRO_LOCATIONS,
  WIPRO_OFFER_JOINING_STEPS,
  WIPRO_ONLINE_TEST_DISCLAIMER,
  WIPRO_ONLINE_TEST_SECTIONS,
  WIPRO_ONLINE_TEST_TABLE_COLUMNS,
  WIPRO_ONLINE_TEST_TABLE_ROWS,
  WIPRO_PROCESS_ALT,
  WIPRO_PROCESS_HEIGHT,
  WIPRO_PROCESS_PATH,
  WIPRO_PROCESS_WIDTH,
  WIPRO_READING_TIME,
  WIPRO_RECRUITMENT_CALENDAR,
  WIPRO_REVIEWED_DATE,
  WIPRO_REVIEWER_NAME,
  WIPRO_ROADMAP_15,
  WIPRO_ROADMAP_30,
  WIPRO_ROADMAP_60,
  WIPRO_ROLE_GUIDE_CARDS,
  WIPRO_SALARY_TIERS,
  WIPRO_TECHNICAL_TOPICS,
  WIPRO_TOC_SECTIONS,
  WIPRO_TRAINING_ILP,
  WIPRO_WORK_CULTURE,
} from '@/lib/seo/programmatic/wipro-hub'

const cardStyle = COMPANY_HUB_CARD_STYLE
const H2_CLASS = COMPANY_HUB_SECTION_H2_CLASS
const H3_CLASS = COMPANY_HUB_SECTION_H3_CLASS

const WIPRO_RECRUITMENT_CALENDAR_COLUMNS = ['Month', 'Activity', 'Intensity'] as const
const WIPRO_RECRUITMENT_CALENDAR_ROWS = WIPRO_RECRUITMENT_CALENDAR.map(
  (row) => [row.month, row.activity, row.intensity] as const,
)

function RoadmapSection({
  id,
  heading,
  intro,
  blocks,
}: {
  id: string
  heading: string
  intro: string
  blocks: readonly { week: string; focus: string; items: readonly string[] }[]
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
        {heading}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
        {intro}
      </p>
      <ol className="ie-fe-roadmap-grid mt-4 list-none p-0">
        {blocks.map((block, index) => (
          <li key={block.week}>
            <section className="ie-fe-roadmap-week rounded-xl border p-4" style={cardStyle}>
              <div className="ie-fe-roadmap-week__head">
                <span className="ie-fe-roadmap-week__badge" aria-hidden>
                  {index + 1}
                </span>
                <div>
                  <p className="ie-fe-roadmap-week__label m-0">{block.week}</p>
                  <h3 className="ie-fe-roadmap-week__focus m-0">{block.focus}</h3>
                </div>
              </div>
              <ul
                className="ie-fe-roadmap-week__list mt-3 list-none p-0 text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {block.items.map((item) => (
                  <li key={item} className="ie-fe-roadmap-week__item">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function WiproHubArticle({
  company,
  questions: _questions,
}: {
  company: Company
  questions: readonly SeoQuestion[]
}) {
  return (
    <article className={COMPANY_HUB_PROSE_CLASS}>
      <header className="ie-blog-editorial-header ie-role-ba-hero">
        <div className={COMPANY_HUB_CONTENT_CLASS}>
          <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Questions
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{company.label}</span>
          </nav>

          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            IT Services · Campus Placement · {company.headquartersCity}
          </p>
          <h1 className="ie-blog-article-h1 ie-blog-article-h1--single">
            <span className="ie-blog-article-h1__line">Wipro Careers, Hiring & Interview Hub</span>{' '}
            <span className="ie-blog-article-h1__accent">India 2026</span>
          </h1>
          <div className="ie-blog-article-meta ie-role-ba-hero-badges mt-5 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Hiring 2026
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Freshers
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              WILP
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Elite NLTH
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Turbo
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {company.avgPackageRange}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {WIPRO_READING_TIME}
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {WIPRO_HERO_LEAD}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="#wipro-hub-questions"
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Browse {WIPRO_HUB_QUESTIONS.length} interview questions
            </Link>
            <Link
              href="/tools/question-generator/companies/wipro"
              className={`inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary) ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate Wipro questions free
            </Link>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={WIPRO_HERO_PATH}
            alt={WIPRO_HERO_ALT}
            width={WIPRO_HERO_WIDTH}
            height={WIPRO_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${COMPANY_HUB_CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={WIPRO_TOC_SECTIONS} />
        </div>
      </header>

      <div className={COMPANY_HUB_CONTENT_CLASS}>
        <aside className="mt-6 rounded-xl border p-4" style={cardStyle} aria-label="Article metadata">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            About this guide
          </p>
          <dl className="mt-2 space-y-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Author:</dt>
              <dd className="m-0">{WIPRO_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{WIPRO_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{WIPRO_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{WIPRO_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{WIPRO_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {WIPRO_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="wipro-hub-overview">
          <h2 id="wipro-hub-overview" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Wipro Careers Overview
          </h2>
          <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {WIPRO_GEO_OVERVIEW}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Drill role-specific depth on our{' '}
            <Link href="/interview-questions/companies/wipro/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro Software Engineer guide
            </Link>
            ,{' '}
            <Link href="/interview-questions/companies/wipro/java-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro Java Developer guide
            </Link>
            ,{' '}
            <Link href="/interview-questions/companies/wipro/data-analyst" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro Data Analyst guide
            </Link>
            , and{' '}
            <Link href="/interview-questions/companies/wipro/qa-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro QA Engineer guide
            </Link>
            . Compare the parallel pipeline on the{' '}
            <Link href="/interview-questions/tcs" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS Interview Questions Hub
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="wipro-hub-hiring-status">
          <h2 id="wipro-hub-hiring-status" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            2026 Hiring Status
          </h2>
          <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {WIPRO_GEO_HIRING_STATUS}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Monitor your campus placement cell and{' '}
            <Link href="https://careers.wipro.com" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              careers.wipro.com
            </Link>{' '}
            for drive-specific dates. Off-campus batches in Q1 and Q3 typically have stricter NLTH cutoffs than on-campus
            visits — start aptitude prep before registration opens.
          </p>
        </section>

        {WIPRO_HIRING_PROGRAMS.map((program) => (
          <section key={program.id} aria-labelledby={`wipro-hub-${program.id}`}>
            <h2 id={`wipro-hub-${program.id}`} className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
              {program.title}
            </h2>
            <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              {program.geo}
            </p>
            {program.body.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                {paragraph}
              </p>
            ))}
            <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {program.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="wipro-hub-recruitment-calendar">
          <h2 id="wipro-hub-recruitment-calendar" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Recruitment Calendar 2026
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Month-by-month hiring intensity for Wipro campus, off-campus, internship, and lateral pipelines in India.
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Wipro recruitment calendar 2026 — month, activity, and intensity"
              columns={WIPRO_RECRUITMENT_CALENDAR_COLUMNS}
              rows={WIPRO_RECRUITMENT_CALENDAR_ROWS}
            />
          </div>
        </section>

        <section aria-labelledby="wipro-hub-hiring-timeline">
          <h2 id="wipro-hub-hiring-timeline" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            End-to-End Hiring Timeline
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            From application through ILP training — the standard Wipro fresher pipeline for NLTH, Turbo, and Elite tracks.
          </p>
          <figure className="mt-6" aria-labelledby="wipro-process-figcaption">
            <div
              className="mx-auto w-full max-w-[900px] overflow-hidden rounded-xl border"
              style={{
                borderColor: 'var(--card-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <Image
                src={WIPRO_PROCESS_PATH}
                alt={WIPRO_PROCESS_ALT}
                width={WIPRO_PROCESS_WIDTH}
                height={WIPRO_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption id="wipro-process-figcaption" className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {WIPRO_PROCESS_ALT}
            </figcaption>
          </figure>
          <div className="mt-6 space-y-4">
            {WIPRO_HIRING_TIMELINE.map((item) => (
              <section key={item.step} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.step}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-hiring-locations">
          <h2 id="wipro-hub-hiring-locations" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Hiring Locations
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Wipro maps freshers to delivery hubs across India. Relocation flexibility during HR improves offer probability.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WIPRO_LOCATIONS.map((location) => (
              <section key={location.city} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {location.city}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {location.note}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-online-test">
          <h2 id="wipro-hub-online-test" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            NLTH Online Test Pattern
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The National Level Talent Hunt is the highest-leverage elimination stage — balance aptitude, English, and
            technical MCQs rather than coding alone.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>
            {WIPRO_ONLINE_TEST_DISCLAIMER}
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Wipro NLTH section breakdown with focus areas and typical weight"
              columns={WIPRO_ONLINE_TEST_TABLE_COLUMNS}
              rows={WIPRO_ONLINE_TEST_TABLE_ROWS}
            />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {WIPRO_ONLINE_TEST_SECTIONS.map((item) => (
              <section key={item.section} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.section}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.body}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Prep tip: </strong>
                  {item.prep}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-technical-interview">
          <h2 id="wipro-hub-technical-interview" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Technical Interview
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Combined Tech+HR sessions are common in 2026 — prepare narrated coding, Core CS fundamentals, and project
            depth in one sitting.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WIPRO_TECHNICAL_TOPICS.map((card) => (
              <section key={card.topic} className="rounded-xl border p-4" style={cardStyle}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                    {card.topic}
                  </h3>
                  <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                    {card.weight}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.detail}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-hr-interview">
          <h2 id="wipro-hub-hr-interview" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            HR Interview
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            HR probes relocation, salary band acceptance, and authentic motivation for IT services — weak company research
            fails candidates after strong technical rounds.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WIPRO_HR_TOPICS.map((card) => (
              <section key={card.topic} className="rounded-xl border p-4" style={cardStyle}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                    {card.topic}
                  </h3>
                  <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                    {card.weight}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.detail}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-eligibility">
          <h2 id="wipro-hub-eligibility" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Eligibility Criteria
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Degree, CGPA, and backlog rules vary by drive — verify your campus notice before registering for NLTH.
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Wipro eligibility criteria by degree and program"
              columns={WIPRO_ELIGIBILITY_COLUMNS}
              rows={WIPRO_ELIGIBILITY_ROWS}
            />
          </div>
        </section>

        <section aria-labelledby="wipro-hub-salary">
          <h2 id="wipro-hub-salary" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Salary & Package Bands
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Fresher CTC depends on track — standard NLTH, Turbo, Elite NLTH, or WILP work-study. Confirm fixed vs
            variable split on your offer letter.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {WIPRO_SALARY_TIERS.map((cell) => (
              <section key={cell.title} className={`ie-role-ba-salary-tier ie-role-ba-salary-tier--${cell.tier}`}>
                <p className="ie-role-ba-salary-tier__label">{cell.title}</p>
                <p className="ie-role-ba-salary-tier__range">{cell.range}</p>
                <p className="ie-role-ba-salary-tier__note">{cell.note}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-role-guides">
          <h2 id="wipro-hub-role-guides" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Role-Specific Interview Guides
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Flagship role guides with NLTH prep, technical depth, salary context, and curated question banks.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {WIPRO_ROLE_GUIDE_CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-xl border p-4 transition-colors hover:border-(--accent-primary)"
                style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--v3-accdim) 40%, var(--card-bg))' }}
              >
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {card.title} →
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.description}
                </p>
                <p className="mt-2 text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                  Preview: {card.preview}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <QuestionsList
          sectionId="wipro-hub-questions"
          headingId="wipro-hub-questions"
          questions={WIPRO_HUB_QUESTIONS}
          heading={`${company.label} Interview Questions`}
          metaLabel={`${WIPRO_HUB_QUESTIONS.length} curated · NLTH & CS fundamentals · Updated 2026`}
          expanded
        />

        <RoadmapSection
          id="wipro-hub-roadmap-15"
          heading="15-Day Crash Roadmap"
          intro="Compressed NLTH and interview sprint when your drive is two weeks away — aptitude first, then technical MCQs and mock loops."
          blocks={WIPRO_ROADMAP_15}
        />

        <RoadmapSection
          id="wipro-hub-roadmap-30"
          heading="30-Day Preparation Roadmap"
          intro="Four-week campus prep plan — aptitude foundation, technical MCQs, interview depth, and full mocks."
          blocks={WIPRO_ROADMAP_30}
        />

        <RoadmapSection
          id="wipro-hub-roadmap-60"
          heading="60-Day Deep Prep Roadmap"
          intro="Eight-week plan for early starters — aptitude mastery, DSA, Core CS, projects, and combined Tech+HR simulation."
          blocks={WIPRO_ROADMAP_60}
        />

        <section aria-labelledby="wipro-hub-documents">
          <h2 id="wipro-hub-documents" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Documents Checklist
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Bring originals and copies to campus drives, virtual interviews, and joining day — name mismatches delay BGV.
          </p>
          <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {WIPRO_DOCUMENTS_CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="wipro-hub-offer-joining">
          <h2 id="wipro-hub-offer-joining" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Offer & Joining Process
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            From offer letter to ILP commencement — verify track name (NLTH, Turbo, Elite, WILP) before accepting.
          </p>
          <div className="mt-4 space-y-4">
            {WIPRO_OFFER_JOINING_STEPS.map((item) => (
              <section key={item.step} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.step}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.detail}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-training">
          <h2 id="wipro-hub-training" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            WILP vs ILP Training
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {WIPRO_TRAINING_ILP.wilpNote} {WIPRO_TRAINING_ILP.ilpNote}
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Wipro WILP work-study vs ILP fresher onboarding comparison"
              columns={WIPRO_TRAINING_ILP.comparisonRows[0]}
              rows={WIPRO_TRAINING_ILP.comparisonRows.slice(1)}
            />
          </div>
          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            WILP — Work Integrated Learning
          </h3>
          {WIPRO_TRAINING_ILP.wilpBody.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              {paragraph}
            </p>
          ))}
          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            ILP — Initial Learning Program
          </h3>
          {WIPRO_TRAINING_ILP.ilpBody.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              {paragraph}
            </p>
          ))}
        </section>

        <section aria-labelledby="wipro-hub-career-growth">
          <h2 id="wipro-hub-career-growth" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Career Growth Path
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WIPRO_CAREER_GROWTH.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-work-culture">
          <h2 id="wipro-hub-work-culture" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Work Culture
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WIPRO_WORK_CULTURE.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-company-overview">
          <h2 id="wipro-hub-company-overview" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Company Overview
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WIPRO_COMPANY_OVERVIEW.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-2026-trends">
          <h2 id="wipro-hub-2026-trends" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            2026 Hiring Trends
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WIPRO_2026_TRENDS.map((trend) => (
              <section key={trend.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {trend.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {trend.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-hub-faq">
          <h2 id="wipro-hub-faq" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack ie-blog-faq-stack--accordion">
            {WIPRO_FAQ_ITEMS.map((item) => (
              <details key={item.question} className="ie-blog-faq-item ie-blog-faq-item--accordion">
                <summary className="ie-blog-faq-item__question">{item.question}</summary>
                <p className="ie-blog-faq-item__answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          id="wipro-hub-mock-cta"
          aria-labelledby="wipro-hub-mock-cta-heading"
          className="mt-8 rounded-xl border p-6 sm:p-8"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))',
          }}
        >
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>
            Practice beats passive reading
          </p>
          <h2
            id="wipro-hub-mock-cta-heading"
            className={`mt-2 ${H2_CLASS}`}
            style={{ color: 'var(--text-primary)' }}
          >
            Run a full Wipro mock interview — NLTH, technical, and HR
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Practice aptitude recall, narrated coding, Core CS fundamentals, and HR STAR answers with AI-generated
            follow-ups. Get rubric-based feedback on communication, technical depth, structure, confidence, and relevance.
          </p>
          <ul className="mt-4 max-w-2xl list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Resume-aware technical + HR questions for campus roles</li>
            <li>Timed answers with filler-word analysis on voice mode</li>
            <li>Free credits to start — no card required</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free Wipro mock interview
            </Link>
            <Link
              href="/tools/question-generator/companies/wipro"
              className={`inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary) ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate practice questions
            </Link>
            <Link
              href="/blog/what-is-star-method-with-examples"
              className={`inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary) ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              STAR method guide
            </Link>
          </div>
        </section>

        <section aria-labelledby="wipro-hub-related">
          <h2 id="wipro-hub-related" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Related Interview Preparation Guides
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WIPRO_CONTEXTUAL_LINKS.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="ie-company-hub-related-link rounded-xl border p-4 text-sm font-medium leading-snug transition-colors hover:border-(--accent-primary)"
                style={{
                  borderColor: 'var(--card-border)',
                  color: 'var(--accent-primary)',
                  background: 'color-mix(in srgb, var(--v3-accdim) 40%, var(--card-bg))',
                }}
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </section>
      </div>
    </article>
  )
}
