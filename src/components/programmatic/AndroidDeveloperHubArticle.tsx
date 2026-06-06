import Image from 'next/image'
import Link from 'next/link'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import { questionsHubPath } from '@/lib/seo/programmatic'
import {
  ANDROID_COMPOSE_TOPICS,
  ANDROID_CONTEXTUAL_LINKS,
  ANDROID_COROUTINES_TOPICS,
  ANDROID_EDITORIAL_NOTE,
  ANDROID_FAQ_ITEMS,
  ANDROID_FUNDAMENTALS_TOPICS,
  ANDROID_HERO_ALT,
  ANDROID_HERO_HEIGHT,
  ANDROID_HERO_PATH,
  ANDROID_HERO_WIDTH,
  ANDROID_HIRING_STEPS,
  ANDROID_JETPACK_TOPICS,
  ANDROID_KOTLIN_TOPICS,
  ANDROID_LAST_UPDATED,
  ANDROID_LIFECYCLE_STAGES,
  ANDROID_ARCHITECTURE_PRINCIPLES,
  ANDROID_MVVM_ARCHITECTURE_ALT,
  ANDROID_MVVM_ARCHITECTURE_HEIGHT,
  ANDROID_MVVM_ARCHITECTURE_PATH,
  ANDROID_MVVM_ARCHITECTURE_WIDTH,
  ANDROID_PROCESS_ALT,
  ANDROID_PROCESS_HEIGHT,
  ANDROID_PROCESS_PATH,
  ANDROID_PROCESS_WIDTH,
  ANDROID_PROJECT_DISCUSSION_TOPICS,
  ANDROID_READING_TIME,
  ANDROID_RESUME_EXAMPLES,
  ANDROID_REVIEWED_DATE,
  ANDROID_AUTHOR_NAME,
  ANDROID_REVIEWER_NAME,
  ANDROID_ROADMAP_ALT,
  ANDROID_ROADMAP_HEIGHT,
  ANDROID_ROADMAP_PATH,
  ANDROID_ROADMAP_WIDTH,
  ANDROID_ROADMAP_WEEKS,
  ANDROID_SYSTEM_DESIGN_EXAMPLES,
  ANDROID_TOC_SECTIONS,
} from '@/lib/seo/programmatic/android-developer-hub'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

function TopicGrid({
  items,
  evaluateLabel = 'What interviewers evaluate',
}: {
  items: readonly { topic: string; evaluates: string; mistakes: string; tips: string }[]
  evaluateLabel?: string
}) {
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <section key={item.topic} className="rounded-xl border p-4" style={cardStyle}>
          <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
            {item.topic}
          </h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{evaluateLabel}:</strong> {item.evaluates}
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
  )
}

export function AndroidDeveloperHubArticle({
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
            <span className="ie-blog-article-h1__accent">Interview Questions 2026</span>
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
              Kotlin · Compose · MVVM
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Updated 2026 · {ANDROID_READING_TIME}
            </span>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={ANDROID_HERO_PATH}
            alt={ANDROID_HERO_ALT}
            width={ANDROID_HERO_WIDTH}
            height={ANDROID_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={ANDROID_TOC_SECTIONS} />
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
              <dd className="m-0">{ANDROID_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{ANDROID_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{ANDROID_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{ANDROID_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{ANDROID_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {ANDROID_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="android-hiring-process">
          <h2 id="android-hiring-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Android Hiring Process
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Most Android Developer loops in India follow the sequence below — from application through online assessment,
            two technical rounds, project discussion, HR, and offer. Each stage tests a different signal.
          </p>
          <div className="mt-4 space-y-4">
            {ANDROID_HIRING_STEPS.map((item) => (
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
                src={ANDROID_PROCESS_PATH}
                alt={ANDROID_PROCESS_ALT}
                width={ANDROID_PROCESS_WIDTH}
                height={ANDROID_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Android Developer hiring process — Application, Online Assessment, Technical Rounds 1 &amp; 2, Project
              Discussion, HR, and Offer.
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="android-roadmap">
          <h2 id="android-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Android Roadmap
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Step-by-step learning path from Android basics to interview readiness. Do not jump to Compose or system
            design before you can explain Activity lifecycle and build a Repository-backed screen without hints.
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
                src={ANDROID_ROADMAP_PATH}
                alt={ANDROID_ROADMAP_ALT}
                width={ANDROID_ROADMAP_WIDTH}
                height={ANDROID_ROADMAP_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Android Developer roadmap — Basics through Kotlin, UI, Architecture, Networking, Local Storage, Compose,
              System Design, and Interview Ready.
            </figcaption>
          </figure>
        </section>

        <section aria-labelledby="android-fundamentals">
          <h2 id="android-fundamentals" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Android Fundamentals
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Technical Round 1 filters on platform fundamentals before Jetpack depth. Panels expect manifest-aware answers
            and real component trade-offs.
          </p>
          <TopicGrid items={ANDROID_FUNDAMENTALS_TOPICS} />
        </section>

        <section aria-labelledby="activity-lifecycle">
          <h2 id="activity-lifecycle" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Activity Lifecycle
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Lifecycle questions appear in nearly every Android interview. Narrate callbacks in order and tie each to
            what you save, start, or release.
          </p>
          <div className="mt-4 space-y-3">
            {ANDROID_LIFECYCLE_STAGES.map((item) => (
              <section key={item.stage} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.stage}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.detail}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="jetpack-components">
          <h2 id="jetpack-components" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Jetpack Components
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Modern Android interviews assume Jetpack literacy — ViewModel, Room, Navigation, and background work patterns.
          </p>
          <TopicGrid items={ANDROID_JETPACK_TOPICS} />
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Drill with{' '}
            <Link href="/interview-questions/topics/android" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Android topic questions
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/java-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Java developer questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="kotlin-interview-questions">
          <h2 id="kotlin-interview-questions" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Kotlin Interview Questions
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Kotlin idioms separate strong Android candidates from Java-translators. Master these five areas with code
            snippets you can write on a whiteboard.
          </p>
          <TopicGrid items={ANDROID_KOTLIN_TOPICS} />
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Also review{' '}
            <Link href="/interview-questions/java-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Java developer interview questions
            </Link>{' '}
            for OOP overlap and{' '}
            <Link href="/interview-questions/topics/java" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Java topic questions
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="coroutines">
          <h2 id="coroutines" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Coroutines
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Coroutines are standard in Kotlin Android codebases. Technical Round 2 often traces a network call from
            ViewModel through Dispatchers to UI state.
          </p>
          <TopicGrid items={ANDROID_COROUTINES_TOPICS} />
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            See also{' '}
            <Link href="/interview-questions/android-developer#android-architecture-flow" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Android architecture flow
            </Link>{' '}
            for where coroutines live in ViewModel and Repository layers.
          </p>
        </section>

        <section aria-labelledby="android-architecture-flow">
          <h2 id="android-architecture-flow" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Android Architecture Flow
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Interviewers expect you to trace data flow from UI click to remote API and back. Draw this stack when asked
            “explain your app architecture” — it is the standard MVVM + Repository pattern on modern Android teams.
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
                src={ANDROID_MVVM_ARCHITECTURE_PATH}
                alt={ANDROID_MVVM_ARCHITECTURE_ALT}
                width={ANDROID_MVVM_ARCHITECTURE_WIDTH}
                height={ANDROID_MVVM_ARCHITECTURE_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Android MVVM architecture data flow — UI through ViewModel and Repository to Room, Retrofit, and data sources.
            </figcaption>
          </figure>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ANDROID_ARCHITECTURE_PRINCIPLES.map((item) => (
              <section key={item.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Pair with{' '}
            <Link href="/interview-questions/backend-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              backend developer questions
            </Link>{' '}
            for API design context and{' '}
            <Link href="/interview-questions/topics/rest-api" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              REST API questions
            </Link>{' '}
            for networking depth.
          </p>
        </section>

        <section aria-labelledby="jetpack-compose">
          <h2 id="jetpack-compose" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Jetpack Compose
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Compose adoption is accelerating at product companies. Even XML-heavy portfolios should cover recomposition,
            state, and side effects.
          </p>
          <TopicGrid items={ANDROID_COMPOSE_TOPICS} />
        </section>

        <section aria-labelledby="android-system-design">
          <h2 id="android-system-design" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Android System Design
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Mobile system design focuses on offline UX, sync, modularization, and API boundaries — lighter than backend
            design but tests architectural thinking. Practice these three prompts.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ANDROID_SYSTEM_DESIGN_EXAMPLES.map((example) => (
              <section key={example.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{example.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{example.cover}</p>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {example.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Cross-train with{' '}
            <Link href="/interview-questions/topics/system-design" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              system design interview questions
            </Link>{' '}
            and{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA preparation
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="project-discussion">
          <h2 id="project-discussion" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Android Project Discussion
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Project rounds open with “walk me through your app.” Prepare a 3-minute demo covering architecture, API
            integration, offline behaviour, Firebase usage if any, and one performance or testing win with metrics.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {ANDROID_PROJECT_DISCUSSION_TOPICS.map((item) => (
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

        <section aria-labelledby="resume-examples">
          <h2 id="resume-examples" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Resume Examples
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Recruiters and panels scan for measurable Android impact — crash rates, startup time, installs, and
            architecture depth. Replace vague bullets with numbers.
          </p>
          <div className="mt-4 space-y-4">
            {ANDROID_RESUME_EXAMPLES.map((example) => (
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

        <section aria-labelledby="preparation-roadmap">
          <h2 id="preparation-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Preparation Roadmap
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Four-week plan balancing fundamentals, architecture, Compose, and mock interviews — aligned with typical
            India Android hiring loops.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {ANDROID_ROADMAP_WEEKS.map((week) => (
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
            Run full-loop practice on{' '}
            <Link href="/signup" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              InterviewEra mock interviews
            </Link>{' '}
            or drill with the{' '}
            <Link href="/tools/question-generator/android-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Android question generator
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="android-contextual-links">
          <h2 id="android-contextual-links" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Related Interview Preparation Guides
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Cross-train with role, topic, and company question banks — including{' '}
            <Link href="/interview-questions/frontend-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              frontend
            </Link>
            ,{' '}
            <Link href="/interview-questions/backend-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              backend
            </Link>
            ,{' '}
            <Link href="/interview-questions/topics/sql" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              SQL
            </Link>
            , and Kotlin sections on this guide.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ANDROID_CONTEXTUAL_LINKS.map((link) => (
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
          sectionId="android-questions"
          headingId="android-questions"
          questions={questions}
          heading={`${role.label} Interview Questions`}
          expanded
          metaLabel={`${questions.length} curated · Kotlin & Jetpack · Updated 2026`}
        />

        <section aria-labelledby="android-faq">
          <h2 id="android-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {ANDROID_FAQ_ITEMS.map((item) => (
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
