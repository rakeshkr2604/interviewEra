import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  howToJsonLd,
  webApplicationJsonLd,
} from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { schemaIds } from '@/lib/seo/metadata'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import {
  allStarTopicParams,
  getStarTopicBySlug,
} from '@/lib/seo/programmatic'
import {
  toolStarTopicMetadata,
  toolStarTopicBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import { LANDING_PAGE_CONTAINER, LANDING_SECTION } from '@/lib/landing/container'
import { buildToolStarTopicLinks } from '@/lib/seo/internal-linking'

export function generateStaticParams() {
  return allStarTopicParams()
}

/** Unknown slugs must 404 at the router — not soft-404 via streamed notFound() under (marketing)/loading.tsx. */
export const dynamicParams = false

type Props = { params: Promise<{ topic: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { topic: topicSlug } = await params
  const topic = getStarTopicBySlug(topicSlug)
  if (!topic) return {}
  return toolStarTopicMetadata(topic)
}

const ORIGIN = getCanonicalSiteOrigin()

const WEBAPP_LD = webApplicationJsonLd({
  name: 'STAR Answer Builder',
  description:
    'Structure your behavioral interview answers using the STAR method. Get a polished, ready-to-use answer with quality scores and improvement tips.',
  url: canonicalUrl('/tools/star-builder'),
  providerId: schemaIds.organization,
})

export default async function StarTopicPage({ params }: Props) {
  const { topic: topicSlug } = await params
  const topic = getStarTopicBySlug(topicSlug)
  if (!topic) notFound()

  const BREADCRUMB_LD = breadcrumbListJsonLd(toolStarTopicBreadcrumbs(topic), ORIGIN)
  const FAQ_LD = faqPageJsonLd([
    {
      question: `What is a good STAR answer for "${topic.questionPrompt}"?`,
      answer: `A strong STAR answer for this question covers: Situation (a specific, real scenario), Task (your specific responsibility), Action (3–4 concrete steps you took), and Result (a measurable or clearly positive outcome). See the worked example on this page for a full model answer.`,
    },
    {
      question: 'How long should a STAR answer be?',
      answer: 'A well-paced STAR answer takes 90–120 seconds when spoken aloud — roughly 200–300 words. Situation and Task together should be under 30% of the answer; Actions and Results should dominate.',
    },
    {
      question: 'Can I use the same STAR story for multiple questions?',
      answer: 'Yes — a strong story can answer multiple behavioral questions by shifting the emphasis. A "conflict" story can also demonstrate leadership, communication, or resilience. Keep 4–5 strong stories and practise adapting each one.',
    },
    {
      question: 'What is the STAR method?',
      answer: 'STAR stands for Situation, Task, Action, Result. It is a structured framework for answering behavioral interview questions — the kind that start with "Tell me about a time…" It helps you give concise, credible answers that demonstrate competency with evidence.',
    },
  ])
  const HOWTO_LD = howToJsonLd(
    `How to use the STAR method for ${topic.label} interview questions`,
    `Build a structured, credible answer to "${topic.questionPrompt}" using the STAR framework.`,
    [
      {
        name: 'Choose a specific situation',
        text: `Pick a real, recent scenario that matches the "${topic.label}" theme. The more specific it is — with names, dates, and context — the more credible your answer sounds.`,
      },
      {
        name: 'State your task clearly',
        text: 'Define your specific responsibility or goal within the situation. This is NOT the company objective — it is what YOU were accountable for. Keep it to 1–2 sentences.',
      },
      {
        name: 'Describe your actions in detail',
        text: 'This is the most important part. List 3–4 specific steps you took — not what the team did, but what YOU did. Use "I" language and include the reasoning behind each decision.',
      },
      {
        name: 'Quantify the result',
        text: 'Close with a measurable or clearly positive outcome. Numbers are best ("increased by 30%", "reduced time by 2 weeks"), but qualitative outcomes ("project launched on time", "team morale improved") also work if specific.',
      },
    ],
  )

  const linkSections = buildToolStarTopicLinks(topic)

  return (
    <>
      <JsonLdScript id="star-topic-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="star-topic-webapp-ld" data={WEBAPP_LD} />
      <JsonLdScript id="star-topic-howto-ld" data={HOWTO_LD} />
      <JsonLdScript id="star-topic-faq-ld" data={FAQ_LD} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${LANDING_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href="/tools/star-builder" className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              STAR Builder
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{topic.label}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            STAR method · behavioral interview · worked example
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            STAR Method: {topic.label} — Interview Answer Example
          </h1>

          {/* The actual question prompt in a blockquote style */}
          <blockquote
            className="mt-5 rounded-xl border-l-4 py-3 pl-4 pr-4 text-base italic leading-relaxed sm:text-lg"
            style={{
              borderLeftColor: 'var(--accent-primary)',
              background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            &ldquo;{topic.questionPrompt}&rdquo;
          </blockquote>

          <p
            className="mt-4 max-w-2xl text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {topic.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/tools/star-builder"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Build my STAR answer free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Sample STAR answer ───────────────────────────────────────────── */}
      <section className={LANDING_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Worked STAR example: {topic.label}
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Use this as a model — then adapt it with your own specific situation and measurable outcomes.
          </p>

          <div className="mt-6 grid gap-4">
            {[
              { label: 'S', heading: 'Situation', content: topic.sampleAnswer.situation, color: '#6366f1' },
              { label: 'T', heading: 'Task', content: topic.sampleAnswer.task, color: '#0ea5e9' },
              { label: 'A', heading: 'Action', content: topic.sampleAnswer.action, color: '#10b981' },
              { label: 'R', heading: 'Result', content: topic.sampleAnswer.result, color: '#f59e0b' },
            ].map((block) => (
              <div
                key={block.label}
                className="flex gap-4 rounded-xl border p-5"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: block.color, color: '#fff' }}
                >
                  {block.label}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {block.heading}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {block.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Preparation tips ─────────────────────────────────────────────── */}
      <section className={LANDING_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Tips for answering {topic.label} questions
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {topic.tips.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 rounded-lg border p-4 text-sm leading-relaxed"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  color: 'var(--text-secondary)',
                }}
              >
                <span
                  className="mt-0.5 shrink-0 text-xs font-bold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  ✓
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className={LANDING_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Frequently asked questions
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              {
                q: `What is a good STAR answer for "${topic.questionPrompt}"?`,
                a: `A strong answer covers a specific, real scenario with your personal accountability clearly stated, 3–4 concrete steps you took, and a measurable or clearly positive outcome. See the worked example above for a full model.`,
              },
              {
                q: 'How long should a STAR answer be?',
                a: 'A well-paced STAR answer takes 90–120 seconds when spoken aloud — roughly 200–300 words. Situation and Task together should take under 30% of the answer; Action and Result should dominate.',
              },
              {
                q: 'Can I use the same story for multiple questions?',
                a: 'Yes. A strong story can answer several behavioral questions by shifting emphasis. A conflict story can also demonstrate leadership or resilience. Prepare 4–5 stories and practise adapting each one.',
              },
              {
                q: 'What makes a STAR answer stand out?',
                a: 'Specificity and measurability. Vague answers ("I helped improve things") score poorly. Specific answers with numbers, names, and clear personal ownership ("I redesigned the API contract, reducing client-side errors by 40%") score highly.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className="rounded-lg border p-4"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <dt className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.q}</dt>
                <dd className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={`${LANDING_SECTION} border-y`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="max-w-xl text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Build and score your own STAR answer
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The free STAR Builder tool helps you structure a complete answer for any behavioral question,
            then scores it on specificity, relevance, and impact. Free with a registered InterviewEra account.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/tools/star-builder"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Build my STAR answer free
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Start mock interview
            </Link>
          </div>
        </div>
      </section>

      {linkSections.map((section) => (
        <SeoCrossLinksSection
          key={section.heading}
          heading={section.heading}
          links={section.links}
        />
      ))}
    </>
  )
}
