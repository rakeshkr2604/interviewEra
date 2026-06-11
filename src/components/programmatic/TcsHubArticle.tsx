import Link from 'next/link'
import { TcsTopicImportanceChart } from '@/components/blog/visualizations/BlogDynamicCharts'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import { TcsHeroVisual } from '@/components/programmatic/TcsHeroVisual'
import { TcsHiringProcessVisual } from '@/components/programmatic/TcsHiringProcessVisual'
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
  TCS_30_DAY_ROADMAP,
  TCS_AUTHOR_NAME,
  TCS_CONTEXTUAL_LINKS_COMPANY,
  TCS_CONTEXTUAL_LINKS_OTHER,
  TCS_DIGITAL_PRIME_COLUMNS,
  TCS_DIGITAL_PRIME_ROWS,
  TCS_PACKAGE_COMPARISON_COLUMNS,
  TCS_PACKAGE_COMPARISON_INTRO,
  TCS_PACKAGE_COMPARISON_ROWS,
  TCS_EDITORIAL_NOTE,
  TCS_FAQ_ITEMS,
  TCS_HERO_LEAD,
  TCS_HIRING_STEPS,
  TCS_NQT_PATTERN_DISCLAIMER,
  TCS_NQT_PATTERN_ROW_ACCENTS,
  TCS_NQT_PATTERN_TABLE_COLUMNS,
  TCS_NQT_PATTERN_TABLE_ROWS,
  TCS_PACKAGE_COMPARISON_ROW_ACCENTS,
  TCS_PACKAGE_TRACKS_COLUMNS,
  TCS_PACKAGE_TRACKS_NOTES,
  TCS_PACKAGE_TRACKS_ROW_ACCENTS,
  TCS_PACKAGE_TRACKS_ROWS,
  TCS_TABLE_ACCENTS_2COL,
  TCS_TABLE_ACCENTS_3COL,
  TCS_TABLE_ACCENTS_4COL,
  TCS_SCORE_TARGETS,
  TCS_SCORE_TARGETS_DISCLAIMER,
  TCS_LAST_UPDATED,
  TCS_NQT_SECTIONS,
  TCS_PROCESS_ALT,
  TCS_READING_TIME,
  TCS_REVIEWED_DATE,
  TCS_REVIEWER_NAME,
  TCS_TOC_SECTIONS,
  TCS_TOP_MISTAKES,
} from '@/lib/seo/programmatic/tcs-hub'

const cardStyle = COMPANY_HUB_CARD_STYLE
const H2_CLASS = COMPANY_HUB_SECTION_H2_CLASS
const H3_CLASS = COMPANY_HUB_SECTION_H3_CLASS

export function TcsHubArticle({
  company,
  questions,
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
            <span className="ie-blog-article-h1__line">{company.label}</span>{' '}
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
              NQT · Aptitude · CS Fundamentals
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {company.avgPackageRange}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {TCS_READING_TIME}
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            {TCS_HERO_LEAD}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="#tcs-questions"
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Browse {questions.length} interview questions
            </Link>
            <Link
              href="/tools/question-generator/companies/tcs"
              className={`inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary) ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Generate TCS questions free
            </Link>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <TcsHeroVisual />
        </div>

        <div className={`${COMPANY_HUB_CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={TCS_TOC_SECTIONS} />
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
              <dd className="m-0">{TCS_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{TCS_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{TCS_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{TCS_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{TCS_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {TCS_EDITORIAL_NOTE}
          </p>
        </aside>

        <QuestionsList
          sectionId="tcs-questions"
          headingId="tcs-questions"
          questions={questions}
          heading={`${company.label} Interview Questions`}
          metaLabel={`${questions.length} curated · NQT & CS fundamentals · Updated 2026`}
          expanded
        />

        <section aria-labelledby="tcs-hiring-process">
          <h2 id="tcs-hiring-process" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            TCS Hiring Process (2026)
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            TCS campus and off-campus drives follow a predictable pipeline — NQT filters the majority before technical
            depth is tested. Pair this guide with our{' '}
            <Link href="/blog/how-to-prepare-for-placement-interviews" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              placement interview guide
            </Link>
            .
          </p>
          <div className="mt-4 space-y-4">
            {TCS_HIRING_STEPS.map((item) => (
              <section key={item.step} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.step}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </section>
            ))}
          </div>

          <figure className="mt-6" aria-labelledby="tcs-process-figcaption">
            <div
              className="mx-auto w-full max-w-[900px] overflow-hidden rounded-xl border"
              style={{
                borderColor: 'var(--card-border)',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              <TcsHiringProcessVisual />
            </div>
            <figcaption id="tcs-process-figcaption" className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {TCS_PROCESS_ALT}
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Role-specific loops:{' '}
            <Link href="/interview-questions/companies/tcs/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS Software Engineer
            </Link>
            ,{' '}
            <Link href="/interview-questions/companies/tcs/java-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS Java Developer
            </Link>
            , and{' '}
            <Link href="/interview-questions/companies/infosys" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys interviews
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="tcs-nqt-pattern">
          <h2 id="tcs-nqt-pattern" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            TCS NQT Pattern Breakdown
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The National Qualifier Test is the highest-leverage stage — most eliminations happen here. Each section tests a
            different skill; balance prep across all five, not coding alone.
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="TCS NQT section breakdown with focus areas"
              columns={TCS_NQT_PATTERN_TABLE_COLUMNS}
              rows={TCS_NQT_PATTERN_TABLE_ROWS}
              columnAccents={TCS_TABLE_ACCENTS_2COL}
              rowAccents={TCS_NQT_PATTERN_ROW_ACCENTS}
            />
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>
            {TCS_NQT_PATTERN_DISCLAIMER}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {TCS_NQT_SECTIONS.map((item) => (
              <section key={item.section} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.section}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Prep tip: </strong>
                  {item.prep}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="tcs-topic-importance">
          <h2 id="tcs-topic-importance" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Topic Importance for TCS Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Illustrative composite of NQT and technical round weighting across campus drives — use our{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA topic map
            </Link>{' '}
            for coding depth after aptitude is secure.
          </p>
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ ...cardStyle, minHeight: 360 }}
            role="img"
            aria-label="Bar chart of relative topic importance for TCS interviews"
          >
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Illustrative topic importance (NQT + technical + HR)
            </p>
            <div className="mt-3 h-[320px] w-full">
              <TcsTopicImportanceChart />
            </div>
          </div>
        </section>

        <section aria-labelledby="tcs-package-tracks">
          <h2 id="tcs-package-tracks" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            TCS Prime vs Digital vs Ninja
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            TCS shortlists candidates into three fresher bands after NQT. Your percentile, coding score, and interview depth
            determine which track you qualify for.
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Comparison of TCS Ninja, Digital, and Prime fresher tracks"
              columns={TCS_PACKAGE_TRACKS_COLUMNS}
              rows={TCS_PACKAGE_TRACKS_ROWS}
              columnAccents={TCS_TABLE_ACCENTS_4COL}
              rowAccents={TCS_PACKAGE_TRACKS_ROW_ACCENTS}
            />
          </div>
          <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {TCS_PACKAGE_TRACKS_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tcs-digital-vs-prime">
          <h2 id="tcs-digital-vs-prime" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            TCS Digital vs Prime Comparison
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Your NQT percentile and coding performance determine track eligibility. Target Prime only if you consistently
            solve medium array/string problems under timed conditions.
          </p>

          <h3 className={`mt-6 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Package Comparison
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {TCS_PACKAGE_COMPARISON_INTRO}
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="TCS Digital vs Prime package comparison for undergraduate and postgraduate hires in India"
              columns={TCS_PACKAGE_COMPARISON_COLUMNS}
              rows={TCS_PACKAGE_COMPARISON_ROWS}
              columnAccents={TCS_TABLE_ACCENTS_4COL}
              rowAccents={TCS_PACKAGE_COMPARISON_ROW_ACCENTS}
            />
          </div>

          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Track Comparison
          </h3>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Comparison of TCS Digital and TCS Prime fresher tracks in India"
              columns={['Dimension', ...TCS_DIGITAL_PRIME_COLUMNS]}
              rows={TCS_DIGITAL_PRIME_ROWS}
              columnAccents={TCS_TABLE_ACCENTS_3COL}
            />
          </div>
        </section>

        <section aria-labelledby="tcs-score-targets">
          <h2 id="tcs-score-targets" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            What Score Is Needed To Crack TCS?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Use these as prep benchmarks across NQT and interview rounds — not as guaranteed cutoffs.
          </p>
          <div className="ie-tcs-score-targets mt-4 grid gap-4 sm:grid-cols-2">
            {TCS_SCORE_TARGETS.map((item) => (
              <section key={item.area} className="ie-tcs-score-target rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.area}
                </h3>
                <p className="mt-2 m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-primary)' }}>
                  Target
                </p>
                <p className="mt-1 m-0 text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {item.target}
                </p>
                <p className="mt-2 m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.detail}
                </p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>
            {TCS_SCORE_TARGETS_DISCLAIMER}
          </p>
        </section>

        <section aria-labelledby="tcs-30-day-roadmap">
          <h2 id="tcs-30-day-roadmap" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            30-Day TCS Preparation Plan
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Four-week campus prep plan — aptitude first, then programming logic, CS fundamentals, and full mocks.
          </p>
          <ol className="ie-fe-roadmap-grid mt-4 list-none p-0">
            {TCS_30_DAY_ROADMAP.map((block, index) => (
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

        <section aria-labelledby="tcs-top-mistakes">
          <h2 id="tcs-top-mistakes" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Common TCS Interview Mistakes
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            These patterns cause rejections even when candidates know individual topics. Fix them before your NQT slot.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {TCS_TOP_MISTAKES.map((item) => (
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

        <section aria-labelledby="tcs-faq">
          <h2 id="tcs-faq" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack ie-blog-faq-stack--accordion">
            {TCS_FAQ_ITEMS.map((item) => (
              <details key={item.question} className="ie-blog-faq-item ie-blog-faq-item--accordion">
                <summary className="ie-blog-faq-item__question">{item.question}</summary>
                <p className="ie-blog-faq-item__answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          id="tcs-mock-interview-cta"
          aria-labelledby="tcs-mock-interview-cta-heading"
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
            id="tcs-mock-interview-cta-heading"
            className={`mt-2 ${H2_CLASS}`}
            style={{ color: 'var(--text-primary)' }}
          >
            Run a full TCS mock interview — scored in 5 dimensions
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Practice aptitude-style reasoning, technical CS fundamentals, and HR STAR answers with AI-generated follow-ups.
            Get rubric-based feedback on communication, technical depth, structure, confidence, and relevance.
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
              Start free TCS mock interview
            </Link>
            <Link
              href="/tools/question-generator/companies/tcs"
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

        <section aria-labelledby="tcs-contextual-links">
          <h2 id="tcs-contextual-links" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Related Interview Preparation Guides
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TCS_CONTEXTUAL_LINKS_COMPANY.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="ie-company-hub-related-link rounded-xl border p-4 text-sm font-medium leading-snug transition-colors hover:border-(--accent-primary)"
                style={{ borderColor: 'var(--card-border)', color: 'var(--accent-primary)', background: 'color-mix(in srgb, var(--v3-accdim) 40%, var(--card-bg))' }}
              >
                {link.label} →
              </Link>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TCS_CONTEXTUAL_LINKS_OTHER.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="ie-company-hub-related-link rounded-xl border p-4 text-sm font-medium leading-snug transition-colors hover:border-(--accent-primary)"
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
