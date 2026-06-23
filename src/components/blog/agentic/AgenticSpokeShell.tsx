import Link from 'next/link'
import { BlogEditorialFaq, BlogEditorialHeader } from '@/components/blog/BlogEditorialHeader'
import { BlogSignupCta } from '@/components/blog/BlogSignupCta'
import { AgenticHubKeyTakeaways } from '@/components/blog/agentic/AgenticHubKeyTakeaways'
import { AgenticHubTable, AgenticGeoLead } from '@/components/blog/agentic/AgenticHubTables'
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard'
import {
  AGENTIC_PILLAR_PATH,
  getAgenticClusterLinks,
  type AgenticSpokeConfig,
} from '@/lib/seo/blog/agentic-cluster-mvp'
import { AGENTIC_AUTHOR_NAME } from '@/lib/seo/blog/agentic-ai-hub'

export function AgenticSpokeShell({
  config,
  children,
  showQuestionGeneratorCta = false,
}: {
  config: AgenticSpokeConfig
  children: React.ReactNode
  showQuestionGeneratorCta?: boolean
}) {
  const clusterLinks = getAgenticClusterLinks(config.canonicalPath)

  return (
    <article className="ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-blog-prose--agentic-hub mx-auto w-full min-w-0">
      <BlogEditorialHeader
        category={config.category}
        singleTitle={config.singleTitle}
        readTime={config.readTime}
        updatedLabel={config.updatedLabel}
        heroSrc={config.heroPath}
        heroAlt={config.heroAlt}
      />

      <div className="ie-blog-interview-anxiety-content">
        <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Part of the{' '}
          <Link href={AGENTIC_PILLAR_PATH} className="ie-blog-inline-link">
            Agentic AI Interview Guide
          </Link>{' '}
          — InterviewEra&apos;s flagship resource for AI-assisted technical interviews in 2026.
        </p>

        <AgenticGeoLead>{config.geoLead}</AgenticGeoLead>

        <aside className="ie-agentic-hub-exec-summary" aria-label="Quick answer">
          <div className="ie-agentic-hub-exec-summary__badge">Quick answer</div>
          <p className="ie-agentic-hub-exec-summary__lead m-0">{config.quickAnswer}</p>
        </aside>

        {config.comparisonTable ? (
          <AgenticHubTable
            caption={config.comparisonTable.caption}
            headers={config.comparisonTable.headers}
            rows={config.comparisonTable.rows}
          />
        ) : null}

        {children}

        <AgenticHubKeyTakeaways items={config.takeaways} />

        <div className="my-10 sm:my-12">
          <BlogSignupCta
            title="Practice agentic-style interviews with scored feedback"
            body="Run AI mock interviews on InterviewEra and get rubric-style feedback on clarification, ownership, and communication — the same signals agentic rounds reward."
            href="/signup"
            ctaLabel="Start free mock interview"
          />
        </div>

        {showQuestionGeneratorCta ? (
          <div className="my-8">
            <FreeToolCtaBlock
              title="Generate practice problems for prompt drills"
              body="Create ambiguous API and bug-fix tasks tailored to your role — then practice prompting and verification under time pressure."
              href="/tools/question-generator"
              ctaLabel="Try question generator"
            />
          </div>
        ) : null}

        <section id="agentic-cluster-links" className="scroll-mt-24">
          <h2 className="ie-agentic-hub-section__title">More in the Agentic AI series</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Explore related guides in this cluster. Each page links back to the{' '}
            <Link href={AGENTIC_PILLAR_PATH} className="ie-blog-inline-link">
              complete agentic AI interview guide
            </Link>
            .
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {clusterLinks.map((link) => (
              <Link key={link.path} href={link.path} className="ie-agentic-pastel-link-card">
                <span className="block font-semibold">{link.label}</span>
                <span className="mt-1 block text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  {link.teaser}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 mt-10">
          <h2 className="ie-agentic-hub-section__title">Frequently asked questions</h2>
          <BlogEditorialFaq items={config.faq} accordion />
        </section>

        <div className="mt-12 sm:mt-16">
          <FreeToolCtaBlock
            title="Ready for your next agentic interview?"
            body={`Written by ${AGENTIC_AUTHOR_NAME}. Continue with scored mock sessions or return to the full pillar guide for rubrics, roadmaps, and 50+ practice questions.`}
            href="/signup"
            ctaLabel="Start free practice"
          />
        </div>
      </div>
    </article>
  )
}
