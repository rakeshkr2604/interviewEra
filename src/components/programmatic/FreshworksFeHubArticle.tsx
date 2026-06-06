import Image from 'next/image'
import Link from 'next/link'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import type { Company } from '@/lib/seo/programmatic/companies'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import {
  FRESHWORKS_BROWSER_TOPICS,
  FRESHWORKS_CSS_TOPICS,
  FRESHWORKS_FAQ_ITEMS,
  FRESHWORKS_FE_AUTHOR_NAME,
  FRESHWORKS_FE_CONTEXTUAL_LINKS,
  FRESHWORKS_FE_EDITORIAL_NOTE,
  FRESHWORKS_FE_HERO_ALT,
  FRESHWORKS_FE_HERO_HEIGHT,
  FRESHWORKS_FE_HERO_PATH,
  FRESHWORKS_FE_HERO_WIDTH,
  FRESHWORKS_FE_LAST_UPDATED,
  FRESHWORKS_FE_PROCESS_ALT,
  FRESHWORKS_FE_PROCESS_HEIGHT,
  FRESHWORKS_FE_PROCESS_PATH,
  FRESHWORKS_FE_PROCESS_WIDTH,
  FRESHWORKS_FE_READING_TIME,
  FRESHWORKS_FE_REVIEWED_DATE,
  FRESHWORKS_FE_REVIEWER_NAME,
  FRESHWORKS_FE_TOC_SECTIONS,
  FRESHWORKS_HIRING_STEPS,
  FRESHWORKS_JS_TOPICS,
  FRESHWORKS_PERFORMANCE_TOPICS,
  FRESHWORKS_PREP_RESOURCE_LINKS,
  FRESHWORKS_PROCESS_FLOW_STEPS,
  FRESHWORKS_PRODUCT_THINKING_EVALUATES,
  FRESHWORKS_PRODUCT_THINKING_TOPICS,
  FRESHWORKS_PROJECT_DISCUSSION_TOPICS,
  FRESHWORKS_REACT_ARCHITECTURE_FLOW,
  FRESHWORKS_REACT_RECONCILIATION_POINTS,
  FRESHWORKS_REACT_TOPICS,
  FRESHWORKS_RESUME_EXAMPLES,
  FRESHWORKS_ROADMAP_WEEKS,
} from '@/lib/seo/programmatic/freshworks-fe-hub'
import { companyQuestionsPath, intersectionQuestionsPath, questionsHubPath } from '@/lib/seo/programmatic'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function FreshworksFeHubArticle({
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
            A complete preparation guide covering JavaScript, React, browser internals, CSS, performance optimization,
            product thinking, and Freshworks&apos; hiring process for frontend developer roles in India.
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
              Updated 2026 · {FRESHWORKS_FE_READING_TIME}
            </span>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={FRESHWORKS_FE_HERO_PATH}
            alt={FRESHWORKS_FE_HERO_ALT}
            width={FRESHWORKS_FE_HERO_WIDTH}
            height={FRESHWORKS_FE_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={FRESHWORKS_FE_TOC_SECTIONS} />
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
              <dd className="m-0">{FRESHWORKS_FE_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{FRESHWORKS_FE_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{FRESHWORKS_FE_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{FRESHWORKS_FE_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{FRESHWORKS_FE_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {FRESHWORKS_FE_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="fw-why-different">
          <h2 id="fw-why-different" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Why Freshworks Frontend Interviews Are Different
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Freshworks is a product company building SaaS tools used by millions — Freshdesk, Freshchat, Freshsales, and
            Freshservice. Frontend interviews go beyond framework trivia: panels evaluate whether you can ship
            production-quality UI with strong JavaScript fundamentals, React architecture, performance awareness, and
            product thinking.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Unlike service-company frontend loops that focus on HTML/CSS basics, Freshworks probes browser internals,
            component design under real constraints, and how you would improve their products. Compare patterns with{' '}
            <Link href={intersectionQuestionsPath('zoho', 'frontend-developer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Zoho Frontend Developer questions
            </Link>
            ,{' '}
            <Link href="/interview-questions/frontend-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Frontend Developer interview questions
            </Link>
            , and the{' '}
            <Link href={companyQuestionsPath(company.slug)} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Freshworks company hub
            </Link>{' '}
            to calibrate your study plan.
          </p>
        </section>

        <section aria-labelledby="fw-hiring-process">
          <h2 id="fw-hiring-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Freshworks Hiring Process
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Most Freshworks Frontend Developer loops in India follow the sequence below. Each stage tests a different
            signal — not a repeat of the previous round.
          </p>
          <div className="mt-4 space-y-4">
            {FRESHWORKS_HIRING_STEPS.map((item) => (
              <section key={item.step} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.step}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-6 rounded-xl border p-4" style={cardStyle} aria-label="Freshworks frontend hiring process flow">
            <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              Hiring process flow
            </h3>
            <ol className="ie-role-amazon-process-flow mt-4 list-none p-0">
              {FRESHWORKS_PROCESS_FLOW_STEPS.map((step, index) => (
                <li key={step} className="ie-role-amazon-process-flow__step">
                  <span className="ie-role-amazon-process-flow__marker" aria-hidden>{index + 1}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{step}</span>
                </li>
              ))}
            </ol>
          </section>

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
                src={FRESHWORKS_FE_PROCESS_PATH}
                alt={FRESHWORKS_FE_PROCESS_ALT}
                width={FRESHWORKS_FE_PROCESS_WIDTH}
                height={FRESHWORKS_FE_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Freshworks Frontend Developer hiring process — Application through Online Coding, Frontend Rounds 1 &amp; 2,
              HR Interview, and Offer.
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="fw-javascript">
          <h2 id="fw-javascript" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            JavaScript Fundamentals
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            JavaScript depth is the foundation of every Freshworks frontend round. Panels expect you to explain concepts
            with code examples and trace execution — not recite MDN definitions.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FRESHWORKS_JS_TOPICS.map((item) => (
              <section key={item.topic} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.topic}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What Freshworks evaluates:</strong> {item.evaluates}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Common mistakes:</strong> {item.mistakes}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Preparation tips:</strong> {item.tips}
                </p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Drill patterns with{' '}
            <Link href="/interview-questions/topics/javascript" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              JavaScript interview questions
            </Link>{' '}
            and{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA interview questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="fw-react">
          <h2 id="fw-react" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            React Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Freshworks builds modern React frontends for complex SaaS admin surfaces. Technical Round 1 often includes
            live component implementation — expect hooks, state management, and performance trade-offs.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FRESHWORKS_REACT_TOPICS.map((item) => (
              <section key={item.topic} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.topic}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What Freshworks evaluates:</strong> {item.evaluates}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Common mistakes:</strong> {item.mistakes}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Preparation tips:</strong> {item.tips}
                </p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Review{' '}
            <Link href="/interview-questions/topics/react" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              React interview questions
            </Link>{' '}
            and build 2–3 portfolio components you can walk through live.
          </p>
        </section>

        <section aria-labelledby="fw-react-architecture">
          <h2 id="fw-react-architecture" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            React Architecture
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Freshworks panels expect you to trace what happens from a user click to pixels on screen. The flow below is
            the mental model interviewers want you to narrate — not just name individual React APIs.
          </p>
          <section className="mt-4 rounded-xl border p-4" style={cardStyle} aria-label="React update flow from user action to DOM">
            <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              React update flow
            </h3>
            <ol className="ie-role-amazon-process-flow mt-4 list-none p-0">
              {FRESHWORKS_REACT_ARCHITECTURE_FLOW.map((step, index) => (
                <li key={step} className="ie-role-amazon-process-flow__step">
                  <span className="ie-role-amazon-process-flow__marker" aria-hidden>{index + 1}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{step}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="mt-4 rounded-xl border p-4" style={cardStyle}>
            <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              The reconciliation process
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Reconciliation is how React decides what changed between renders and applies the smallest possible update
              to the real DOM. Walk interviewers through these steps in order:
            </p>
            <ol className="mt-3 list-decimal pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {FRESHWORKS_REACT_RECONCILIATION_POINTS.map((point) => (
                <li key={point} className="mt-1">{point}</li>
              ))}
            </ol>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Interview tip:</strong> Draw this flow on a whiteboard
              when asked “what happens when I click a button in React?” Start with the event handler, end with the DOM
              patch — not with “React re-renders.”
            </p>
          </section>
        </section>

        <section aria-labelledby="fw-browser-internals">
          <h2 id="fw-browser-internals" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Browser Internals
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Technical Round 2 probes whether you understand what happens between your JavaScript and the pixels on
            screen. This separates candidates who debug performance issues from those who only know framework APIs.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FRESHWORKS_BROWSER_TOPICS.map((item) => (
              <section key={item.topic} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.topic}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What Freshworks evaluates:</strong> {item.evaluates}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Common mistakes:</strong> {item.mistakes}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Preparation tips:</strong> {item.tips}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="fw-css-responsive">
          <h2 id="fw-css-responsive" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            CSS &amp; Responsive Design
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Freshworks products must work across devices and browsers globally. Panels test layout architecture,
            responsive strategy, and accessibility — not just whether you can center a div.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FRESHWORKS_CSS_TOPICS.map((item) => (
              <section key={item.topic} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.topic}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What Freshworks evaluates:</strong> {item.evaluates}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Common mistakes:</strong> {item.mistakes}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Preparation tips:</strong> {item.tips}
                </p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Practice with{' '}
            <Link href="/interview-questions/topics/css" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              CSS interview questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="fw-performance">
          <h2 id="fw-performance" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frontend Performance
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Performance is a first-class concern at Freshworks scale — agents and customers interact with UI under real
            load. Expect questions on optimization strategies with measurable outcomes.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FRESHWORKS_PERFORMANCE_TOPICS.map((item) => (
              <section key={item.topic} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.topic}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What Freshworks evaluates:</strong> {item.evaluates}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Common mistakes:</strong> {item.mistakes}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Preparation tips:</strong> {item.tips}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="fw-product-thinking">
          <h2 id="fw-product-thinking" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Product Thinking
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Freshworks frontend interviews often include product sense questions — especially in later rounds and HR.
            You do not need PM experience, but you should reason about user pain, prioritization, and success metrics
            on familiar Freshworks surfaces.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FRESHWORKS_PRODUCT_THINKING_TOPICS.map((topic) => (
              <section key={topic.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{topic.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{topic.body}</p>
              </section>
            ))}
          </div>
          <section className="mt-4 rounded-xl border p-4" style={cardStyle}>
            <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              What interviewers evaluate
            </h3>
            <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {FRESHWORKS_PRODUCT_THINKING_EVALUATES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </section>

        <section aria-labelledby="fw-project-discussion">
          <h2 id="fw-project-discussion" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frontend Project Discussion
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Technical Round 1 and HR often open with “tell me about a project you built.” Freshworks interviewers probe
            six areas below — prepare a 3-minute walkthrough for your best React project covering each one with specific
            decisions and trade-offs.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {FRESHWORKS_PROJECT_DISCUSSION_TOPICS.map((item) => (
              <section key={item.area} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.area}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What to cover:</strong> {item.cover}
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Example interviewer questions:</p>
                <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="fw-resume-examples">
          <h2 id="fw-resume-examples" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Resume Examples
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Freshworks recruiters screen for measurable frontend impact — performance gains, accessibility improvements,
            UX outcomes, and numbers recruiters can discuss in technical rounds.
          </p>
          <div className="mt-4 space-y-4">
            {FRESHWORKS_RESUME_EXAMPLES.map((example) => (
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

        <section aria-labelledby="fw-roadmap">
          <h2 id="fw-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Preparation Roadmap
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {FRESHWORKS_ROADMAP_WEEKS.map((week) => (
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
            Review the curated questions below, then run full-loop mocks on{' '}
            <Link href="/signup" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              InterviewEra mock interviews
            </Link>{' '}
            or drill prompts with the{' '}
            <Link href="/tools/question-generator" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              free question generator
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="fw-prep-resources">
          <h2 id="fw-prep-resources" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Preparation Resources
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Use these guides alongside this Freshworks Frontend Developer hub. Each resource targets a different signal
            Freshworks evaluates.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FRESHWORKS_PREP_RESOURCE_LINKS.map((resource) => (
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

        <section aria-labelledby="fw-contextual-links">
          <h2 id="fw-contextual-links" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Related Interview Preparation Guides
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Cross-train with role, topic, and company-specific question banks. Freshworks frontend panels overlap
            heavily with JavaScript, React, and CSS fundamentals — plus product-company comparisons against peers
            like TCS and Accenture.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRESHWORKS_FE_CONTEXTUAL_LINKS.map((link) => (
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

        <section id="fw-questions" aria-label="Freshworks Frontend Developer interview questions">
          <QuestionsList
            questions={questions}
            heading={`${company.label} ${role.label} Interview Questions`}
            expanded
          />
        </section>

        <section aria-labelledby="fw-faq">
          <h2 id="fw-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {FRESHWORKS_FAQ_ITEMS.map((item) => (
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
