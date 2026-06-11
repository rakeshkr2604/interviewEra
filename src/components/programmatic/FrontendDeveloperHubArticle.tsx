import Image from 'next/image'
import Link from 'next/link'
import { FrontendTopicImportanceChart } from '@/components/blog/visualizations/BlogDynamicCharts'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { FrontendDeveloperProcessVisual } from '@/components/programmatic/FrontendDeveloperProcessVisual'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import { questionsHubPath } from '@/lib/seo/programmatic'
import {
  FRONTEND_30_DAY_ROADMAP,
  FRONTEND_AUTHOR_NAME,
  FRONTEND_CONTEXTUAL_LINKS,
  FRONTEND_EDITORIAL_NOTE,
  FRONTEND_FAQ_ITEMS,
  FRONTEND_FRAMEWORK_COLUMNS,
  FRONTEND_FRAMEWORK_COMPARISON_ROWS,
  FRONTEND_HERO_ALT,
  FRONTEND_HERO_HEIGHT,
  FRONTEND_HERO_LEAD,
  FRONTEND_HERO_PATH,
  FRONTEND_HERO_WIDTH,
  FRONTEND_HIRING_STEPS,
  FRONTEND_LAST_UPDATED,
  FRONTEND_PROCESS_ALT,
  FRONTEND_READING_TIME,
  FRONTEND_REVIEWED_DATE,
  FRONTEND_REVIEWER_NAME,
  FRONTEND_ROADMAP_ALT,
  FRONTEND_ROADMAP_HEIGHT,
  FRONTEND_ROADMAP_PATH,
  FRONTEND_ROADMAP_WIDTH,
  FRONTEND_TOC_SECTIONS,
  FRONTEND_TOP_MISTAKES,
} from '@/lib/seo/programmatic/frontend-developer-hub'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function FrontendDeveloperHubArticle({
  role,
  questions,
}: {
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
            <span>{role.label}</span>
          </nav>

          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            {role.category} · {role.fresherFriendly ? 'Fresher-friendly' : 'Experienced'}
          </p>
          <h1 className="ie-blog-article-h1 ie-blog-article-h1--single">
            <span className="ie-blog-article-h1__line">{role.label}</span>{' '}
            <span className="ie-blog-article-h1__accent">Interview Questions India 2026</span>
          </h1>
          <div className="ie-blog-article-meta ie-role-ba-hero-badges mt-5 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {questions.length} curated questions
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              React · JavaScript · CSS
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {FRONTEND_READING_TIME}
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {FRONTEND_HERO_LEAD}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="#fe-questions"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Browse {questions.length} interview questions
            </Link>
            <Link
              href="/tools/question-generator/frontend-developer"
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate frontend questions free
            </Link>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={FRONTEND_HERO_PATH}
            alt={FRONTEND_HERO_ALT}
            width={FRONTEND_HERO_WIDTH}
            height={FRONTEND_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={FRONTEND_TOC_SECTIONS} />
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
              <dd className="m-0">{FRONTEND_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{FRONTEND_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{FRONTEND_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{FRONTEND_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{FRONTEND_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {FRONTEND_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="fe-hiring-process">
          <h2 id="fe-hiring-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frontend Developer Interview Process (2026)
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Most Frontend Developer loops in India — campus drives and product companies — follow the sequence below.
            Each stage filters a different signal: JavaScript depth, UI craft, architecture thinking, or communication.
            New to campus hiring? Start with our{' '}
            <Link href="/blog/how-to-prepare-for-placement-interviews" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              placement interview guide
            </Link>
            .
          </p>
          <div className="mt-4 space-y-4">
            {FRONTEND_HIRING_STEPS.map((item) => (
              <section key={item.step} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.step}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </section>
            ))}
          </div>

          <figure className="mt-6" aria-labelledby="fe-process-figcaption">
            <div
              className="mx-auto w-full overflow-hidden rounded-[20px] border"
              style={{
                borderColor: 'var(--card-border)',
                maxWidth: '900px',
                boxShadow: '0 14px 36px color-mix(in srgb, #000 12%, transparent)',
              }}
            >
              <FrontendDeveloperProcessVisual />
            </div>
            <figcaption id="fe-process-figcaption" className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {FRONTEND_PROCESS_ALT}
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Company-specific loops differ — compare{' '}
            <Link href="/interview-questions/companies/freshworks/frontend-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Freshworks Frontend interviews
            </Link>
            ,{' '}
            <Link href="/interview-questions/companies/tcs/frontend-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS Frontend interviews
            </Link>
            , and{' '}
            <Link href="/interview-questions/companies/zoho/frontend-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Zoho Frontend interviews
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="fe-roadmap-image">
          <h2 id="fe-roadmap-image" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frontend Developer Learning Roadmap
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Step-by-step path from HTML and CSS fundamentals to interview readiness. Do not skip JavaScript depth —
            React interviews still fail candidates on closures, async, and the event loop.
          </p>
          <figure className="mt-4" aria-labelledby="fe-roadmap-figcaption">
            <div
              className="mx-auto w-full overflow-hidden rounded-[20px] border"
              style={{
                borderColor: 'var(--card-border)',
                maxWidth: '900px',
                boxShadow: '0 14px 36px color-mix(in srgb, #000 12%, transparent)',
              }}
            >
              <Image
                src={FRONTEND_ROADMAP_PATH}
                alt={FRONTEND_ROADMAP_ALT}
                width={FRONTEND_ROADMAP_WIDTH}
                height={FRONTEND_ROADMAP_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption id="fe-roadmap-figcaption" className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {FRONTEND_ROADMAP_ALT}
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Drill fundamentals with our{' '}
            <Link href="/interview-questions/topics/javascript" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              JavaScript topic questions
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/topics/react" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              React topic questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="fe-topic-importance">
          <h2 id="fe-topic-importance" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Topic Importance for Frontend Developer Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Interview panels do not weight topics equally. The chart below is an{' '}
            <strong style={{ color: 'var(--text-primary)' }}>illustrative composite</strong> of product company and
            campus frontend rounds across India — use it to order revision, not to skip entire areas.
          </p>
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ ...cardStyle, minHeight: 360 }}
            role="img"
            aria-label="Bar chart of relative topic importance for Frontend Developer interviews"
          >
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Illustrative topic importance (technical + behavioral rounds)
            </p>
            <div className="mt-3 h-[320px] w-full">
              <FrontendTopicImportanceChart />
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Deep-dive by skill area:{' '}
            <Link href="/interview-questions/topics/html-css" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              HTML &amp; CSS
            </Link>
            ,{' '}
            <Link href="/interview-questions/topics/typescript" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TypeScript
            </Link>
            , and{' '}
            <Link href="/interview-questions/topics/react" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              React
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="fe-framework-comparison">
          <h2 id="fe-framework-comparison" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            React vs Angular vs Vue — Framework Comparison
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Indian frontend loops overwhelmingly favor{' '}
            <Link href="/interview-questions/topics/react" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              React
            </Link>
            , but enterprise employers still hire Angular specialists. Use this table to prioritize learning and to
            answer framework trade-off questions with context.
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table">
              <caption className="sr-only">
                Comparison of React, Angular, and Vue for Frontend Developer interviews in India
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Dimension</th>
                  {FRONTEND_FRAMEWORK_COLUMNS.map((col, index) => (
                    <th
                      key={col}
                      scope="col"
                      className={`ie-role-ba-compare-table__th ${
                        index === 0
                          ? 'ie-role-ba-compare-table__th--da'
                          : index === 1
                            ? 'ie-role-ba-compare-table__th--pm'
                            : 'ie-role-ba-compare-table__th--ba'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FRONTEND_FRAMEWORK_COMPARISON_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <th scope="row" className="ie-role-ba-compare-table__dim">{row[0]}</th>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row[1]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--pm">{row[2]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="fe-top-mistakes">
          <h2 id="fe-top-mistakes" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Common Frontend Interview Mistakes
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            These patterns cause rejections even when candidates know React syntax. Drill{' '}
            <Link href="/interview-questions/topics/javascript" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              JavaScript fundamentals
            </Link>{' '}
            in mock interviews before your first real loop.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FRONTEND_TOP_MISTAKES.map((item) => (
              <section key={item.mistake} className="rounded-xl border p-4" style={cardStyle}>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
                  Mistake
                </p>
                <h3 className="mt-1 m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.mistake}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Why it hurts: </strong>
                  {item.why}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>How to fix it: </strong>
                  {item.fix}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="fe-30-day-roadmap">
          <h2 id="fe-30-day-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            30-Day Frontend Preparation Plan
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            A focused four-week plan balanced across HTML/CSS, JavaScript/TypeScript, React, and performance plus mock
            interviews. Pair Week 2 with our{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA topic map
            </Link>{' '}
            and follow the{' '}
            <Link href="/blog/how-to-prepare-for-placement-interviews" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              placement guide
            </Link>{' '}
            for campus timelines.
          </p>
          <ol className="ie-fe-roadmap-grid mt-4 list-none p-0">
            {FRONTEND_30_DAY_ROADMAP.map((block, index) => (
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
                  <ul className="ie-fe-roadmap-week__list mt-3 list-none p-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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

        <section
          id="fe-mock-interview-cta"
          aria-labelledby="fe-mock-interview-cta-heading"
          className="mt-8 rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))',
          }}
        >
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>
            Practice beats passive reading
          </p>
          <h2
            id="fe-mock-interview-cta-heading"
            className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Run a full Frontend Developer mock interview — scored in 5 dimensions
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Upload your resume and practice real frontend questions with AI-generated follow-ups. Get rubric-based
            feedback on communication clarity, technical depth, answer structure, confidence, and relevance — the same
            signals Indian panels evaluate.
          </p>
          <ul className="mt-4 max-w-2xl list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Resume-aware React, JavaScript, and behavioral questions</li>
            <li>Timed answers with filler-word analysis on voice mode</li>
            <li>Free credits to start — no card required</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free frontend mock interview
            </Link>
            <Link
              href="/tools/question-generator/frontend-developer"
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate practice questions
            </Link>
            <Link
              href="/blog/overcome-interview-anxiety-mock-interviews"
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Mock interview tips
            </Link>
          </div>
        </section>

        <section aria-labelledby="fe-contextual-links">
          <h2 id="fe-contextual-links" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Related Interview Preparation Guides
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Cross-train with role, topic, company, and blog guides — including{' '}
            <Link href="/interview-questions/topics/react" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              React questions
            </Link>
            ,{' '}
            <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Software Engineer hub
            </Link>
            ,{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA topic map
            </Link>
            , and the{' '}
            <Link href="/blog/how-to-prepare-for-placement-interviews" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              placement guide
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRONTEND_CONTEXTUAL_LINKS.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="rounded-xl border p-4 text-sm font-medium leading-snug transition-colors hover:border-(--accent-primary)"
                style={{ borderColor: 'var(--card-border)', color: 'var(--accent-primary)', background: 'color-mix(in srgb, var(--v3-accdim) 40%, var(--card-bg))' }}
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </section>

        <QuestionsList
          sectionId="fe-questions"
          headingId="fe-questions"
          questions={questions}
          heading={`${role.pluralLabel} Interview Questions`}
          metaLabel={`${questions.length} curated · React & JavaScript · Updated 2026`}
          expanded
        />

        <section aria-labelledby="fe-faq">
          <h2 id="fe-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {FRONTEND_FAQ_ITEMS.map((item) => (
              <section key={item.question} className="ie-blog-faq-item">
                <h3 className="ie-blog-faq-item__question">{item.question}</h3>
                <p className="ie-blog-faq-item__answer">{item.answer}</p>
              </section>
            ))}
          </div>
        </section>
      </div>
    </article>
  )
}
