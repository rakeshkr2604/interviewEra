import Image from 'next/image'
import Link from 'next/link'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import type { Company } from '@/lib/seo/programmatic/companies'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import {
  MICROSOFT_CODING_TOPICS,
  MICROSOFT_ENGINEERING_CULTURE_CARDS,
  MICROSOFT_PRODUCT_THINKING_EVALUATES,
  MICROSOFT_PRODUCT_THINKING_TOPICS,
  MICROSOFT_SE_CURATED_QUESTIONS_LABEL,
  MICROSOFT_FAQ_ITEMS,
  MICROSOFT_GROWTH_MINDSET_CARDS,
  MICROSOFT_HM_CARDS,
  MICROSOFT_PHILOSOPHY_CARDS,
  MICROSOFT_PREP_RESOURCE_LINKS,
  MICROSOFT_RESUME_EXAMPLES,
  MICROSOFT_ROADMAP_WEEKS,
  MICROSOFT_SE_AUTHOR_NAME,
  MICROSOFT_SE_EDITORIAL_NOTE,
  MICROSOFT_SE_HERO_ALT,
  MICROSOFT_SE_HERO_HEIGHT,
  MICROSOFT_SE_HERO_PATH,
  MICROSOFT_SE_HERO_WIDTH,
  MICROSOFT_SE_LAST_UPDATED,
  MICROSOFT_SE_PROCESS_ALT,
  MICROSOFT_SE_PROCESS_HEIGHT,
  MICROSOFT_SE_PROCESS_PATH,
  MICROSOFT_SE_PROCESS_WIDTH,
  MICROSOFT_SE_READING_TIME,
  MICROSOFT_SE_REVIEWED_DATE,
  MICROSOFT_SE_REVIEWER_NAME,
  MICROSOFT_SE_TOC_SECTIONS,
  MICROSOFT_SYSTEM_DESIGN_TOPICS,
  MICROSOFT_VS_AMAZON_GOOGLE_ROWS,
} from '@/lib/seo/programmatic/microsoft-se-hub'
import { companyQuestionsPath, intersectionQuestionsPath, questionsHubPath } from '@/lib/seo/programmatic'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function MicrosoftSeHubArticle({
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
            <span className="ie-blog-article-h1__accent">Top 10 Interview Questions 2026</span>
          </h1>
          <p className="ie-blog-article-deck">
            A complete preparation guide with top 10 curated interview questions covering Microsoft&apos;s Online Assessment,
            coding interviews, system design, hiring manager round, and growth mindset culture for software engineer
            roles in India.
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
              {MICROSOFT_SE_CURATED_QUESTIONS_LABEL}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {MICROSOFT_SE_READING_TIME}
            </span>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={MICROSOFT_SE_HERO_PATH}
            alt={MICROSOFT_SE_HERO_ALT}
            width={MICROSOFT_SE_HERO_WIDTH}
            height={MICROSOFT_SE_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={MICROSOFT_SE_TOC_SECTIONS} />
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
              <dd className="m-0">{MICROSOFT_SE_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{MICROSOFT_SE_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{MICROSOFT_SE_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{MICROSOFT_SE_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{MICROSOFT_SE_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {MICROSOFT_SE_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="ms-why-different">
          <h2 id="ms-why-different" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Why Microsoft Interviews Are Different
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Microsoft does not optimize interviews solely for algorithm speed. Panels balance coding rigour with growth
            mindset, collaboration signals, and whether you can thrive on large-scale platform teams — Azure, Office,
            Windows, and enterprise services.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Strong LeetCode scores help, but hiring managers also grade how you learn from mistakes, partner across
            roles, and reason about reliability at scale. This guide includes top 10 curated questions with expanded
            expert answers. Compare expectations with{' '}
            <Link href={intersectionQuestionsPath('amazon', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Amazon SDE interviews
            </Link>{' '}
            and{' '}
            <Link href={intersectionQuestionsPath('google', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Google SDE interviews
            </Link>{' '}
            before you commit to a study plan.
          </p>
        </section>

        <section aria-labelledby="ms-hiring-philosophy">
          <h2 id="ms-hiring-philosophy" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Microsoft Hiring Philosophy
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Microsoft hiring under Satya Nadella emphasizes learn-it-all culture, inclusive collaboration, and
            customer-backward engineering. Interview feedback is compared across rounds for consistent level calibration.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {MICROSOFT_PHILOSOPHY_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="ms-engineering-culture">
          <h2 id="ms-engineering-culture" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Microsoft Engineering Culture
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Microsoft engineering culture shows up in every round — not only the hiring manager panel. These five signals
            help interviewers judge long-term fit on platform teams at scale.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {MICROSOFT_ENGINEERING_CULTURE_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What it means:</strong> {card.meaning}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Why Microsoft values it:</strong> {card.whyMicrosoft}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Sample interview signal:</strong> {card.sampleSignal}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="ms-interview-process">
          <h2 id="ms-interview-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Microsoft Interview Process
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Timelines vary by team and level, but most Microsoft software engineer loops in India follow the sequence below.
            Each stage tests a different signal — not a repeat of the previous round.
          </p>
          <div className="mt-4 space-y-4">
            {[
              { step: 'Step 1 — Resume screening', body: 'Recruiters scan for relevant impact, project depth, and level alignment. Highlight Azure, distributed systems, or platform experience where applicable.' },
              { step: 'Step 2 — Recruiter discussion', body: '30–45 minutes on background, role fit, location, and timeline. Prepare a crisp “why Microsoft / why this org” answer and clarify level expectations early.' },
              { step: 'Step 3 — Online Assessment', body: 'Timed coding logic, MCQs, and sometimes work-style scenarios. Practice under clock pressure — OA eliminates many candidates before live panels.' },
              { step: 'Step 4 — Coding interviews', body: 'Usually two rounds: DSA on a shared editor plus CS fundamentals. Explain approach before coding; state complexity; discuss edge cases aloud.' },
              { step: 'Step 5 — System design round', body: 'Common for SDE-2+. Cover APIs, storage, caching, queues, and failure modes. Draw diagrams and justify trade-offs clearly.' },
              { step: 'Step 6 — Hiring manager round', body: 'Growth mindset and collaboration questions plus team fit. Expect deep follow-ups on projects, conflict, and what you learned from failure.' },
              { step: 'Step 7 — Offer', body: 'Compensation includes base, RSUs, and bonus. Level confirmation happens before the written offer — negotiate the full package.' },
            ].map((item) => (
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
                src={MICROSOFT_SE_PROCESS_PATH}
                alt={MICROSOFT_SE_PROCESS_ALT}
                width={MICROSOFT_SE_PROCESS_WIDTH}
                height={MICROSOFT_SE_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Microsoft SDE hiring process flow — Application through Recruiter Screen, OA, coding and system design
              rounds, Hiring Manager, and offer.
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Before OA, align your resume with{' '}
            <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Software Engineer interview questions
            </Link>{' '}
            and the{' '}
            <Link href={companyQuestionsPath(company.slug)} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Microsoft company interview hub
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="ms-resume-examples">
          <h2 id="ms-resume-examples" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Microsoft Resume Examples
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Microsoft recruiters screen for measurable impact, engineering ownership, scalability proof, and performance
            improvements. Weak bullets describe tasks; strong bullets prove decisions recruiters can discuss in hiring
            manager rounds.
          </p>
          <div className="mt-4 space-y-4">
            {MICROSOFT_RESUME_EXAMPLES.map((example) => (
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

        <section aria-labelledby="ms-coding-interviews">
          <h2 id="ms-coding-interviews" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Coding Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Microsoft coding rounds test structured problem-solving under time pressure. Interviewers want narrated
            reasoning, clean implementation, and correct complexity analysis — not silent coding.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {MICROSOFT_CODING_TOPICS.map((item) => (
              <section key={item.topic} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.topic}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Difficulty:</strong> {item.difficulty}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Preparation strategy:</strong> {item.strategy}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Common mistakes:</strong> {item.mistakes}
                </p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Drill patterns with{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA interview questions
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/topics/algorithms" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              algorithms topic questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="ms-system-design">
          <h2 id="ms-system-design" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            System Design Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            System design rounds evaluate whether you can architect reliable services at scale — not just draw boxes.
            Microsoft interviewers probe trade-offs, failure modes, and operational awareness.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {MICROSOFT_SYSTEM_DESIGN_TOPICS.map((item) => (
              <section key={item.area} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.area}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.detail}</p>
              </section>
            ))}
          </div>
          <section className="mt-4 rounded-xl border p-4" style={cardStyle}>
            <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              What Microsoft interviewers evaluate
            </h3>
            <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <li>Clear requirements clarification and scope boundaries for the target level.</li>
              <li>Justified technology choices with explicit trade-offs (consistency, cost, latency).</li>
              <li>Failure handling, monitoring, and how you would iterate after launch.</li>
              <li>Communication — diagram narration and responding to “what if scale 10×?” follow-ups.</li>
            </ul>
          </section>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Pair design prep with{' '}
            <Link href="/interview-questions/topics/system-design" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              system design interview questions
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/topics/aws" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              cloud architecture questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="ms-product-thinking">
          <h2 id="ms-product-thinking" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Product Thinking at Microsoft
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Microsoft SDE loops — especially hiring manager and senior design rounds — often probe product sense.
            You do not need PM experience, but you should reason about user pain, prioritization, and success metrics
            on familiar Microsoft surfaces.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {MICROSOFT_PRODUCT_THINKING_TOPICS.map((topic) => (
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
              {MICROSOFT_PRODUCT_THINKING_EVALUATES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Pair product prep with{' '}
            <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Software Engineer interview questions
            </Link>{' '}
            and{' '}
            <Link href="/blog/what-is-star-method-with-examples" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              STAR method guide
            </Link>{' '}
            for structured behavioural answers.
          </p>
        </section>

        <section aria-labelledby="ms-growth-mindset">
          <h2 id="ms-growth-mindset" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Growth Mindset
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Growth mindset is Microsoft&apos;s signature behavioural signal. Build at least one story per theme below —
            with honest reflection, metrics, and what you changed afterward. Structure answers using our{' '}
            <Link href="/blog/what-is-star-method-with-examples" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              STAR method guide
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {MICROSOFT_GROWTH_MINDSET_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Meaning:</strong> {card.meaning}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Why Microsoft values it:</strong> {card.whyMicrosoft}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Sample interview question:</strong> {card.sampleQuestion}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Strong answer indicators:</strong> {card.strongSignal}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="ms-hiring-manager">
          <h2 id="ms-hiring-manager" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Hiring Manager Round
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The hiring manager round is often the final filter before offer. It confirms level fit, team alignment,
            and whether your growth mindset stories survive deep follow-ups.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {MICROSOFT_HM_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Practise concise behavioural delivery with{' '}
            <Link href="/blog/overcome-interview-anxiety-mock-interviews" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              behavioural interview preparation tips
            </Link>{' '}
            and{' '}
            <Link href="/blog/hr-interview-answer-tips-and-tricks" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              HR interview questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="ms-prep-resources">
          <h2 id="ms-prep-resources" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Microsoft Interview Preparation Resources
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Use these guides alongside this Microsoft SDE hub and its top 10 curated questions. Each resource targets
            a different signal Microsoft evaluates — coding depth, design thinking, behavioural structure, or
            cross-company calibration.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {MICROSOFT_PREP_RESOURCE_LINKS.map((resource) => (
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

        <section aria-labelledby="ms-vs-big-tech">
          <h2 id="ms-vs-big-tech" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Microsoft vs Amazon vs Google Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Big Tech loops share DSA expectations but weight behavioural and design signals differently. Use this table
            to prioritize prep time before you commit to a Microsoft-first study plan. Drill company-specific patterns on{' '}
            <Link href={intersectionQuestionsPath('amazon', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Amazon SWE questions
            </Link>{' '}
            and{' '}
            <Link href={intersectionQuestionsPath('google', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Google SWE questions
            </Link>
            .
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table ie-role-ba-compare-table--5col">
              <caption className="sr-only">Comparison of Microsoft, Amazon, and Google software engineer interview patterns</caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Dimension</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--da">Microsoft</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">Amazon</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--pm">Google</th>
                </tr>
              </thead>
              <tbody>
                {MICROSOFT_VS_AMAZON_GOOGLE_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <th scope="row" className="ie-role-ba-compare-table__dim">{row[0]}</th>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row[1]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[2]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--pm">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="ms-roadmap">
          <h2 id="ms-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Microsoft Preparation Roadmap
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {MICROSOFT_ROADMAP_WEEKS.map((week) => (
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
            Review the top 10 curated questions below, then run full-loop mocks on{' '}
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

        <section id="ms-questions" aria-label="Top 10 Microsoft Software Engineer curated interview questions">
          <QuestionsList
            questions={questions}
            heading={`Top 10 ${company.label} ${role.label} Interview Questions`}
            metaLabel={`${MICROSOFT_SE_CURATED_QUESTIONS_LABEL} · Updated 2026`}
            expanded
          />
        </section>

        <section aria-labelledby="ms-faq">
          <h2 id="ms-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {MICROSOFT_FAQ_ITEMS.map((item) => (
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
