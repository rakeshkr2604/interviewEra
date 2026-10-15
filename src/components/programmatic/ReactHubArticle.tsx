import Image from 'next/image'
import Link from 'next/link'
import { ReactTopicImportanceChart } from '@/components/blog/visualizations/BlogDynamicCharts'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import { questionsHubPath } from '@/lib/seo/programmatic'
import type { Skill } from '@/lib/seo/programmatic/skills'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import {
  REACT_30_DAY_ROADMAP,
  REACT_ARCHITECTURE_ALT,
  REACT_ARCHITECTURE_HEIGHT,
  REACT_ARCHITECTURE_PATH,
  REACT_ARCHITECTURE_WIDTH,
  REACT_AUTHOR_NAME,
  REACT_CONTEXTUAL_LINKS,
  REACT_EDITORIAL_NOTE,
  REACT_FAQ_ITEMS,
  REACT_FRAMEWORK_COLUMNS,
  REACT_FRAMEWORK_COMPARISON_ROWS,
  REACT_HERO_ALT,
  REACT_HERO_HEADLINE,
  REACT_HERO_HEIGHT,
  REACT_HERO_LEAD,
  REACT_HERO_PATH,
  REACT_HERO_SUBHEADLINE,
  REACT_HERO_WIDTH,
  REACT_LAST_UPDATED,
  REACT_READING_TIME,
  REACT_REVIEWED_DATE,
  REACT_REVIEWER_NAME,
  REACT_ROADMAP_ALT,
  REACT_ROADMAP_HEIGHT,
  REACT_ROADMAP_PATH,
  REACT_ROADMAP_SECTION_LEAD,
  REACT_ROADMAP_SECTION_TITLE,
  REACT_ROADMAP_WIDTH,
  REACT_ARCHITECTURE_SECTION_LEAD,
  REACT_ARCHITECTURE_SECTION_TITLE,
  REACT_TOC_SECTIONS,
  REACT_TOP_MISTAKES,
} from '@/lib/seo/programmatic/react-hub'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function ReactHubArticle({
  skill,
  questions,
}: {
  skill: Skill
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
            <Link href={`${questionsHubPath()}#topics`} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              Topics
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{skill.label}</span>
          </nav>

          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            Frontend · {skill.fresherRelevant ? 'Fresher-relevant' : 'Experienced'}
          </p>
          <h1 className="ie-blog-article-h1 ie-blog-article-h1--single">
            <span className="ie-blog-article-h1__line">{REACT_HERO_HEADLINE}</span>
          </h1>
          <p
            className="mt-3 text-sm font-semibold tracking-wide sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            {REACT_HERO_SUBHEADLINE}
          </p>
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
              Hooks · Context · Performance
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {REACT_READING_TIME}
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {REACT_HERO_LEAD}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="#react-questions"
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
              Generate React questions free
            </Link>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={REACT_HERO_PATH}
            alt={REACT_HERO_ALT}
            width={REACT_HERO_WIDTH}
            height={REACT_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={REACT_TOC_SECTIONS} />
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
              <dd className="m-0">{REACT_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{REACT_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{REACT_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{REACT_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{REACT_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {REACT_EDITORIAL_NOTE}
          </p>
        </aside>

        <QuestionsList
          sectionId="react-questions"
          headingId="react-questions"
          questions={questions}
          heading={`${skill.label} Interview Questions`}
          metaLabel={`${questions.length} curated · Hooks & state · Updated 2026`}
          expanded
        />

        <section aria-labelledby="react-roadmap">
          <h2 id="react-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            {REACT_ROADMAP_SECTION_TITLE}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {REACT_ROADMAP_SECTION_LEAD}
          </p>
          <figure className="mt-4" aria-labelledby="react-roadmap-figcaption">
            <div
              className="mx-auto w-full overflow-hidden rounded-[20px] border"
              style={{
                borderColor: 'var(--card-border)',
                maxWidth: '900px',
                boxShadow: '0 14px 36px color-mix(in srgb, #000 12%, transparent)',
              }}
            >
              <Image
                src={REACT_ROADMAP_PATH}
                alt={REACT_ROADMAP_ALT}
                width={REACT_ROADMAP_WIDTH}
                height={REACT_ROADMAP_HEIGHT}
                quality={95}
                unoptimized
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption id="react-roadmap-figcaption" className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {REACT_ROADMAP_ALT}
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Pair with our{' '}
            <Link href="/interview-questions/topics/javascript" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              JavaScript topic questions
            </Link>{' '}
            and the{' '}
            <Link href="/interview-questions/frontend-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Frontend Developer hub
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="react-architecture">
          <h2 id="react-architecture" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            {REACT_ARCHITECTURE_SECTION_TITLE}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {REACT_ARCHITECTURE_SECTION_LEAD}
          </p>
          <figure className="mt-4" aria-labelledby="react-architecture-figcaption">
            <div
              className="mx-auto w-full overflow-hidden rounded-[20px] border"
              style={{
                borderColor: 'var(--card-border)',
                maxWidth: '900px',
                boxShadow: '0 14px 36px color-mix(in srgb, #000 12%, transparent)',
              }}
            >
              <Image
                src={REACT_ARCHITECTURE_PATH}
                alt={REACT_ARCHITECTURE_ALT}
                width={REACT_ARCHITECTURE_WIDTH}
                height={REACT_ARCHITECTURE_HEIGHT}
                quality={95}
                unoptimized
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption id="react-architecture-figcaption" className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {REACT_ARCHITECTURE_ALT}
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            See also{' '}
            <Link href="/interview-questions/topics/rest-api" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              REST API questions
            </Link>{' '}
            for networking depth in full-stack React roles.
          </p>
        </section>

        <section aria-labelledby="react-topic-importance">
          <h2 id="react-topic-importance" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Topic Importance for React Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Interview panels do not weight React topics equally. The chart below is an{' '}
            <strong style={{ color: 'var(--text-primary)' }}>illustrative composite</strong> of product company and
            campus frontend rounds across India — use it to order revision.
          </p>
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ ...cardStyle, minHeight: 360 }}
            role="img"
            aria-label="Bar chart of relative topic importance for React.js interviews"
          >
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Illustrative topic importance (technical rounds)
            </p>
            <div className="mt-3 h-[320px] w-full">
              <ReactTopicImportanceChart />
            </div>
          </div>
        </section>

        <section aria-labelledby="react-framework-comparison">
          <h2 id="react-framework-comparison" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            React vs Angular vs Vue
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Indian frontend loops overwhelmingly favor React, but enterprise employers still hire Angular specialists.
            Use this table to prioritize learning and answer framework trade-off questions with context.
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table">
              <caption className="sr-only">
                Comparison of React, Angular, and Vue for React.js interviews in India
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Dimension</th>
                  {REACT_FRAMEWORK_COLUMNS.map((col, index) => (
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
                {REACT_FRAMEWORK_COMPARISON_ROWS.map((row) => (
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

        <section aria-labelledby="react-mistakes">
          <h2 id="react-mistakes" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Common React Interview Mistakes
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            These patterns cause rejections even when candidates know hook syntax. Drill{' '}
            <Link href="/interview-questions/topics/javascript" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              JavaScript fundamentals
            </Link>{' '}
            alongside React prep.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {REACT_TOP_MISTAKES.map((item) => (
              <section key={item.mistake} className="rounded-xl border p-4" style={cardStyle}>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
                  Mistake
                </p>
                <h3 className="mt-1 m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.mistake}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Impact: </strong>
                  {item.impact}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Fix: </strong>
                  {item.fix}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="react-30-day-plan">
          <h2 id="react-30-day-plan" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            30-Day React Preparation Plan
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            A focused four-week plan from fundamentals through mocks. Follow the{' '}
            <Link href="/blog/how-to-prepare-for-placement-interviews" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              placement guide
            </Link>{' '}
            for campus timelines.
          </p>
          <ol className="ie-fe-roadmap-grid mt-4 list-none p-0">
            {REACT_30_DAY_ROADMAP.map((block, index) => (
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

        <section aria-labelledby="react-faq">
          <h2 id="react-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {REACT_FAQ_ITEMS.map((item) => (
              <section key={item.question} className="ie-blog-faq-item">
                <h3 className="ie-blog-faq-item__question">{item.question}</h3>
                <p className="ie-blog-faq-item__answer">{item.answer}</p>
              </section>
            ))}
          </div>
        </section>

        <section
          id="react-mock-interview-cta"
          aria-labelledby="react-mock-interview-cta-heading"
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
            id="react-mock-interview-cta-heading"
            className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Run a full React mock interview — scored in 5 dimensions
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Upload your resume and practice real React questions with AI-generated follow-ups. Get rubric-based feedback
            on communication clarity, technical depth, answer structure, confidence, and relevance.
          </p>
          <ul className="mt-4 max-w-2xl list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Resume-aware hooks, state management, and behavioral questions</li>
            <li>Timed answers with filler-word analysis on voice mode</li>
            <li>Free credits to start — no card required</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free React mock interview
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

        <section aria-labelledby="react-contextual-links">
          <h2 id="react-contextual-links" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Related Interview Preparation Guides
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REACT_CONTEXTUAL_LINKS.map((link) => (
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
      </div>
    </article>
  )
}
