import Link from 'next/link'
import { TcsTopicImportanceChart } from '@/components/blog/visualizations/BlogDynamicCharts'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import { TcsHeroVisual } from '@/components/programmatic/TcsHeroVisual'
import { TcsHiringProcessVisual } from '@/components/programmatic/TcsHiringProcessVisual'
import {
  TcsApplyStepsVisual,
  TcsEligibilityChecklistVisual,
  TcsFourStageProcessVisual,
  TcsIntakeComparisonVisual,
  TcsNqtFlowVisual,
  TcsResumeBeforeAfterVisual,
  TcsRoadmapInfographicVisual,
  TcsSalaryBarVisual,
  TcsTechHrSplitVisual,
  TcsTrackPyramidVisual,
} from '@/components/programmatic/TcsGuideVisuals'
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
  TCS_APPLY_ROUTES,
  TCS_APPLY_STEPS,
  TCS_AUTHOR_NAME,
  TCS_CONTEXTUAL_LINKS_COMPANY,
  TCS_CONTEXTUAL_LINKS_OTHER,
  TCS_DIGITAL_PRIME_COLUMNS,
  TCS_DIGITAL_PRIME_ROWS,
  TCS_ELIGIBILITY_COLUMNS,
  TCS_ELIGIBILITY_DOCUMENTS,
  TCS_ELIGIBILITY_MISTAKES,
  TCS_ELIGIBILITY_ROWS,
  TCS_PACKAGE_COMPARISON_COLUMNS,
  TCS_PACKAGE_COMPARISON_INTRO,
  TCS_PACKAGE_COMPARISON_ROWS,
  TCS_EDITORIAL_NOTE,
  TCS_FAQ_ITEMS,
  TCS_HERO_LEAD,
  TCS_HIRING_STEPS,
  TCS_LATEST_UPDATES,
  TCS_LATEST_UPDATES_TABLE_COLUMNS,
  TCS_LATEST_UPDATES_TABLE_ROWS,
  TCS_NQT_PATTERN_DISCLAIMER,
  TCS_NQT_PATTERN_ROW_ACCENTS,
  TCS_NQT_PATTERN_TABLE_COLUMNS,
  TCS_NQT_PATTERN_TABLE_ROWS,
  TCS_PACKAGE_COMPARISON_ROW_ACCENTS,
  TCS_PACKAGE_TRACKS_COLUMNS,
  TCS_PACKAGE_TRACKS_NOTES,
  TCS_PACKAGE_TRACKS_ROW_ACCENTS,
  TCS_PACKAGE_TRACKS_ROWS,
  TCS_RESUME_BEFORE_AFTER,
  TCS_RESUME_LOOK_FOR,
  TCS_RESUME_MISTAKES,
  TCS_SALARY_NOTES,
  TCS_TABLE_ACCENTS_2COL,
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
  TCS_TRACK_TARGETING,
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
            <span className="ie-blog-article-h1__accent">Interview Questions & Hiring Guide 2026</span>
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
              NQT · Eligibility · Salary
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {company.avgPackageRange}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated Jul 2026 · {TCS_READING_TIME}
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
            <Link
              href="/signup"
              className={`inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary) ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              AI mock interview
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
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Wherever TCS has not published a fixed official figure — especially Ninja CTC — this guide says so plainly
            rather than presenting a placement-forum estimate as confirmed fact.
          </p>
        </aside>

        <section aria-labelledby="tcs-latest-updates" className="mt-10">
          <h2 id="tcs-latest-updates" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Latest TCS Hiring Updates (2026)
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Intake shape, AI-skilled hiring, rolling NQT windows, and Verbal Ability revisions — what changed going into
            mid-2026.
          </p>
          <div className="mt-4 space-y-3">
            {TCS_LATEST_UPDATES.map((item) => (
              <section key={item.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.body}
                </p>
              </section>
            ))}
          </div>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="What 2026 TCS hiring updates mean for candidates"
              columns={TCS_LATEST_UPDATES_TABLE_COLUMNS}
              rows={TCS_LATEST_UPDATES_TABLE_ROWS}
              columnAccents={TCS_TABLE_ACCENTS_2COL}
            />
          </div>
          <TcsIntakeComparisonVisual />
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-muted)' }}>
            Warning: do not rely on a “last date to register” from a third-party site months ago. Always cross-check the
            live date on the official TCS NQT registration portal.
          </p>
        </section>

        <QuestionsList
          sectionId="tcs-questions"
          headingId="tcs-questions"
          questions={questions}
          heading={`${company.label} Interview Questions`}
          metaLabel={`${questions.length} curated · NQT & CS fundamentals · Updated 2026`}
          expanded
        />

        <TcsTechHrSplitVisual />

        <section aria-labelledby="tcs-eligibility" className="mt-10">
          <h2 id="tcs-eligibility" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            TCS Eligibility Criteria 2026
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Check eligibility before you spend hours on NQT prep — this filter is applied before registration completes,
            and backlog rules tightened for 2026.
          </p>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="TCS academic and application eligibility requirements 2026"
              columns={TCS_ELIGIBILITY_COLUMNS}
              rows={TCS_ELIGIBILITY_ROWS}
              columnAccents={TCS_TABLE_ACCENTS_2COL}
            />
          </div>
          <TcsEligibilityChecklistVisual />
          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Document checklist for verification
          </h3>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {TCS_ELIGIBILITY_DOCUMENTS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Common eligibility mistakes
          </h3>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {TCS_ELIGIBILITY_MISTAKES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tcs-hiring-process">
          <h2 id="tcs-hiring-process" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            TCS Hiring Process (2026)
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            One NQT gateway sorts candidates into Ninja, Digital, or Prime — then interviews and verification. Pair this
            guide with our{' '}
            <Link href="/blog/how-to-prepare-for-placement-interviews" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              placement interview guide
            </Link>
            {' '}and practice with{' '}
            <Link href="/signup" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              AI mock interviews
            </Link>
            .
          </p>
          <TcsFourStageProcessVisual />
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
            TCS NQT Pattern Breakdown (Foundation + Advanced)
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The National Qualifier Test is one test with two parts — not separate Digital or Prime exams. Verbal Ability
            now includes Email Writing and Passage Recall. Use the{' '}
            <Link href="/tools/question-generator/companies/tcs" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              AI Question Generator
            </Link>{' '}
            for fresh Advanced coding practice prompts.
          </p>
          <TcsNqtFlowVisual />
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="TCS NQT Foundation and Advanced section breakdown"
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
            TCS Ninja vs Digital vs Prime
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            TCS runs one NQT and slots you into three fresher bands. Your combined Foundation + Advanced performance —
            not a separate exam — determines the track.
          </p>
          <TcsTrackPyramidVisual />
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
          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Which track should you realistically target?
          </h3>
          <div className="mt-4 space-y-3">
            {TCS_TRACK_TARGETING.map((item) => (
              <section key={item.title} className="rounded-xl border p-4" style={cardStyle}>
                <h4 className="m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="tcs-digital-vs-prime">
          <h2 id="tcs-digital-vs-prime" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            TCS Salary 2026: Ninja, Digital & Prime
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {TCS_PACKAGE_COMPARISON_INTRO}
          </p>
          <TcsSalaryBarVisual />
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="TCS fresher salary comparison by track including approximate in-hand"
              columns={TCS_PACKAGE_COMPARISON_COLUMNS}
              rows={TCS_PACKAGE_COMPARISON_ROWS}
              columnAccents={TCS_TABLE_ACCENTS_4COL}
              rowAccents={TCS_PACKAGE_COMPARISON_ROW_ACCENTS}
            />
          </div>
          <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {TCS_SALARY_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>

          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Track comparison
          </h3>
          <div className="mt-4">
            <TcsResponsiveDataTable
              caption="Comparison of TCS Ninja, Digital, and Prime fresher tracks in India"
              columns={['Dimension', ...TCS_DIGITAL_PRIME_COLUMNS]}
              rows={TCS_DIGITAL_PRIME_ROWS}
              columnAccents={TCS_TABLE_ACCENTS_4COL}
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
            Realistic four-week plan assuming coursework or a parallel job search — Foundation first, then Advanced
            coding, CS fundamentals, and full mocks. Share progress in the{' '}
            <Link href="/community" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              InterviewEra Community
            </Link>
            .
          </p>
          <TcsRoadmapInfographicVisual />
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

        <section aria-labelledby="tcs-resume-tips">
          <h2 id="tcs-resume-tips" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            Resume Tips for TCS Hiring 2026
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            NQT and interviews get you hired — but a weak resume can cost a Digital/Prime shortlist look in off-campus
            volume. Run yours through the{' '}
            <Link href="/tools/ats-checker" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              ATS Resume Checker
            </Link>{' '}
            before you apply.
          </p>
          <TcsResumeBeforeAfterVisual />
          <h3 className={`mt-6 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            What recruiters and ATS systems look for
          </h3>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {TCS_RESUME_LOOK_FOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Before / after bullet examples
          </h3>
          <div className="mt-4 space-y-3">
            {TCS_RESUME_BEFORE_AFTER.map((item) => (
              <section key={item.weak} className="rounded-xl border p-4" style={cardStyle}>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-warning)' }}>
                  Weak
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.weak}</p>
                <p className="mt-3 m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent-success)' }}>
                  Stronger
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.strong}</p>
              </section>
            ))}
          </div>
          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Common resume mistakes
          </h3>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {TCS_RESUME_MISTAKES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tcs-how-to-apply">
          <h2 id="tcs-how-to-apply" className={H2_CLASS} style={{ color: 'var(--text-primary)' }}>
            How to Apply for TCS Hiring 2026
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Featured answer: visit the official TCS NQT registration portal, create an accurate academic profile, select
            the correct hiring variant, schedule and take the online NQT, then proceed to interviews if shortlisted.
            Candidates often share live window updates in the{' '}
            <Link href="/community" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              InterviewEra Community
            </Link>
            .
          </p>
          <TcsApplyStepsVisual />
          <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {TCS_APPLY_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h3 className={`mt-8 ${H3_CLASS}`} style={{ color: 'var(--text-primary)' }}>
            Off-campus vs campus
          </h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {TCS_APPLY_ROUTES.map((item) => (
              <section key={item.route} className="rounded-xl border p-4" style={cardStyle}>
                <h4 className="m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.route}</h4>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </section>
            ))}
          </div>
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
            Continue your TCS interview preparation
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Practice Technical-then-HR sequences with AI follow-ups, generate NQT-style coding prompts, and ATS-check
            your resume before you apply.
          </p>
          <ul className="mt-4 max-w-2xl list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li>Resume-aware technical + HR mock interviews</li>
            <li>Company-specific question generation for TCS</li>
            <li>ATS Resume Checker for off-campus applications</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free AI mock interview
            </Link>
            <Link
              href="/tools/question-generator/companies/tcs"
              className={`inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary) ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              AI Question Generator
            </Link>
            <Link
              href="/tools/ats-checker"
              className={`inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary) ${COMPANY_HUB_TOUCH_TARGET_CLASS}`}
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              ATS Resume Checker
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
