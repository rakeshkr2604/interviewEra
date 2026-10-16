import Image from 'next/image'
import Link from 'next/link'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import type { Company } from '@/lib/seo/programmatic/companies'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import {
  WIPRO_DA_2026_TRENDS,
  WIPRO_DA_CHECKLIST,
  WIPRO_DA_COMPANY_INSIGHTS,
  WIPRO_DA_CONTEXTUAL_LINKS,
  WIPRO_DA_EDITORIAL_NOTE,
  WIPRO_DA_ELIGIBILITY_CARDS,
  WIPRO_DA_FAQ_ITEMS,
  WIPRO_DA_HERO_ALT,
  WIPRO_DA_HERO_HEIGHT,
  WIPRO_DA_HERO_PATH,
  WIPRO_DA_HERO_WIDTH,
  WIPRO_DA_HIRING_STEPS,
  WIPRO_DA_INTERVIEW_ROUNDS,
  WIPRO_DA_LAST_UPDATED,
  WIPRO_DA_MISTAKES,
  WIPRO_DA_PREP_RESOURCE_LINKS,
  WIPRO_DA_PROCESS_ALT,
  WIPRO_DA_PROCESS_HEIGHT,
  WIPRO_DA_PROCESS_PATH,
  WIPRO_DA_PROCESS_WIDTH,
  WIPRO_DA_QUESTION_CATEGORIES,
  WIPRO_DA_READING_TIME,
  WIPRO_DA_REVIEWED_DATE,
  WIPRO_DA_REVIEWER_NAME,
  WIPRO_DA_AUTHOR_NAME,
  WIPRO_DA_ROADMAP_WEEKS,
  WIPRO_DA_SALARY_TIERS,
  WIPRO_DA_SKILL_CARDS,
  WIPRO_DA_TOC_SECTIONS,
  WIPRO_DA_VS_PEER_ROWS,
} from '@/lib/seo/programmatic/wipro-da-hub'
import { companyQuestionsPath, intersectionQuestionsPath, questionsHubPath } from '@/lib/seo/programmatic'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function WiproDaHubArticle({
  company,
  role,
  questions,
}: {
  company: Company
  role: Role
  questions: readonly SeoQuestion[]
}) {
  return (
    <article className={PROSE_CLASS}>
      <header className="ie-blog-editorial-header ie-role-ba-hero">
        <div className={CONTENT_CLASS}>
          <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Interview Questions
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <Link href={companyQuestionsPath(company.slug)} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              {company.label}
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{role.shortLabel}</span>
          </nav>

          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            {company.label} · {role.category}
          </p>
          <h1 className="ie-blog-article-h1">
            <span className="ie-blog-article-h1__line">{company.label} {role.label}</span>{' '}
            <span className="ie-blog-article-h1__accent">Interview Questions and Answers (2026)</span>
          </h1>
          <p className="ie-blog-article-deck">
            Complete Wipro Data Analyst preparation for India 2026 — NLTH online test, SQL and Python technical
            depth, statistics, visualization, case studies, salary ranges, 30-day roadmap, and expert sample answers
            for campus and lateral hiring.
          </p>
          <div className="ie-blog-article-meta ie-role-ba-hero-badges mt-5 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Difficulty: Easy to Medium
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              ₹3.5–9 LPA avg. package
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {questions.length} curated questions
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {WIPRO_DA_READING_TIME}
            </span>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={WIPRO_DA_HERO_PATH}
            alt={WIPRO_DA_HERO_ALT}
            width={WIPRO_DA_HERO_WIDTH}
            height={WIPRO_DA_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={WIPRO_DA_TOC_SECTIONS} />
        </div>
      </header>

      <div className={CONTENT_CLASS}>
        <aside className="mt-6 rounded-xl border p-4" style={cardStyle} aria-label="Article metadata">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            About this guide
          </p>
          <dl className="mt-2 space-y-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Author:</dt>
              <dd className="m-0">{WIPRO_DA_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{WIPRO_DA_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{WIPRO_DA_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{WIPRO_DA_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{WIPRO_DA_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {WIPRO_DA_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="wipro-da-overview">
          <h2 id="wipro-da-overview" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            What Wipro Asks Data Analyst Candidates in 2026
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Wipro Data Analyst interviews test NLTH aptitude first, then live SQL, Python/pandas basics, statistics,
            Excel reporting, visualization judgment, and structured case communication. Fresher drives emphasize
            fundamentals and project ownership — not competitive-programming difficulty. Most successful candidates
            clear NLTH, narrate query logic aloud, and quantify project impact in STAR format.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Compare with{' '}
            <Link href={intersectionQuestionsPath('tcs', 'data-analyst')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS Data Analyst questions
            </Link>
            ,{' '}
            <Link href={intersectionQuestionsPath('infosys', 'data-analyst')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys DA questions
            </Link>
            , and the{' '}
            <Link href="/interview-questions/data-analyst" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Data Analyst interview questions
            </Link>{' '}
            hub before you lock your study plan.
          </p>
        </section>

        <section aria-labelledby="wipro-da-hiring-process">
          <h2 id="wipro-da-hiring-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Wipro Data Analyst Hiring Process
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Most Wipro Data Analyst campus and off-campus drives follow NLTH online assessment, a technical interview
            covering SQL and analytics fundamentals, and an HR fit round — often combined into one live session for
            lateral hires. Each stage filters a different signal: speed, hands-on skills, and communication.
          </p>
          <div className="mt-4 space-y-4">
            {WIPRO_DA_HIRING_STEPS.map((item) => (
              <section key={item.step} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.step}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </section>
            ))}
          </div>
          <figure className="mt-6">
            <div
              className="mx-auto w-full overflow-hidden rounded-[20px] border"
              style={{
                borderColor: 'var(--card-border)',
                maxWidth: '900px',
                boxShadow: '0 14px 36px color-mix(in srgb, #000 12%, transparent)',
              }}
            >
              <Image
                src={WIPRO_DA_PROCESS_PATH}
                alt={WIPRO_DA_PROCESS_ALT}
                width={WIPRO_DA_PROCESS_WIDTH}
                height={WIPRO_DA_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Wipro Data Analyst hiring process — Application, NLTH, Technical Interview, HR Round, and Offer.
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="wipro-da-eligibility">
          <h2 id="wipro-da-eligibility" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Eligibility Criteria
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Wipro Data Analyst eligibility varies by campus tier and hiring season, but the cards below reflect
            typical fresher and lateral expectations for analytics-track shortlists in India. Strong NLTH scores and
            quantified project bullets can offset borderline CGPA in some drives.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {WIPRO_DA_ELIGIBILITY_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-da-interview-pattern">
          <h2 id="wipro-da-interview-pattern" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Interview Pattern — Round by Round
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Wipro typically runs three evaluation stages for Data Analyst roles. Duration and format shift slightly
            between campus NLTH batches and off-campus lateral hiring, but the skill signals remain consistent.
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table ie-role-ba-compare-table--5col">
              <caption className="sr-only">Wipro Data Analyst interview round breakdown</caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Round</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--da">Duration</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">Format</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Evaluates</th>
                </tr>
              </thead>
              <tbody>
                {WIPRO_DA_INTERVIEW_ROUNDS.map((row) => (
                  <tr key={row.round}>
                    <th scope="row" className="ie-role-ba-compare-table__dim">{row.round}</th>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row.duration}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row.format}</td>
                    <td className="ie-role-ba-compare-table__cell">{row.evaluates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="wipro-da-skills-tested">
          <h2 id="wipro-da-skills-tested" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Skills Tested at Wipro
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            SQL is the highest-weight skill for Wipro Data Analyst interviews, followed by communication and Python
            data manipulation. Drill topic banks on{' '}
            <Link href="/interview-questions/topics/sql" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              SQL interview questions
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/topics/python" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Python interview questions
            </Link>{' '}
            alongside this guide.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WIPRO_DA_SKILL_CARDS.map((card) => (
              <section key={card.skill} className="rounded-xl border p-4" style={cardStyle}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.skill}</h3>
                  <span className="text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>{card.weight}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.detail}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-da-2026-trends">
          <h2 id="wipro-da-2026-trends" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Latest 2026 Hiring Trends
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Wipro Data Analyst interviews in 2026 emphasize NLTH fundamentals, structured case communication, and
            Power BI–ready visualization skills more than deep machine learning theory. Panels increasingly combine
            technical and HR evaluation in single sessions.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WIPRO_DA_2026_TRENDS.map((trend) => (
              <section key={trend.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{trend.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{trend.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-da-question-categories">
          <h2 id="wipro-da-question-categories" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Question Categories
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The curated question bank below spans SQL, Python, statistics, Excel, visualization, case studies,
            behavioral, and HR categories — matching what Wipro panels probe most frequently in 2026 analytics hiring.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WIPRO_DA_QUESTION_CATEGORIES.map((cat) => (
              <section key={cat.category} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{cat.category}</h3>
                <p className="mt-1 text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>{cat.count}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{cat.focus}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-da-company-insights">
          <h2 id="wipro-da-company-insights" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Wipro Analytics — Company Insights
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Understanding Wipro&apos;s analytics practice helps you answer HR questions credibly and frame project
            experience in client-delivery language. Research the{' '}
            <Link href={companyQuestionsPath(company.slug)} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro interview questions hub
            </Link>{' '}
            for company-wide context beyond the DA track.
          </p>
          <div className="mt-4 space-y-4">
            {WIPRO_DA_COMPANY_INSIGHTS.map((insight) => (
              <section key={insight.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{insight.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{insight.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-da-salary">
          <h2 id="wipro-da-salary" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Wipro Data Analyst Salary in India (2026)
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Wipro Data Analyst salaries vary by experience band, city, and client account. Use these approximate
            ranges as interview context — not guarantees. Fresher NLTH offers typically sit in the ₹3.5–6 LPA band;
            lateral hires with proven SQL and dashboard delivery command higher packages.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {WIPRO_DA_SALARY_TIERS.map((cell) => (
              <section key={cell.title} className={`ie-role-ba-salary-tier ie-role-ba-salary-tier--${cell.tier}`}>
                <p className="ie-role-ba-salary-tier__label">{cell.title}</p>
                <p className="ie-role-ba-salary-tier__range">{cell.range}</p>
                <p className="ie-role-ba-salary-tier__note">{cell.note}</p>
              </section>
            ))}
          </div>
        </section>

        <section id="wipro-da-questions" aria-label="Wipro Data Analyst interview questions">
          <QuestionsList
            questions={questions}
            heading={`${company.label} ${role.label} Interview Questions`}
            metaLabel={`Expanded expert answers · Reviewed ${WIPRO_DA_REVIEWED_DATE}`}
            expanded
          />
        </section>

        <section aria-labelledby="wipro-da-roadmap">
          <h2 id="wipro-da-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            30-Day Preparation Roadmap
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Follow the four-week plan below, then run full-loop mocks on{' '}
            <Link href="/signup" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              InterviewEra mock interviews
            </Link>
            . Week 4 should include combined technical + HR practice — matching Wipro&apos;s 2026 combined-round trend.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {WIPRO_DA_ROADMAP_WEEKS.map((week) => (
              <section key={week.week} className="rounded-xl border p-4" style={cardStyle}>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>{week.week}</p>
                <h3 className="mt-2 m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{week.focus}</h3>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {week.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-da-mistakes">
          <h2 id="wipro-da-mistakes" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Common Mistakes Candidates Make
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            These twelve mistakes eliminate otherwise strong candidates in Wipro DA loops. Review each before your
            NLTH attempt and technical panel — especially p-value misinterpretation and silent query writing.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {WIPRO_DA_MISTAKES.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="wipro-da-checklist">
          <h2 id="wipro-da-checklist" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Last-Minute Checklist
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Run through this checklist 24 hours before your NLTH or live panel. Every item maps to a real elimination
            reason observed in Wipro analytics hiring drives.
          </p>
          <ul className="mt-4 list-none space-y-2 p-0">
            {WIPRO_DA_CHECKLIST.map((item, idx) => (
              <li
                key={item}
                className="flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
              >
                <span className="shrink-0 font-bold tabular-nums" style={{ color: 'var(--accent-primary)' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="wipro-da-resources">
          <h2 id="wipro-da-resources" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Recommended Resources
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {WIPRO_DA_PREP_RESOURCE_LINKS.map((resource) => (
              <Link
                key={resource.href + resource.label}
                href={resource.href}
                className="rounded-xl border p-4 text-sm font-medium leading-snug transition-colors hover:border-(--accent-primary)"
                style={{ borderColor: 'var(--card-border)', color: 'var(--accent-primary)', background: 'color-mix(in srgb, var(--v3-accdim) 40%, var(--card-bg))' }}
              >
                {resource.label} →
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="wipro-da-vs-peers">
          <h2 id="wipro-da-vs-peers" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Wipro vs TCS vs Infosys — Data Analyst
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            All three service giants hire analytics profiles at similar difficulty for freshers — but entry assessments
            and HR round structure differ. Use this table when preparing for multiple employers simultaneously.
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table ie-role-ba-compare-table--5col">
              <caption className="sr-only">Wipro vs TCS vs Infosys Data Analyst interview comparison</caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Dimension</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--da">Wipro</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">TCS</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Infosys</th>
                </tr>
              </thead>
              <tbody>
                {WIPRO_DA_VS_PEER_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <th scope="row" className="ie-role-ba-compare-table__dim">{row[0]}</th>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row[1]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[2]}</td>
                    <td className="ie-role-ba-compare-table__cell">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="wipro-da-faq">
          <h2 id="wipro-da-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack ie-blog-faq-stack--accordion">
            {WIPRO_DA_FAQ_ITEMS.map((item) => (
              <details key={item.question} className="ie-blog-faq-item ie-blog-faq-item--accordion">
                <summary className="ie-blog-faq-item__question">{item.question}</summary>
                <p className="ie-blog-faq-item__answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          id="wipro-da-mock-cta"
          aria-labelledby="wipro-da-mock-cta-heading"
          className="mt-10 rounded-2xl border p-6 md:p-8"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--v3-accdim) 35%, var(--card-bg))',
          }}
        >
          <h2 id="wipro-da-mock-cta-heading" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Practice answering, not just reading
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Reading SQL tips is not the same as performing under panel pressure. Run a Wipro-style mock covering NLTH
            aptitude recall, live SQL narration, and HR follow-ups — with immediate AI feedback on structure and clarity.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--accent-primary)' }}
            >
              Start free mock interview
            </Link>
            <Link
              href="/tools/question-generator"
              className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            >
              Free question generator
            </Link>
          </div>
        </section>

        <section id="wipro-da-related" aria-labelledby="wipro-da-related-heading" className="mt-10">
          <h2 id="wipro-da-related-heading" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Related Interview Guides
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WIPRO_DA_CONTEXTUAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border p-4 text-sm font-medium leading-snug transition-colors hover:border-(--accent-primary)"
                style={{ borderColor: 'var(--card-border)', color: 'var(--accent-primary)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}
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
