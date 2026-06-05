import Image from 'next/image'
import Link from 'next/link'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import type { Company } from '@/lib/seo/programmatic/companies'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import {
  INFOSYS_CODING_TOPICS,
  INFOSYS_FAQ_ITEMS,
  INFOSYS_HIRING_STEPS,
  INFOSYS_JAVA_EDITORIAL_NOTE,
  INFOSYS_JAVA_HERO_ALT,
  INFOSYS_JAVA_HERO_HEIGHT,
  INFOSYS_JAVA_HERO_PATH,
  INFOSYS_JAVA_HERO_WIDTH,
  INFOSYS_JAVA_LAST_UPDATED,
  INFOSYS_JAVA_READING_TIME,
  INFOSYS_JAVA_REVIEWED_DATE,
  INFOSYS_JAVA_REVIEWER_NAME,
  INFOSYS_JAVA_AUTHOR_NAME,
  INFOSYS_JAVA_SKILL_CARDS,
  INFOSYS_JAVA_TOC_SECTIONS,
  INFOSYS_MICROSERVICES_TOPICS,
  INFOSYS_JAVA_PROCESS_ALT,
  INFOSYS_JAVA_PROCESS_HEIGHT,
  INFOSYS_JAVA_PROCESS_PATH,
  INFOSYS_JAVA_PROCESS_WIDTH,
  INFOSYS_PREP_RESOURCE_LINKS,
  INFOSYS_RESUME_EXAMPLES,
  INFOSYS_ROADMAP_WEEKS,
  INFOSYS_SPRING_BOOT_TOPICS,
  INFOSYS_VS_TCS_ROWS,
} from '@/lib/seo/programmatic/infosys-java-hub'
import { companyQuestionsPath, intersectionQuestionsPath, questionsHubPath } from '@/lib/seo/programmatic'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function InfosysJavaHubArticle({
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
            <span className="ie-blog-article-h1__line">{company.label} {role.label}</span>
            <span className="ie-blog-article-h1__accent">Interview Questions 2026</span>
          </h1>
          <p className="ie-blog-article-deck">
            A complete Java interview preparation hub covering InfyTQ, HackWithInfy, Core Java, Spring Boot,
            microservices, coding round strategy, resume examples, Infosys vs TCS comparison, and expert answers
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
              Updated 2026 · {INFOSYS_JAVA_READING_TIME}
            </span>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={INFOSYS_JAVA_HERO_PATH}
            alt={INFOSYS_JAVA_HERO_ALT}
            width={INFOSYS_JAVA_HERO_WIDTH}
            height={INFOSYS_JAVA_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={INFOSYS_JAVA_TOC_SECTIONS} />
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
              <dd className="m-0">{INFOSYS_JAVA_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{INFOSYS_JAVA_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{INFOSYS_JAVA_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{INFOSYS_JAVA_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{INFOSYS_JAVA_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {INFOSYS_JAVA_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="infosys-why-different">
          <h2 id="infosys-why-different" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Why Infosys Java Interviews Are Different
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Infosys Java Developer interviews blend mass-hiring efficiency with genuine technical depth. Unlike product
            companies that optimize for algorithmic speed alone, Infosys panels test whether you can explain Core Java,
            write clean code under time pressure, and articulate Spring Boot project decisions — while clearing InfyTQ
            or HackWithInfy gates first.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Fresher loops emphasize fundamentals over exotic system design. Strong candidates show OOP clarity, collection
            fluency, REST API awareness, and communication fit in HR. Compare patterns with{' '}
            <Link href={intersectionQuestionsPath('tcs', 'java-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS Java Developer questions
            </Link>
            ,{' '}
            <Link href={intersectionQuestionsPath('wipro', 'java-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro Java Developer questions
            </Link>
            , and the canonical{' '}
            <Link href="/interview-questions/java-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Java interview questions
            </Link>{' '}
            hub to calibrate your study plan.
          </p>
        </section>

        <section aria-labelledby="infosys-hiring-process">
          <h2 id="infosys-hiring-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Infosys Hiring Process
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Most Infosys Java Developer campus and off-campus drives in India follow the sequence below. Each stage
            filters a different signal — certification readiness, coding speed, Java depth, and communication fit.
          </p>
          <div className="mt-4 space-y-4">
            {INFOSYS_HIRING_STEPS.map((item) => (
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
                src={INFOSYS_JAVA_PROCESS_PATH}
                alt={INFOSYS_JAVA_PROCESS_ALT}
                width={INFOSYS_JAVA_PROCESS_WIDTH}
                height={INFOSYS_JAVA_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Infosys Java Developer hiring process flow — Application through InfyTQ, Coding Assessment, Technical
              Round, HR Round, and offer.
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Research company context on the{' '}
            <Link href={companyQuestionsPath(company.slug)} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys interview questions hub
            </Link>{' '}
            and rehearse{' '}
            <Link href="/blog/hr-interview-answer-tips-and-tricks" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              HR interview questions
            </Link>{' '}
            before your final round.
          </p>
        </section>

        <section aria-labelledby="infosys-java-skills">
          <h2 id="infosys-java-skills" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Java Skills Infosys Evaluates
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Technical panels probe depth across seven Core Java pillars. For each area below: what interviewers evaluate,
            mistakes that weaken answers, and focused preparation tips. Cross-check against the{' '}
            <Link href="/interview-questions/java-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Java interview questions
            </Link>{' '}
            bank before your technical round.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {INFOSYS_JAVA_SKILL_CARDS.map((card) => (
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

        <section aria-labelledby="infosys-spring-boot">
          <h2 id="infosys-spring-boot" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Spring Boot Questions
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Spring Boot appears frequently in Infosys Java Developer technical rounds — especially when your resume
            lists a backend project. Panels expect practical awareness, not framework trivia alone. Drill the dedicated{' '}
            <Link href="/interview-questions/topics/spring-boot" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Spring Boot interview questions
            </Link>{' '}
            topic page alongside this section.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {INFOSYS_SPRING_BOOT_TOPICS.map((topic) => (
              <section key={topic.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{topic.detail}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="infosys-microservices">
          <h2 id="infosys-microservices" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Microservices Questions
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Entry-level candidates are not expected to design Netflix-scale systems — but awareness of microservice
            patterns signals readiness for Infosys digital and cloud engagements.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {INFOSYS_MICROSERVICES_TOPICS.map((topic) => (
              <section key={topic.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{topic.detail}</p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Pair microservices prep with{' '}
            <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              microservices interview questions
            </Link>{' '}
            on our Software Engineer hub and{' '}
            <Link href="/interview-questions/topics/system-design" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              system design questions
            </Link>{' '}
            for senior-track depth.
          </p>
        </section>

        <section aria-labelledby="infosys-coding-strategy">
          <h2 id="infosys-coding-strategy" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Coding Round Strategy
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Infosys coding assessments and technical rounds favour foundational DSA — not hard competitive programming.
            Master the five topic areas below with difficulty calibration, time management, and mistake avoidance.
          </p>
          <div className="mt-4 space-y-4">
            {INFOSYS_CODING_TOPICS.map((item) => (
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
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Drill patterns on our{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA interview questions guide
            </Link>{' '}
            before InfyTQ and live coding rounds.
          </p>
        </section>

        <section aria-labelledby="infosys-resume-examples">
          <h2 id="infosys-resume-examples" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Resume Examples
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Infosys recruiters screen hundreds of Java resumes per drive. Weak bullets describe tasks; strong bullets
            prove performance, scalability, and measurable impact interviewers can probe in technical rounds.
          </p>
          <div className="mt-4 space-y-4">
            {INFOSYS_RESUME_EXAMPLES.map((example) => (
              <section key={example.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {example.title}
                </h3>
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

        <section aria-labelledby="infosys-vs-tcs">
          <h2 id="infosys-vs-tcs" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Infosys vs TCS Java Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Both are mass-hiring service companies with similar fresher Java expectations — but entry paths and round
            emphasis differ. Use this table to prioritize prep when targeting both employers.
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table ie-role-ba-compare-table--5col">
              <caption className="sr-only">Comparison of Infosys and TCS Java Developer interview patterns</caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Dimension</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--da">Infosys</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">TCS</th>
                </tr>
              </thead>
              <tbody>
                {INFOSYS_VS_TCS_ROWS.map((row) => (
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
            Compare full process details on{' '}
            <Link href={intersectionQuestionsPath('tcs', 'java-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS Java Developer questions
            </Link>{' '}
            and{' '}
            <Link href={intersectionQuestionsPath('wipro', 'java-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Wipro Java Developer questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="infosys-prep-resources">
          <h2 id="infosys-prep-resources" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Interview Preparation Resources
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Use these guides alongside this Infosys Java hub. Each resource targets a different signal Infosys
            evaluates — Core Java depth, Spring Boot fluency, architecture awareness, cross-company calibration, or HR
            communication.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {INFOSYS_PREP_RESOURCE_LINKS.map((resource) => (
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

        <section aria-labelledby="infosys-roadmap">
          <h2 id="infosys-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Preparation Roadmap
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {INFOSYS_ROADMAP_WEEKS.map((week) => (
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
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Align behavioural prep with{' '}
            <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              software engineer interview questions
            </Link>
            , then run full-loop mocks on{' '}
            <Link href="/signup" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              InterviewEra mock interviews
            </Link>
            .
          </p>
        </section>

        <section id="infosys-questions" aria-label="Infosys Java Developer interview questions">
          <QuestionsList
            questions={questions}
            heading={`${company.label} ${role.label} Interview Questions`}
            metaLabel="Expanded expert answers · Updated 2026"
            expanded
          />
        </section>

        <section aria-labelledby="infosys-faq">
          <h2 id="infosys-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {INFOSYS_FAQ_ITEMS.map((item) => (
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
