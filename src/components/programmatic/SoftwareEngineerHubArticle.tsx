import Image from 'next/image'
import Link from 'next/link'
import { SweTopicImportanceChart } from '@/components/blog/visualizations/BlogDynamicCharts'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import { SoftwareEngineerHeroVisual } from '@/components/programmatic/SoftwareEngineerHeroVisual'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import { questionsHubPath } from '@/lib/seo/programmatic'
import {
  SOFTWARE_ENGINEER_30_DAY_ROADMAP,
  SOFTWARE_ENGINEER_AUTHOR_NAME,
  SOFTWARE_ENGINEER_COMPANY_COLUMNS,
  SOFTWARE_ENGINEER_COMPANY_COMPARISON_ROWS,
  SOFTWARE_ENGINEER_CONTEXTUAL_LINKS,
  SOFTWARE_ENGINEER_EDITORIAL_NOTE,
  SOFTWARE_ENGINEER_FAQ_ITEMS,
  SOFTWARE_ENGINEER_HERO_LEAD,
  SOFTWARE_ENGINEER_HIRING_STEPS,
  SOFTWARE_ENGINEER_LAST_UPDATED,
  SOFTWARE_ENGINEER_PROCESS_ALT,
  SOFTWARE_ENGINEER_PROCESS_HEIGHT,
  SOFTWARE_ENGINEER_PROCESS_PATH,
  SOFTWARE_ENGINEER_PROCESS_WIDTH,
  SOFTWARE_ENGINEER_READING_TIME,
  SOFTWARE_ENGINEER_REVIEWED_DATE,
  SOFTWARE_ENGINEER_REVIEWER_NAME,
  SOFTWARE_ENGINEER_ROADMAP_ALT,
  SOFTWARE_ENGINEER_ROADMAP_HEIGHT,
  SOFTWARE_ENGINEER_ROADMAP_PATH,
  SOFTWARE_ENGINEER_ROADMAP_WIDTH,
  SOFTWARE_ENGINEER_TOC_SECTIONS,
  SOFTWARE_ENGINEER_TOP_MISTAKES,
} from '@/lib/seo/programmatic/software-engineer-hub'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function SoftwareEngineerHubArticle({
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
              DSA · System Design · OOPs
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {SOFTWARE_ENGINEER_READING_TIME}
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {SOFTWARE_ENGINEER_HERO_LEAD}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="#swe-questions"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Browse {questions.length} interview questions
            </Link>
            <Link
              href="/tools/question-generator/software-engineer"
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate SWE questions free
            </Link>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <SoftwareEngineerHeroVisual />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={SOFTWARE_ENGINEER_TOC_SECTIONS} />
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
              <dd className="m-0">{SOFTWARE_ENGINEER_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{SOFTWARE_ENGINEER_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{SOFTWARE_ENGINEER_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{SOFTWARE_ENGINEER_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{SOFTWARE_ENGINEER_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {SOFTWARE_ENGINEER_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="swe-hiring-process">
          <h2 id="swe-hiring-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Software Engineer Interview Process (2026)
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Most Software Engineer loops in India — campus drives and product companies — follow the sequence below.
            Each stage filters a different signal: aptitude, coding depth, design thinking, or communication.
          </p>
          <div className="mt-4 space-y-4">
            {SOFTWARE_ENGINEER_HIRING_STEPS.map((item) => (
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
                src={SOFTWARE_ENGINEER_PROCESS_PATH}
                alt={SOFTWARE_ENGINEER_PROCESS_ALT}
                width={SOFTWARE_ENGINEER_PROCESS_WIDTH}
                height={SOFTWARE_ENGINEER_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Software Engineer interview process — Application through Online Assessment, technical rounds, system
              design, behavioral/HR, and offer.
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Company-specific loops differ — compare{' '}
            <Link href="/interview-questions/companies/amazon/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Amazon SDE interviews
            </Link>
            ,{' '}
            <Link href="/interview-questions/companies/microsoft/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Microsoft SDE interviews
            </Link>
            , and{' '}
            <Link href="/interview-questions/companies/infosys/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys SWE interviews
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="swe-roadmap-image">
          <h2 id="swe-roadmap-image" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Software Engineer Preparation Roadmap
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Step-by-step learning path from programming basics to interview readiness. Do not skip fundamentals —
            panels test OOPs, DBMS, and OS even when the job title says “full stack” or “backend.”
          </p>
          <figure className="mt-4">
            <div
              className="mx-auto w-full overflow-hidden rounded-[20px] border"
              style={{
                borderColor: 'var(--card-border)',
                maxWidth: '900px',
                boxShadow: '0 14px 36px color-mix(in srgb, #000 12%, transparent)',
              }}
            >
              <Image
                src={SOFTWARE_ENGINEER_ROADMAP_PATH}
                alt={SOFTWARE_ENGINEER_ROADMAP_ALT}
                width={SOFTWARE_ENGINEER_ROADMAP_WIDTH}
                height={SOFTWARE_ENGINEER_ROADMAP_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Software Engineer preparation roadmap — Programming basics through DSA, OOPs, system design, DBMS, OS,
              behavioral prep, and mock interviews.
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Drill DSA patterns with our{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA interview hub
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/topics/algorithms" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              algorithms topic questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="swe-topic-importance">
          <h2 id="swe-topic-importance" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Topic Importance for Software Engineer Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Interview panels do not weight topics equally. The chart below is an{' '}
            <strong style={{ color: 'var(--text-primary)' }}>illustrative composite</strong> of campus OAs, service-company
            drives, and product company technical rounds across India — use it to order revision, not to skip entire areas.
          </p>
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ ...cardStyle, minHeight: 360 }}
            role="img"
            aria-label="Bar chart of relative topic importance for Software Engineer interviews"
          >
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Illustrative topic importance (technical + behavioral rounds)
            </p>
            <div className="mt-3 h-[320px] w-full">
              <SweTopicImportanceChart />
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Deep-dive by skill area:{' '}
            <Link href="/interview-questions/topics/data-structures" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              data structures
            </Link>
            ,{' '}
            <Link href="/interview-questions/topics/system-design" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              system design
            </Link>
            ,{' '}
            <Link href="/interview-questions/topics/oops" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              OOPs
            </Link>
            , and{' '}
            <Link href="/interview-questions/topics/operating-systems" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              operating systems
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="swe-company-comparison">
          <h2 id="swe-company-comparison" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Company Comparison — Product vs Service SWE Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Big Tech and campus mass recruiters share the SWE title but not the same bar. Use this table to prioritize
            prep time before you commit to a single study plan.
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table ie-role-ba-compare-table--5col">
              <caption className="sr-only">
                Comparison of Google, Microsoft, Amazon, and TCS Software Engineer interview patterns in India
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Dimension</th>
                  {SOFTWARE_ENGINEER_COMPANY_COLUMNS.map((col, index) => (
                    <th
                      key={col}
                      scope="col"
                      className={`ie-role-ba-compare-table__th ${
                        index === 0
                          ? 'ie-role-ba-compare-table__th--da'
                          : index === 1
                            ? 'ie-role-ba-compare-table__th--pm'
                            : index === 2
                              ? 'ie-role-ba-compare-table__th--ba'
                              : 'ie-role-ba-compare-table__th--pm'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SOFTWARE_ENGINEER_COMPANY_COMPARISON_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <th scope="row" className="ie-role-ba-compare-table__dim">{row[0]}</th>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row[1]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--pm">{row[2]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[3]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--pm">{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="swe-top-mistakes">
          <h2 id="swe-top-mistakes" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Top Mistakes Software Engineer Candidates Make
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            These patterns cause rejections even when candidates know the right answers on paper. Fix them in mock
            interviews before your first real loop.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SOFTWARE_ENGINEER_TOP_MISTAKES.map((item) => (
              <section key={item.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Fix:</strong> {item.fix}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="swe-30-day-roadmap">
          <h2 id="swe-30-day-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            30-Day Software Engineer Preparation Roadmap
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            A focused four-week plan plus final polish days — balanced across DSA, fundamentals, system design, and
            behavioral prep for typical India hiring loops.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SOFTWARE_ENGINEER_30_DAY_ROADMAP.map((block) => (
              <section key={block.week} className="rounded-xl border p-4" style={cardStyle}>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>{block.week}</p>
                <h3 className="mt-2 m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{block.focus}</h3>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section
          id="swe-mock-interview-cta"
          aria-labelledby="swe-mock-interview-cta-heading"
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
            id="swe-mock-interview-cta-heading"
            className="mt-2 text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Run a full Software Engineer mock interview — scored in 5 dimensions
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Upload your resume and practice real SWE questions with AI-generated follow-ups. Get rubric-based feedback on
            communication clarity, technical depth, answer structure, confidence, and relevance — the same signals
            Indian panels evaluate.
          </p>
          <ul className="mt-4 max-w-2xl list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Resume-aware technical + behavioral questions</li>
            <li>Timed answers with filler-word analysis on voice mode</li>
            <li>Free credits to start — no card required</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free SWE mock interview
            </Link>
            <Link
              href="/tools/question-generator/software-engineer"
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

        <section aria-labelledby="swe-contextual-links">
          <h2 id="swe-contextual-links" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Related Interview Preparation Guides
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Cross-train with role, topic, company, and blog guides — including{' '}
            <Link href="/interview-questions/android-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Android Developer
            </Link>
            ,{' '}
            <Link href="/interview-questions/java-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Java Developer
            </Link>
            , and company SWE hubs linked below.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOFTWARE_ENGINEER_CONTEXTUAL_LINKS.map((link) => (
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
          sectionId="swe-questions"
          headingId="swe-questions"
          questions={questions}
          heading={`${role.pluralLabel} Interview Questions`}
          metaLabel={`${questions.length} curated · DSA & CS fundamentals · Updated 2026`}
          expanded
        />

        <section aria-labelledby="swe-faq">
          <h2 id="swe-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {SOFTWARE_ENGINEER_FAQ_ITEMS.map((item) => (
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
