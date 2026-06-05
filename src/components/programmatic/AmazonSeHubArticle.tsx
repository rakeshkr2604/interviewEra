import Image from 'next/image'
import Link from 'next/link'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import type { Company } from '@/lib/seo/programmatic/companies'
import type { Role } from '@/lib/seo/programmatic/roles'
import type { SeoQuestion } from '@/lib/seo/programmatic/types'
import {
  AMAZON_BAR_RAISER_CARDS,
  AMAZON_COMPANY_COMPARISON_ROWS,
  AMAZON_FAQ_ITEMS,
  AMAZON_LP_CARDS,
  AMAZON_PREP_RESOURCE_LINKS,
  AMAZON_RESUME_EXAMPLES,
  AMAZON_ROADMAP_WEEKS,
  AMAZON_SWE_CONTEXTUAL_LINKS,
  AMAZON_SE_AUTHOR_NAME,
  AMAZON_SE_EDITORIAL_NOTE,
  AMAZON_SE_HERO_ALT,
  AMAZON_SE_HERO_HEIGHT,
  AMAZON_SE_HERO_PATH,
  AMAZON_SE_HERO_WIDTH,
  AMAZON_SE_LAST_UPDATED,
  AMAZON_SE_PROCESS_ALT,
  AMAZON_SE_PROCESS_HEIGHT,
  AMAZON_SE_PROCESS_PATH,
  AMAZON_SE_PROCESS_WIDTH,
  AMAZON_SE_READING_TIME,
  AMAZON_SE_REVIEWED_DATE,
  AMAZON_SE_REVIEWER_NAME,
  AMAZON_SE_TOC_SECTIONS,
} from '@/lib/seo/programmatic/amazon-se-hub'
import { companyQuestionsPath, intersectionQuestionsPath, questionsHubPath } from '@/lib/seo/programmatic'

const PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const CONTENT_CLASS = 'ie-blog-interview-anxiety-content'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const

export function AmazonSeHubArticle({
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
            A complete preparation guide covering Amazon&apos;s Online Assessment, technical rounds, Leadership Principles,
            Bar Raiser interview, and offer journey for software engineer roles in India.
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
              Updated 2026 · {AMAZON_SE_READING_TIME}
            </span>
          </div>
        </div>

        <div className="ie-role-ba-hero-image">
          <Image
            src={AMAZON_SE_HERO_PATH}
            alt={AMAZON_SE_HERO_ALT}
            width={AMAZON_SE_HERO_WIDTH}
            height={AMAZON_SE_HERO_HEIGHT}
            quality={95}
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
          />
        </div>

        <div className={`${CONTENT_CLASS} ie-role-ba-toc-slot`}>
          <BaTableOfContents sections={AMAZON_SE_TOC_SECTIONS} />
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
              <dd className="m-0">{AMAZON_SE_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{AMAZON_SE_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{AMAZON_SE_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{AMAZON_SE_REVIEWED_DATE}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reading time:</dt>
              <dd className="m-0">{AMAZON_SE_READING_TIME}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {AMAZON_SE_EDITORIAL_NOTE}
          </p>
        </aside>

        <section aria-labelledby="amazon-why-different">
          <h2 id="amazon-why-different" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Why Amazon Interviews Are Different
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Amazon does not treat interviews as isolated skill checks. Every round — coding, work simulation, behavioural,
            and Bar Raiser — is designed to answer one question: will this person raise the bar long-term? That is why
            strong LeetCode performance alone is rarely enough.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Panels grade how you think under ambiguity, how you communicate trade-offs aloud, and whether your past
            decisions reflect Amazon&apos;s Leadership Principles. Technical correctness matters, but ownership,
            customer impact, and depth of reflection carry equal weight in the loop. Compare patterns across{' '}
            <Link href={intersectionQuestionsPath('google', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Google SDE interviews
            </Link>{' '}
            and{' '}
            <Link href={intersectionQuestionsPath('microsoft', 'software-engineer')} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Microsoft SDE interviews
            </Link>
            , and{' '}
            <Link href="/interview-questions/ios-developer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Apple SWE interview questions
            </Link>{' '}
            to calibrate expectations.
          </p>
        </section>

        <section aria-labelledby="amazon-hiring-philosophy">
          <h2 id="amazon-hiring-philosophy" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Understanding Amazon Hiring Philosophy
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Amazon hiring optimizes for durable builders — engineers who deliver results, dive deep when metrics look
            wrong, and earn trust while insisting on high standards. Interviewers use Leadership Principles as a shared
            language so feedback is comparable across teams and levels.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Bar-raising over slot-filling',
                body: 'Hiring managers are encouraged to reject good candidates if they are not clearly better than current team members at the target level.',
              },
              {
                title: 'Principles over personality',
                body: 'Culture fit is evaluated through documented principles and STAR evidence — not vague “team vibe” impressions.',
              },
              {
                title: 'Written feedback discipline',
                body: 'Interviewers submit structured feedback mapped to LPs. Your stories must survive cross-round comparison.',
              },
              {
                title: 'Customer-backward decisions',
                body: 'Strong answers tie engineering choices to customer outcomes, latency, trust, or cost — not internal politics alone.',
              },
            ].map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="amazon-interview-process">
          <h2 id="amazon-interview-process" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Amazon Interview Process (2026)
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Timelines vary by team and level, but most software engineer loops in India follow the sequence below.
            Treat each stage as a filter for a different signal — not a repeat of the previous round.
          </p>
          <div className="mt-4 space-y-4">
            {[
              { step: 'Step 1 — Resume screening', body: 'Recruiters scan for relevant impact, project depth, and level alignment. Tailor bullets to measurable outcomes and technologies Amazon teams use (AWS, distributed systems, services at scale).' },
              { step: 'Step 2 — Recruiter screening', body: '30–45 minutes on background, role fit, location, and timeline. Prepare a crisp “why Amazon / why this team” answer and clarify level expectations early.' },
              { step: 'Step 3 — Online Assessment', body: 'Timed coding logic, work-style simulations, and sometimes debugging-style tasks. Practice under clock pressure and read instructions carefully — OA eliminates many candidates before live panels.' },
              { step: 'Step 4 — Technical interviews', body: 'Usually two rounds: DSA on a shared editor plus CS fundamentals. Experienced candidates may see system design. Explain approach before coding; state complexity; test edge cases aloud.' },
              { step: 'Step 5 — Behavioural interviews', body: 'Leadership Principle questions using STAR format. Expect deep follow-ups on metrics, alternatives considered, and what you would change today.' },
              { step: 'Step 6 — Bar Raiser round', body: 'Independent interviewer assesses long-term bar. Can veto despite strong technical scores. Prepare cross-LP stories and honest reflection — not rehearsed slogans.' },
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
                src={AMAZON_SE_PROCESS_PATH}
                alt={AMAZON_SE_PROCESS_ALT}
                width={AMAZON_SE_PROCESS_WIDTH}
                height={AMAZON_SE_PROCESS_HEIGHT}
                quality={95}
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Amazon SDE hiring process flow — Application through Recruiter Screen, OA, technical and behavioural rounds,
              Bar Raiser, and offer.
            </figcaption>
          </figure>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Before OA, align your resume narrative with{' '}
            <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Software Engineer interview questions
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/topics/aws" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              AWS interview questions
            </Link>{' '}
            if your projects use cloud services.
          </p>
        </section>

        <section aria-labelledby="amazon-resume-examples">
          <h2 id="amazon-resume-examples" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Amazon Resume Examples
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Amazon recruiters screen for ownership, metrics, impact, and technical depth in every bullet. Weak lines
            describe tasks; strong lines prove decisions and measurable outcomes recruiters can map to Leadership
            Principles.
          </p>
          <div className="mt-4 space-y-4">
            {AMAZON_RESUME_EXAMPLES.map((example) => (
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

        <section aria-labelledby="amazon-online-assessment">
          <h2 id="amazon-online-assessment" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Online Assessment
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The OA is Amazon&apos;s scalable first technical filter. It tests whether you can reason clearly under time
            limits — not whether you have memorized 500 LeetCode problems. Work-simulation sections evaluate judgment,
            prioritization, and how you handle ambiguous customer-facing scenarios.
          </p>
          <ul className="mt-3 max-w-3xl list-disc pl-5 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            <li>Practice 2–3 timed assessments per week with strict clocks.</li>
            <li>Read every prompt twice — OA often penalizes misinterpretation more than slow coding.</li>
            <li>Review debugging and code-tracing questions, not only algorithm puzzles.</li>
          </ul>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Build OA stamina using{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA interview questions
            </Link>{' '}
            and{' '}
            <Link href="/interview-questions/topics/data-structures" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              data structures topic questions
            </Link>{' '}
            under timed conditions.
          </p>
        </section>

        <section aria-labelledby="amazon-technical-rounds">
          <h2 id="amazon-technical-rounds" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Technical Rounds
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Live technical rounds combine data structures, algorithms, and fundamentals. Interviewers want a narrated
            problem-solving process: clarify constraints, propose approach, implement cleanly, analyze complexity, and
            discuss tests. For SDE-2+, add system design vocabulary — APIs, storage, caching, queues, and failure modes.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Pair DSA prep with{' '}
            <Link href="/blog/top-dsa-interview-questions" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              DSA interview questions
            </Link>
            ,{' '}
            <Link href="/interview-questions/topics/system-design" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              system design interview questions
            </Link>
            , and{' '}
            <Link href="/interview-questions/topics/algorithms" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              algorithms topic questions
            </Link>{' '}
            for broader fundamentals coverage.
          </p>
        </section>

        <section aria-labelledby="amazon-leadership-principles">
          <h2 id="amazon-leadership-principles" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Leadership Principles
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            These ten principles appear most frequently in software engineer loops. Build at least one STAR story per
            principle — with metrics, trade-offs, and what you learned. Structure stories using our{' '}
            <Link href="/blog/what-is-star-method-with-examples" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              STAR method guide
            </Link>{' '}
            and practise behavioural delivery with{' '}
            <Link href="/blog/overcome-interview-anxiety-mock-interviews" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              behavioural interview preparation tips
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {AMAZON_LP_CARDS.map((lp) => (
              <section key={lp.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{lp.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Meaning:</strong> {lp.meaning}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>What interviewers evaluate:</strong> {lp.evaluates}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Sample interview question:</strong> {lp.sampleQuestion}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-success)' }}>Strong answer signal:</strong> {lp.strongSignal}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-warning)' }}>Weak answer signal:</strong> {lp.weakSignal}
                </p>
              </section>
            ))}
          </div>
        </section>

        <section aria-labelledby="amazon-star-method">
          <h2 id="amazon-star-method" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            STAR Method for Amazon Behavioural Rounds
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Amazon behavioural interviews expect STAR structure by default. Read the full framework on our{' '}
            <Link href="/blog/what-is-star-method-with-examples" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              STAR method guide
            </Link>
            , then practise aloud until each story fits in 3–4 minutes with room for follow-ups.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Situation', body: 'Set context in 2–3 sentences: team, constraint, stakes.' },
              { label: 'Task', body: 'Your specific responsibility — not the team’s generic goal.' },
              { label: 'Action', body: 'What you did, why you chose it, and what alternatives you rejected.' },
              { label: 'Result', body: 'Quantified outcome plus what you learned or changed afterward.' },
            ].map((item) => (
              <section key={item.label} className="rounded-xl border p-4" style={cardStyle}>
                <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-primary)' }}>{item.label}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              </section>
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border p-4" style={{ ...cardStyle, borderColor: 'var(--v3-ok-brd)', background: 'color-mix(in srgb, var(--v3-okdim) 60%, var(--card-bg))' }}>
              <h3 className="m-0 text-sm font-semibold" style={{ color: 'var(--accent-success)' }}>Good answer example</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                “Our checkout error rate spiked 18% (Situation). I owned the incident bridge (Task). I segmented failures
                by payment provider, rolled back a risky deploy, and added guardrail alerts (Action). Errors fell to baseline
                in 4 hours; repeat incidents dropped 40% over the next quarter (Result).”
              </p>
            </section>
            <section className="rounded-xl border p-4" style={{ ...cardStyle, borderColor: 'color-mix(in srgb, var(--accent-warning) 32%, transparent)', background: 'color-mix(in srgb, var(--accent-warning) 8%, var(--card-bg))' }}>
              <h3 className="m-0 text-sm font-semibold" style={{ color: 'var(--accent-warning)' }}>Weak answer example</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                “We had a bug and the team fixed it quickly. I helped where needed and customers were happy.” — No metrics,
                no personal decision, no trade-offs, and no LP signal.
              </p>
            </section>
          </div>
          <section className="mt-4 rounded-xl border p-4" style={cardStyle}>
            <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>Common STAR mistakes</h3>
            <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <li>Using “we” for every action — interviewers cannot grade your contribution.</li>
              <li>Skipping numbers — Amazon panels expect measurable impact.</li>
              <li>Choosing stories with no real conflict or trade-off.</li>
              <li>Ending at implementation — always close with customer or business outcome.</li>
            </ul>
          </section>
        </section>

        <section aria-labelledby="amazon-bar-raiser">
          <h2 id="amazon-bar-raiser" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Bar Raiser Round
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            The Bar Raiser is an independent evaluator trained to protect long-term hiring quality. They are not trying
            to trick you — they are testing whether your judgement, ownership, and standards match Amazon&apos;s bar at
            the target level.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {AMAZON_BAR_RAISER_CARDS.map((card) => (
              <section key={card.title} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{card.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Combine Bar Raiser prep with{' '}
            <Link href="/blog/hr-interview-answer-tips-and-tricks" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              HR interview questions
            </Link>{' '}
            frameworks so your answers stay concise under pressure.
          </p>
        </section>

        <section aria-labelledby="amazon-roadmap">
          <h2 id="amazon-roadmap" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Amazon Interview Preparation Roadmap
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {AMAZON_ROADMAP_WEEKS.map((week) => (
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
            Run full-loop mocks on{' '}
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

        <section aria-labelledby="amazon-prep-resources">
          <h2 id="amazon-prep-resources" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Amazon Interview Preparation Resources
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Use these curated guides alongside this Amazon SDE hub. Each resource targets a different signal Amazon
            evaluates — coding depth, design thinking, behavioural structure, or HR communication.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AMAZON_PREP_RESOURCE_LINKS.map((resource) => (
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
          <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            For broader placement context, also review{' '}
            <Link href="/blog/top-interview-questions-for-software-engineers" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              top software engineer interview questions
            </Link>{' '}
            and the{' '}
            <Link href={companyQuestionsPath(company.slug)} className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Amazon company interview hub
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="amazon-company-comparison">
          <h2 id="amazon-company-comparison" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Amazon vs Google vs Microsoft vs Meta Interviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Big Tech loops share DSA expectations but weight behavioural signals differently. Use this table to prioritize
            prep time before you commit to an Amazon-first study plan.
          </p>
          <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
            <table className="ie-role-ba-compare-table ie-role-ba-compare-table--5col">
              <caption className="sr-only">
                Comparison of Amazon, Google, Microsoft, and Meta software engineer interview patterns
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Dimension</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">Amazon</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--da">Google</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--pm">Microsoft</th>
                  <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--pm">Meta</th>
                </tr>
              </thead>
              <tbody>
                {AMAZON_COMPANY_COMPARISON_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <th scope="row" className="ie-role-ba-compare-table__dim">{row[0]}</th>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[1]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row[2]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--pm">{row[3]}</td>
                    <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--pm">{row[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AMAZON_SWE_CONTEXTUAL_LINKS.map((link) => (
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

        <section id="amazon-questions" aria-label="Amazon Software Engineer interview questions">
          <QuestionsList
            questions={questions}
            heading={`${company.label} ${role.label} Interview Questions`}
            expanded
          />
        </section>

        <section aria-labelledby="amazon-faq">
          <h2 id="amazon-faq" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <div className="ie-blog-faq-stack">
            {AMAZON_FAQ_ITEMS.map((item) => (
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
