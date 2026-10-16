import Image from 'next/image'
import Link from 'next/link'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import type { Company } from '@/lib/seo/programmatic/companies'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import {
  INFOSYS_SE_APTITUDE_STRATEGY,
  INFOSYS_SE_APTITUDE_TOPICS,
  INFOSYS_SE_CODING_TOPICS,
  INFOSYS_SE_EDITORIAL_NOTE,
  INFOSYS_SE_FAQ_ITEMS,
  INFOSYS_SE_HACKWITHINFY_CARDS,
  INFOSYS_SE_HERO_ALT,
  INFOSYS_SE_HERO_HEIGHT,
  INFOSYS_SE_HERO_PATH,
  INFOSYS_SE_HERO_WIDTH,
  INFOSYS_SE_HIRING_STEPS,
  INFOSYS_SE_HR_CARDS,
  INFOSYS_SE_INFYTQ_CARDS,
  INFOSYS_SE_LAST_UPDATED,
  INFOSYS_SE_PREP_RESOURCE_LINKS,
  INFOSYS_SE_PROJECT_DISCUSSION_TOPICS,
  INFOSYS_SE_PROCESS_ALT,
  INFOSYS_SE_SELECTION_CRITERIA,
  INFOSYS_SE_PROCESS_HEIGHT,
  INFOSYS_SE_PROCESS_PATH,
  INFOSYS_SE_PROCESS_WIDTH,
  INFOSYS_SE_READING_TIME,
  INFOSYS_SE_RESUME_EXAMPLES,
  INFOSYS_SE_REVIEWED_DATE,
  INFOSYS_SE_REVIEWER_NAME,
  INFOSYS_SE_AUTHOR_NAME,
  INFOSYS_SE_ROADMAP_WEEKS,
  INFOSYS_SE_TECHNICAL_TOPIC_CARDS,
  INFOSYS_SE_TOC_SECTIONS,
  INFOSYS_SE_VS_TCS_ROWS,
} from '@/lib/seo/programmatic/infosys-se-hub'
import { companyQuestionsPath, intersectionQuestionsPath, questionsHubPath } from '@/lib/seo/programmatic'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function InfosysSeHubArticle({
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
            <span className="ie-blog-article-h1__accent">Interview Questions 2026</span>
          </h1>
          <p className="ie-blog-article-deck">
            A complete Software Engineer preparation hub covering InfyTQ, HackWithInfy, aptitude, DSA, Core CS
            technical interviews, HR round strategy, resume examples, Infosys vs TCS comparison, and expert answers
            for {role.label} roles in India.
          </p>
          <div className="ie-blog-article-meta ie-role-ba-hero-badges mt-5 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {company.avgPackageRange} avg. package
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              {questions.length} curated questions
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {INFOSYS_SE_READING_TIME}
            </span>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={INFOSYS_SE_HERO_PATH}
            alt={INFOSYS_SE_HERO_ALT}
            width={INFOSYS_SE_HERO_WIDTH}
            height={INFOSYS_SE_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={INFOSYS_SE_TOC_SECTIONS} />
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
              <dd className="m-0">{INFOSYS_SE_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{INFOSYS_SE_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{INFOSYS_SE_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{INFOSYS_SE_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{INFOSYS_SE_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {INFOSYS_SE_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="infosys-se-why-different">
          <h2 id="infosys-se-why-different" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Why Infosys Interviews Are Different
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Infosys Software Engineer hiring blends mass-campus efficiency with multi-stage filtering — InfyTQ or
            HackWithInfy first, then coding assessment, Core CS technical panels, and a dedicated HR round. Unlike
            product-company loops optimized for hard algorithmic speed alone, Infosys evaluates aptitude consistency,
            fundamentals breadth, and communication fit.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Compare patterns with{' '}
            <Link href={intersectionQuestionsPath('tcs', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS SWE questions
            </Link>
            ,{' '}
            <Link href={intersectionQuestionsPath('wipro', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro SWE questions
            </Link>
            ,{' '}
            <Link href={intersectionQuestionsPath('infosys', 'java-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys Java Developer questions
            </Link>
            , and{' '}
            <Link href={intersectionQuestionsPath('infosys', 'python-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys Python Developer questions
            </Link>
            . Cross-check the{' '}
            <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Software Engineer interview questions
            </Link>{' '}
            hub before you commit to a study plan.
          </p>
        </section>

        <section aria-labelledby="infosys-se-hiring-process">
          <h2 id="infosys-se-hiring-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Infosys Hiring Process
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Most Infosys Software Engineer campus and off-campus drives in India follow the sequence below. Each stage
            filters a different signal — certification readiness, coding speed, Core CS depth, and communication fit.
          </p>
          <div className="mt-4 space-y-4">
            {INFOSYS_SE_HIRING_STEPS.map((item) => (
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
                src={INFOSYS_SE_PROCESS_PATH}
                alt={INFOSYS_SE_PROCESS_ALT}
                width={INFOSYS_SE_PROCESS_WIDTH}
                height={INFOSYS_SE_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Infosys Software Engineer hiring process flow — Application through InfyTQ, Coding Assessment, Technical
              Interview, HR Round, and offer.
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Research company context on the{' '}
            <Link href={companyQuestionsPath(company.slug)} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys interview questions hub
            </Link>{' '}
            before your HR round.
          </p>
        </section>

        <section aria-labelledby="infosys-se-selection-criteria">
          <h2 id="infosys-se-selection-criteria" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Infosys Freshers Selection Criteria
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Beyond InfyTQ scores and coding tests, Infosys interviewers score six soft and technical signals that predict
            training success and client readiness. Each criterion below explains what panels evaluate — align your mock
            answers and resume bullets to these expectations.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {INFOSYS_SE_SELECTION_CRITERIA.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What interviewers evaluate:</strong> {card.evaluates}
                </p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Strengthen coding fundamentals with our{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA interview questions
            </Link>{' '}
            guide and rehearse communication scenarios from the{' '}
            <Link href="/blog/hr-interview-answer-tips-and-tricks" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              HR interview questions
            </Link>{' '}
            hub before your panel.
          </p>
        </section>

        <section aria-labelledby="infosys-se-infyTQ">
          <h2 id="infosys-se-infyTQ" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            InfyTQ &amp; HackWithInfy
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            InfyTQ is the standard campus entry gate; HackWithInfy is the elite competitive programming fast track.
            Understand both paths — most candidates focus on InfyTQ, but HackWithInfy unlocks Power Programmer offers.
          </p>
          <h3 className="mt-5 text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>InfyTQ</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {INFOSYS_SE_INFYTQ_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h4 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h4>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
              </section>
            ))}
          </div>
          <h3 className="mt-6 text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>HackWithInfy</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {INFOSYS_SE_HACKWITHINFY_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h4 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h4>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="infosys-se-technical-topics">
          <h2 id="infosys-se-technical-topics" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Technical Topics Infosys Tests
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Technical panels probe six Core CS pillars beyond coding alone. For each area: what Infosys evaluates,
            mistakes that weaken answers, and focused preparation tips. Drill topic banks on{' '}
            <Link href="/interview-questions/topics/dbms" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DBMS interview questions
            </Link>
            ,{' '}
            <Link href="/interview-questions/topics/operating-systems" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              operating system interview questions
            </Link>
            , and{' '}
            <Link href="/interview-questions/topics/sql" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              SQL interview questions
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {INFOSYS_SE_TECHNICAL_TOPIC_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What Infosys evaluates:</strong> {card.evaluates}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Common mistakes:</strong> {card.mistakes}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Preparation tips:</strong> {card.tips}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="infosys-se-aptitude">
          <h2 id="infosys-se-aptitude" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Aptitude Round
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            InfyTQ and many Infosys online assessments start with aptitude — candidates with strong DSA but weak quant
            or logical reasoning are eliminated before technical panels. Treat aptitude as a first-class prep priority.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {INFOSYS_SE_APTITUDE_TOPICS.map((topic) => (
              <section key={topic.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{topic.detail}</p>
              </section>
            ))}
          </div>
          <section className="mt-4 rounded-xl border p-4" style={cardStyle}>
            <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>Preparation strategy</h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{INFOSYS_SE_APTITUDE_STRATEGY}</p>
          </section>
        </section>

        <section aria-labelledby="infosys-se-coding-round">
          <h2 id="infosys-se-coding-round" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Coding Round
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Infosys coding assessments favour foundational DSA at easy-to-medium difficulty. Master the five topic areas
            below with difficulty calibration, time management, and mistake avoidance. Drill patterns on our{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA interview questions guide
            </Link>
            .
          </p>
          <div className="mt-4 space-y-4">
            {INFOSYS_SE_CODING_TOPICS.map((item) => (
              <section key={item.topic} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.topic}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Difficulty:</strong> {item.difficulty}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Time management:</strong> {item.timeManagement}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Common mistakes:</strong> {item.mistakes}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="infosys-se-hr-interview">
          <h2 id="infosys-se-hr-interview" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            HR Interview
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The HR round is the final filter before offer — communication clarity, company research, and relocation
            flexibility matter as much as technical scores from prior rounds. Rehearse with our{' '}
            <Link href="/blog/hr-interview-answer-tips-and-tricks" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              HR interview questions guide
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {INFOSYS_SE_HR_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="infosys-se-resume-examples">
          <h2 id="infosys-se-resume-examples" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Resume Examples
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Infosys recruiters screen hundreds of resumes per drive. Weak bullets describe tasks; strong bullets prove
            project impact, metrics, and technical depth interviewers can probe in technical rounds.
          </p>
          <div className="mt-4 space-y-4">
            {INFOSYS_SE_RESUME_EXAMPLES.map((example) => (
              <section key={example.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{example.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Weak resume bullet:</strong> {example.bad}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Strong resume bullet:</strong> {example.good}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="infosys-se-project-discussion">
          <h2 id="infosys-se-project-discussion" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Project Discussion Questions
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Infosys technical panels spend 10–20 minutes on project depth — often more decisive than a single coding
            problem. Prepare six discussion angles below with narrated examples from your capstone, internship, or
            personal builds. Java-heavy projects: review{' '}
            <Link href={intersectionQuestionsPath('infosys', 'java-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys Java Developer questions
            </Link>
            ; Python stacks:{' '}
            <Link href={intersectionQuestionsPath('infosys', 'python-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys Python Developer questions
            </Link>
            .
          </p>
          <div className="mt-4 space-y-4">
            {INFOSYS_SE_PROJECT_DISCUSSION_TOPICS.map((topic) => (
              <section key={topic.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{topic.detail}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  Example questions
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {topic.exampleQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Database-heavy projects often trigger follow-ups on{' '}
            <Link href="/interview-questions/topics/dbms" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DBMS interview questions
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/topics/sql" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              SQL interview questions
            </Link>
            ; systems projects may probe{' '}
            <Link href="/interview-questions/topics/operating-systems" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              operating system interview questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="infosys-se-vs-tcs">
          <h2 id="infosys-se-vs-tcs" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Infosys vs TCS Software Engineer
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Both are mass-hiring service companies with similar fresher SE expectations — but entry paths and round
            emphasis differ. Use this table to prioritize prep when targeting both employers.
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table ie-role-ba-compare-table--5col">
              <caption className="sr-only">Comparison of Infosys and TCS Software Engineer interview patterns</caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Dimension</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--da">Infosys</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">TCS</th>
                </tr>
              </thead>
              <tbody>
                {INFOSYS_SE_VS_TCS_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <th scope="row" className="ie-role-ba-compare-table__dim">{row[0]}</th>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row[1]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Also compare{' '}
            <Link href={intersectionQuestionsPath('tcs', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS SWE questions
            </Link>
            ,{' '}
            <Link href={intersectionQuestionsPath('wipro', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro SWE questions
            </Link>
            , and{' '}
            <Link href={intersectionQuestionsPath('infosys', 'java-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys Java Developer questions
            </Link>{' '}
            for role-track calibration.
          </p>
        </section>

        <section aria-labelledby="infosys-se-prep-resources">
          <h2 id="infosys-se-prep-resources" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Interview Preparation Resources
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {INFOSYS_SE_PREP_RESOURCE_LINKS.map((resource) => (
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

        <section aria-labelledby="infosys-se-roadmap">
          <h2 id="infosys-se-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Preparation Roadmap
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Follow the four-week plan below, then run full-loop mocks on{' '}
            <Link href="/signup" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              InterviewEra mock interviews
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {INFOSYS_SE_ROADMAP_WEEKS.map((week) => (
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

        <section id="infosys-se-questions" aria-label="Infosys Software Engineer interview questions">
          <QuestionsList
            questions={questions}
            heading={`${company.label} ${role.label} Interview Questions`}
            metaLabel="Expanded expert answers · Updated 2026"
            expanded
          />
        </section>

        <section aria-labelledby="infosys-se-faq">
          <h2 id="infosys-se-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {INFOSYS_SE_FAQ_ITEMS.map((item) => (
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
