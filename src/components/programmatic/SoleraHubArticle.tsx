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
  SOLERA_ABOUT_CARDS,
  SOLERA_AUTHOR_NAME,
  SOLERA_CODING_INTERVIEW,
  SOLERA_CONTEXTUAL_LINKS,
  SOLERA_EDITORIAL_NOTE,
  SOLERA_ELIGIBILITY_COLUMNS,
  SOLERA_ELIGIBILITY_ROWS,
  SOLERA_ENGINEERING_CULTURE,
  SOLERA_FAQ_ITEMS,
  SOLERA_GEO_HIRING_STATUS,
  SOLERA_GEO_OVERVIEW,
  SOLERA_HERO_ALT,
  SOLERA_HERO_HEIGHT,
  SOLERA_HERO_LEAD,
  SOLERA_HERO_PATH,
  SOLERA_HERO_WIDTH,
  SOLERA_HIRING_CHANNELS,
  SOLERA_HIRING_TIMELINE,
  SOLERA_HUB_QUESTIONS,
  SOLERA_INTERVIEW_ROUNDS,
  SOLERA_LAST_UPDATED,
  SOLERA_LOCATIONS,
  SOLERA_MISTAKES,
  SOLERA_ONLINE_ASSESSMENT_DISCLAIMER,
  SOLERA_ONLINE_ASSESSMENT_SECTIONS,
  SOLERA_ONLINE_ASSESSMENT_TABLE_COLUMNS,
  SOLERA_ONLINE_ASSESSMENT_TABLE_ROWS,
  SOLERA_PROCESS_ALT,
  SOLERA_PROCESS_HEIGHT,
  SOLERA_PROCESS_PATH,
  SOLERA_PROCESS_WIDTH,
  SOLERA_READING_TIME,
  SOLERA_RECRUITMENT_CALENDAR,
  SOLERA_RESUME_TIPS,
  SOLERA_REVIEWED_DATE,
  SOLERA_REVIEWER_NAME,
  SOLERA_ROADMAP_7,
  SOLERA_ROADMAP_15,
  SOLERA_ROADMAP_30,
  SOLERA_ROLE_GUIDE_CARDS,
  SOLERA_SALARY_TIERS,
  SOLERA_TECHNICAL_TOPICS,
  SOLERA_TOC_SECTIONS,
} from '@/lib/seo/programmatic/solera-hub'

const cardStyle = COMPANY_HUB_CARD_STYLE
const H2_CLASS = COMPANY_HUB_SECTION_H2_CLASS
const H3_CLASS = COMPANY_HUB_SECTION_H3_CLASS

const SOLERA_RECRUITMENT_CALENDAR_COLUMNS = ['Month', 'Activity', 'Intensity'] as const
const SOLERA_RECRUITMENT_CALENDAR_ROWS = SOLERA_RECRUITMENT_CALENDAR.map(
  (row) => [row.month, row.activity, row.intensity] as const,
)

const SOLERA_FRESHER_CHANNEL = SOLERA_HIRING_CHANNELS.find((channel) => channel.id === 'freshers')!
const SOLERA_EXPERIENCED_CHANNEL = SOLERA_HIRING_CHANNELS.find((channel) => channel.id === 'experienced')!
const SOLERA_MANAGER_ROUND = SOLERA_INTERVIEW_ROUNDS.find((round) => round.round === 'Manager Round')!
const SOLERA_HR_ROUND = SOLERA_INTERVIEW_ROUNDS.find((round) => round.round === 'HR Round')!
const SOLERA_PROJECT_ROUNDS = SOLERA_INTERVIEW_ROUNDS.filter((round) =>
  round.round.includes('Technical Interview'),
)
const SOLERA_OFFER_JOINING_STEPS = SOLERA_HIRING_TIMELINE.slice(5)
const SOLERA_BEHAVIORAL_TOPIC = SOLERA_TECHNICAL_TOPICS.find((topic) => topic.topic === 'Behavioral')!

const SOLERA_2026_TREND_CARDS = [
  {
    title: 'Off-campus batches in Q1 and Q3',
    body: SOLERA_GEO_HIRING_STATUS,
  },
  {
    title: 'Cognitive assessment as primary filter',
    body: SOLERA_ONLINE_ASSESSMENT_DISCLAIMER,
  },
  {
    title: 'Java and SQL over framework buzzwords',
    body: SOLERA_CODING_INTERVIEW.difficulty,
  },
  {
    title: 'AI and data intelligence on the roadmap',
    body: SOLERA_ABOUT_CARDS[3].body,
  },
] as const

function RoadmapSection({
  id,
  heading,
  intro,
  blocks,
}: {
  id: string
  heading: string
  intro: string
  blocks: readonly { period: string; focus: string; items: readonly string[] }[]
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
          <li key={block.period}>
            <section className="ie-fe-roadmap-week rounded-xl border p-4" style={cardStyle}>
              <div className="ie-fe-roadmap-week__head">
                <span className="ie-fe-roadmap-week__badge" aria-hidden>
                  {index + 1}
                </span>
                <div>
                  <p className="ie-fe-roadmap-week__label m-0">{block.period}</p>
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

function InterviewRoundCard({
  round,
}: {
  round: (typeof SOLERA_INTERVIEW_ROUNDS)[number]
}) {
  return (
    <section className="rounded-xl border p-4" style={cardStyle}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
          {round.round}
        </h3>
        <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
          {round.difficulty} · {round.duration}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Purpose: </strong>
        {round.purpose}
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Evaluates: </strong>
        {round.evaluates}
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>Topics: </strong>
        {round.topics.join(' · ')}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <section
          className="rounded-lg border p-3"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
          }}
        >
          <h4 className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            Common rejection reasons
          </h4>
          <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {round.rejectionReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>
        <section
          className="rounded-lg border p-3"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
          }}
        >
          <h4 className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
            Preparation tips
          </h4>
          <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {round.prepTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}

export function SoleraHubArticle({
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
            Automotive SaaS · Product Engineering · Bengaluru / Hyderabad
          </p>
          <h1 className="ie-blog-article-h1 ie-blog-article-h1--single">
            <span className="ie-blog-article-h1__line">Solera Interview Questions</span>{' '}
            <span className="ie-blog-article-h1__accent">Hiring & Careers Hub India 2026</span>
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
              Experienced
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Bengaluru / Hyderabad
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {company.avgPackageRange}
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {company.typicalRounds} rounds · {company.interviewStyle}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {SOLERA_READING_TIME}
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_HERO_LEAD}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="#solera-hub-questions"
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Browse {SOLERA_HUB_QUESTIONS.length} interview questions
            </Link>
            <Link
              href="/tools/question-generator/companies/solera"
              className={`inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary) ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate Solera questions free
            </Link>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={SOLERA_HERO_PATH}
            alt={SOLERA_HERO_ALT}
            width={SOLERA_HERO_WIDTH}
            height={SOLERA_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${COMPANY_HUB_CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={SOLERA_TOC_SECTIONS} />
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
              <dd className="m-0">{SOLERA_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{SOLERA_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{SOLERA_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{SOLERA_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{SOLERA_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {SOLERA_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="solera-hub-overview">
          <h2 id="solera-hub-overview" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Solera Careers Overview
          </h2>
          <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_GEO_OVERVIEW}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Drill role-specific depth on our{' '}
            <Link href="/interview-questions/companies/solera/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Solera Software Engineer guide
            </Link>
            ,{' '}
            <Link href="/interview-questions/companies/solera/java-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Solera Java Developer guide
            </Link>
            , and{' '}
            <Link href="/interview-questions/companies/solera/qa-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Solera QA Engineer guide
            </Link>
            . Strengthen fundamentals via{' '}
            <Link href="/interview-questions/topics/dsa" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA topic questions
            </Link>
            ,{' '}
            <Link href="/interview-questions/topics/java" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Java interview questions
            </Link>
            , and{' '}
            <Link href="/interview-questions/topics/sql" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              SQL interview questions
            </Link>
            . Compare peer product companies:{' '}
            <Link href="/interview-questions/companies/freshworks" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Freshworks
            </Link>
            ,{' '}
            <Link href="/interview-questions/companies/zoho" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Zoho
            </Link>
            , and{' '}
            <Link href="/interview-questions/companies/browserstack" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              BrowserStack
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="solera-hub-hiring-status">
          <h2 id="solera-hub-hiring-status" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            2026 Hiring Status
          </h2>
          <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_GEO_HIRING_STATUS}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Monitor Solera&apos;s Workday careers portal and LinkedIn India page for Q1 and Q3 off-campus batch
            announcements. Competition per batch is intense — start cognitive assessment prep before registration opens.
          </p>
        </section>

        <section aria-labelledby="solera-hub-about-solera">
          <h2 id="solera-hub-about-solera" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            About Solera
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SOLERA_ABOUT_CARDS.slice(0, 2).concat(SOLERA_ABOUT_CARDS.slice(4, 6)).map((card) => (
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

        <section aria-labelledby="solera-hub-brands-products">
          <h2 id="solera-hub-brands-products" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Brands & Products
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SOLERA_ABOUT_CARDS.slice(2, 4).map((card) => (
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

        <section aria-labelledby="solera-hub-hiring-india">
          <h2 id="solera-hub-hiring-india" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Hiring in India
          </h2>
          <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_ABOUT_CARDS[5].body}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border p-4" style={cardStyle}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {SOLERA_ABOUT_CARDS[5].title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {SOLERA_ABOUT_CARDS[5].body}
              </p>
            </section>
            <section className="rounded-xl border p-4" style={cardStyle}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {SOLERA_ABOUT_CARDS[6].title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {SOLERA_ABOUT_CARDS[6].body}
              </p>
            </section>
          </div>
        </section>

        <section aria-labelledby="solera-hub-hiring-channels">
          <h2 id="solera-hub-hiring-channels" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Hiring Channels
          </h2>
          <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Solera India hiring flows through off-campus Workday drives, selective campus partnerships, referrals,
            internships, and year-round lateral product engineering — each channel follows a distinct pipeline and timeline.
          </p>
        </section>

        {SOLERA_HIRING_CHANNELS.map((channel) => (
          <section key={channel.id} aria-labelledby={`solera-hub-${channel.id}`}>
            <h2 id={`solera-hub-${channel.id}`} className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
              {channel.title}
            </h2>
            <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              {channel.geo}
            </p>
            {channel.body.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                {paragraph}
              </p>
            ))}
            <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {channel.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="solera-hub-recruitment-calendar">
          <h2 id="solera-hub-recruitment-calendar" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Recruitment Calendar 2026
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Month-by-month hiring intensity for Solera off-campus, campus, internship, and lateral pipelines in India.
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Solera recruitment calendar 2026 — month, activity, and intensity"
              columns={SOLERA_RECRUITMENT_CALENDAR_COLUMNS}
              rows={SOLERA_RECRUITMENT_CALENDAR_ROWS}
            />
          </div>
        </section>

        <section aria-labelledby="solera-hub-hiring-timeline">
          <h2 id="solera-hub-hiring-timeline" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            End-to-End Hiring Timeline
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            From Workday application through onboarding — the standard Solera Associate Software Engineer pipeline for
            India fresher and off-campus hiring in 2026.
          </p>
          <figure className="mt-6" aria-labelledby="solera-process-figcaption">
            <div
              className="mx-auto w-full max-w-[900px] overflow-hidden rounded-xl border"
              style={{
                borderColor: 'var(--card-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <Image
                src={SOLERA_PROCESS_PATH}
                alt={SOLERA_PROCESS_ALT}
                width={SOLERA_PROCESS_WIDTH}
                height={SOLERA_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption id="solera-process-figcaption" className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {SOLERA_PROCESS_ALT}
            </figcaption>
          </figure>
          <div className="mt-6 space-y-4">
            {SOLERA_HIRING_TIMELINE.map((item) => (
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

        <section aria-labelledby="solera-hub-recruitment-process">
          <h2 id="solera-hub-recruitment-process" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Recruitment Process
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Solera&apos;s India fresher pipeline follows a predictable sequence — each round eliminates candidates before
            the next stage invests panel time. Lateral hires typically skip the cognitive assessment.
          </p>
          <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_INTERVIEW_ROUNDS.map((round) => (
              <li key={round.round}>
                <strong style={{ color: 'var(--text-primary)' }}>{round.round}</strong> — {round.purpose}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="solera-hub-workday-portal">
          <h2 id="solera-hub-workday-portal" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Workday Applications
          </h2>
          <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_HIRING_TIMELINE[0].body}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_FAQ_ITEMS.find((item) => item.question.includes('Workday'))?.answer}
          </p>
        </section>

        <section aria-labelledby="solera-hub-interview-rounds">
          <h2 id="solera-hub-interview-rounds" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Interview Rounds
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Detailed breakdown of every Solera evaluation stage — purpose, topics, rejection patterns, and preparation
            tips grounded in 2026 candidate reports.
          </p>
          <div className="mt-6 space-y-4">
            {SOLERA_INTERVIEW_ROUNDS.map((round) => (
              <InterviewRoundCard key={round.round} round={round} />
            ))}
          </div>
        </section>

        <section aria-labelledby="solera-hub-online-assessment">
          <h2 id="solera-hub-online-assessment" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Cognitive Assessment
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The ~30-minute cognitive assessment is the highest-leverage elimination stage — balance quantitative aptitude,
            logical reasoning, and personality consistency rather than coding prep alone.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>
            {SOLERA_ONLINE_ASSESSMENT_DISCLAIMER}
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Solera cognitive assessment section breakdown with focus areas and typical weight"
              columns={SOLERA_ONLINE_ASSESSMENT_TABLE_COLUMNS}
              rows={SOLERA_ONLINE_ASSESSMENT_TABLE_ROWS}
            />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {SOLERA_ONLINE_ASSESSMENT_SECTIONS.map((item) => (
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

        <section aria-labelledby="solera-hub-coding-interview">
          <h2 id="solera-hub-coding-interview" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Coding Interview
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_CODING_INTERVIEW.difficulty}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Platforms: </strong>
            {SOLERA_CODING_INTERVIEW.platforms.join(' · ')}
          </p>
          <h3 className={`mt-6 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Panel expectations
          </h3>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_CODING_INTERVIEW.expectations.map((expectation) => (
              <li key={expectation}>{expectation}</li>
            ))}
          </ul>
          <h3 className={`mt-6 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Common problems
          </h3>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_CODING_INTERVIEW.commonProblems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="solera-hub-technical-topics">
          <h2 id="solera-hub-technical-topics" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Technical Topics
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Sixteen topic areas weighted by Solera panel frequency — prioritize High-weight skills before framework depth.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SOLERA_TECHNICAL_TOPICS.map((card) => (
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

        <section aria-labelledby="solera-hub-manager-round">
          <h2 id="solera-hub-manager-round" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Manager Round
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The manager round assesses ownership, collaboration fit, and motivation for automotive SaaS product
            engineering — not additional coding depth.
          </p>
          <div className="mt-4">
            <InterviewRoundCard round={SOLERA_MANAGER_ROUND} />
          </div>
        </section>

        <section aria-labelledby="solera-hub-hr-round">
          <h2 id="solera-hub-hr-round" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            HR Round
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Final behavioral screen covering relocation, salary acceptance, and cultural fit — weak company research fails
            candidates after strong technical performance.
          </p>
          <div className="mt-4">
            <InterviewRoundCard round={SOLERA_HR_ROUND} />
          </div>
        </section>

        <section aria-labelledby="solera-hub-project-discussion">
          <h2 id="solera-hub-project-discussion" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Project Discussion
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Both technical rounds probe capstone and internship depth — prepare architecture diagrams, your specific
            modules, and honest ownership claims before any live panel.
          </p>
          <div className="mt-4 space-y-4">
            {SOLERA_PROJECT_ROUNDS.map((round) => (
              <InterviewRoundCard key={round.round} round={round} />
            ))}
          </div>
        </section>

        <section aria-labelledby="solera-hub-associate-swe">
          <h2 id="solera-hub-associate-swe" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Associate Software Engineer
          </h2>
          <p className="ie-hub-geo-summary mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_FRESHER_CHANNEL.geo}
          </p>
          {SOLERA_FRESHER_CHANNEL.body.map((paragraph) => (
            <p key={paragraph.slice(0, 48)} className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              {paragraph}
            </p>
          ))}
          <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_FRESHER_CHANNEL.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="solera-hub-role-guides">
          <h2 id="solera-hub-role-guides" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Role-Specific Guides
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Eleven role guides with Solera-specific and generic interview prep — cognitive assessment context, technical
            depth, and curated question banks.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {SOLERA_ROLE_GUIDE_CARDS.map((card) => (
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
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {card.note}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="solera-hub-salary">
          <h2 id="solera-hub-salary" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Salary & Package Estimates
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Figures are job-board aggregates — not officially published by Solera. Confirm fixed vs variable split on your
            offer letter before accepting.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {SOLERA_SALARY_TIERS.map((cell) => (
              <section key={cell.title} className={`ie-role-ba-salary-tier ie-role-ba-salary-tier--${cell.tier}`}>
                <p className="ie-role-ba-salary-tier__label">{cell.title}</p>
                <p className="ie-role-ba-salary-tier__range">{cell.range}</p>
                <p className="ie-role-ba-salary-tier__note">{cell.note}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="solera-hub-eligibility">
          <h2 id="solera-hub-eligibility" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Eligibility Criteria
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Degree, CGPA, and backlog rules vary by Workday drive — verify the specific posting before applying.
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Solera eligibility criteria by degree and program"
              columns={SOLERA_ELIGIBILITY_COLUMNS}
              rows={SOLERA_ELIGIBILITY_ROWS}
            />
          </div>
        </section>

        <section aria-labelledby="solera-hub-hiring-locations">
          <h2 id="solera-hub-hiring-locations" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Hiring Locations
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Solera maps freshers to Bengaluru or Hyderabad engineering centers. Relocation flexibility during HR improves
            offer probability.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SOLERA_LOCATIONS.map((location) => (
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

        <section aria-labelledby="solera-hub-engineering-culture">
          <h2 id="solera-hub-engineering-culture" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Engineering Culture
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SOLERA_ENGINEERING_CULTURE.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Meaning: </strong>
                  {card.meaning}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Why at Solera: </strong>
                  {card.whySolera}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Sample signal: </strong>
                  {card.sampleSignal}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="solera-hub-resume-tips">
          <h2 id="solera-hub-resume-tips" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Resume Tips
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SOLERA_RESUME_TIPS.map((card) => (
              <section key={card.tip} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {card.tip}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {card.body}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="solera-hub-mistakes">
          <h2 id="solera-hub-mistakes" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Common Mistakes
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {SOLERA_MISTAKES.length} elimination patterns reported by Solera candidates in 2026 — each with a concrete fix.
          </p>
          <div className="mt-4 space-y-4">
            {SOLERA_MISTAKES.map((item) => (
              <section key={item.mistake} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.mistake}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Why it fails: </strong>
                  {item.why}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Fix: </strong>
                  {item.fix}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="solera-hub-fresher-vs-experienced">
          <h2 id="solera-hub-fresher-vs-experienced" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Freshers vs Experienced
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border p-4" style={cardStyle}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {SOLERA_FRESHER_CHANNEL.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {SOLERA_FRESHER_CHANNEL.geo}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {SOLERA_FRESHER_CHANNEL.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border p-4" style={cardStyle}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {SOLERA_EXPERIENCED_CHANNEL.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {SOLERA_EXPERIENCED_CHANNEL.geo}
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {SOLERA_EXPERIENCED_CHANNEL.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </section>
          </div>
        </section>

        <section aria-labelledby="solera-hub-behavioral-prep">
          <h2 id="solera-hub-behavioral-prep" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Behavioral Preparation
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Manager and HR rounds weight STAR stories, domain curiosity, and relocation flexibility — not additional
            coding depth.
          </p>
          <section className="mt-4 rounded-xl border p-4" style={cardStyle}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {SOLERA_BEHAVIORAL_TOPIC.topic}
              </h3>
              <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                {SOLERA_BEHAVIORAL_TOPIC.weight}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {SOLERA_BEHAVIORAL_TOPIC.detail}
            </p>
          </section>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Structure answers with the{' '}
            <Link href="/blog/what-is-star-method-with-examples" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              STAR method
            </Link>
            . Prepare three stories: deadline pressure, team conflict, and learning agility — each tied to measurable
            outcomes from capstone or internship work.
          </p>
        </section>

        <RoadmapSection
          id="solera-hub-roadmap-7"
          heading="7-Day Crash Roadmap"
          intro="Compressed cognitive assessment and Java coding sprint when your Solera drive is one week away — aptitude first, then Core CS and HR."
          blocks={SOLERA_ROADMAP_7.map((block) => ({
            period: block.day,
            focus: block.focus,
            items: block.items,
          }))}
        />

        <RoadmapSection
          id="solera-hub-roadmap-15"
          heading="15-Day Preparation Roadmap"
          intro="Two-week Solera prep plan — cognitive assessment foundation, Java coding, Core CS depth, and full mock loops."
          blocks={SOLERA_ROADMAP_15.map((block) => ({
            period: block.week,
            focus: block.focus,
            items: block.items,
          }))}
        />

        <RoadmapSection
          id="solera-hub-roadmap-30"
          heading="30-Day Deep Prep Roadmap"
          intro="Four-week plan for early starters — aptitude mastery, Java coding, Core CS + SQL + REST, and full-loop mocks with domain research."
          blocks={SOLERA_ROADMAP_30.map((block) => ({
            period: block.week,
            focus: block.focus,
            items: block.items,
          }))}
        />

        <section aria-labelledby="solera-hub-offer-joining">
          <h2 id="solera-hub-offer-joining" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Offer & Joining
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            From offer letter through Bengaluru or Hyderabad onboarding — verify CTC breakdown and joining location before
            accepting.
          </p>
          <div className="mt-4 space-y-4">
            {SOLERA_OFFER_JOINING_STEPS.map((item) => (
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

        <section aria-labelledby="solera-hub-2026-trends">
          <h2 id="solera-hub-2026-trends" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            2026 Hiring Trends
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SOLERA_2026_TREND_CARDS.map((trend) => (
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

        <QuestionsList
          sectionId="solera-hub-questions"
          headingId="solera-hub-questions"
          questions={SOLERA_HUB_QUESTIONS}
          heading={`${company.label} Interview Questions`}
          metaLabel={`${SOLERA_HUB_QUESTIONS.length} curated · Cognitive assessment & CS fundamentals · Updated 2026`}
          expanded
        />

        <section aria-labelledby="solera-hub-faq">
          <h2 id="solera-hub-faq" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack ie-blog-faq-stack--accordion">
            {SOLERA_FAQ_ITEMS.map((item) => (
              <details key={item.question} className="ie-blog-faq-item ie-blog-faq-item--accordion">
                <summary className="ie-blog-faq-item__question">{item.question}</summary>
                <p className="ie-blog-faq-item__answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          id="solera-hub-mock-cta"
          aria-labelledby="solera-hub-mock-cta-heading"
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
            id="solera-hub-mock-cta-heading"
            className={`mt-2 ${H2_CLASS}`}
            style={{ color: 'var(--text-primary)' }}
          >
            Run a full Solera mock interview — cognitive assessment, coding, and HR
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Practice aptitude recall, narrated Java coding, Core CS fundamentals, and HR STAR answers with AI-generated
            follow-ups. Get rubric-based feedback on communication, technical depth, structure, confidence, and relevance.
          </p>
          <ul className="mt-4 max-w-2xl list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Resume-aware technical + HR questions for Associate SWE roles</li>
            <li>Timed answers with filler-word analysis on voice mode</li>
            <li>Free credits to start — no card required</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free Solera mock interview
            </Link>
            <Link
              href="/tools/question-generator/companies/solera"
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

        <section aria-labelledby="solera-hub-related">
          <h2 id="solera-hub-related" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Related Interview Preparation Guides
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOLERA_CONTEXTUAL_LINKS.map((link) => (
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
