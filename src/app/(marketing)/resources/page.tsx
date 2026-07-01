import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, Layers } from 'lucide-react'
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell'
import { ContentCard } from '@/components/content/ContentCard'
import { MarketingPageHeader } from '@/components/layout/MarketingPageHeader'
import { MarketingSectionHeader } from '@/components/layout/MarketingSectionHeader'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { MARKETING_SECTION_GAP } from '@/lib/landing/container'
import {
  IE_MARKETING_CTA_PRIMARY_CLASS,
  IE_MARKETING_CTA_PRIMARY_STYLE,
  IE_MARKETING_CTA_SECONDARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_STYLE,
} from '@/lib/theme/component-classes'
import { generateMetadata } from '@/lib/seo/metadata'
import { breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld'
import { getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import {
  getFeaturedContentEntries,
  getResourceClusterLinks,
} from '@/lib/seo/content/registry'
import { CONTENT_CLUSTERS } from '@/lib/seo/content/types'

export const metadata: Metadata = generateMetadata({
  title: 'Interview Preparation Resources',
  description:
    'Central directory of placement guides, DSA topic maps, role interview hubs, company prep guides, and behavioral interview resources.',
  path: '/resources',
})

export const revalidate = 3600

const ORIGIN = getCanonicalSiteOrigin()

const RESOURCES_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Resources', path: '/resources' },
  ],
  ORIGIN,
)

export default function ResourcesHubPage() {
  const clusterLinks = getResourceClusterLinks()
  const featured = getFeaturedContentEntries()

  const clusterMap = new Map(clusterLinks.map((c) => [c.cluster, c.entries]))
  const orderedClusters = CONTENT_CLUSTERS.map((cluster) => ({
    cluster,
    entries: clusterMap.get(cluster) ?? [],
  })).filter((c) => c.entries.length > 0)

  return (
    <>
      <JsonLdScript id="resources-breadcrumb-ld" data={RESOURCES_BREADCRUMB_LD} />
      <BlogMarketingShell>
        <div className={MARKETING_SECTION_GAP}>
          <MarketingPageHeader
            eyebrow="Resource Hub"
            eyebrowIcon={Layers}
            title="Interview Preparation Resources"
          >
            <Link
              href="/blog"
              className={IE_MARKETING_CTA_PRIMARY_CLASS}
              style={IE_MARKETING_CTA_PRIMARY_STYLE}
            >
              <BookOpen className="size-4" aria-hidden />
              Browse blog
            </Link>
            <Link
              href="/interview-questions"
              className={IE_MARKETING_CTA_SECONDARY_CLASS}
              style={IE_MARKETING_CTA_SECONDARY_STYLE}
            >
              Interview questions
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </MarketingPageHeader>

          <section>
            <MarketingSectionHeader
              title="Featured Guides"
              subtitle="Start with our most complete preparation hubs."
            />
            <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 xl:grid-cols-3 xl:gap-7">
              {featured.map((entry) => (
                <li key={entry.id} className="p-0">
                  <ContentCard entry={entry} />
                </li>
              ))}
            </ul>
          </section>

          {orderedClusters.map(({ cluster, entries }) => (
            <section key={cluster}>
              <header className="mb-5 sm:mb-6">
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">{cluster}</h2>
              </header>
              <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3" role="list">
                {entries.map((entry) => (
                  <li key={entry.id} className="p-0">
                    <Link
                      href={entry.path}
                      className="group flex h-full flex-col rounded-xl border px-4 py-3.5 transition-colors hover:border-(--accent-primary)"
                      style={{
                        borderColor: 'var(--card-border)',
                        background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                      }}
                    >
                      <span className="text-sm font-semibold leading-snug group-hover:text-(--accent-primary)">
                        {entry.title.replace(/ \(2026\)$/, '')}
                      </span>
                      <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {entry.description}
                      </span>
                      <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                        {entry.category}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </BlogMarketingShell>
    </>
  )
}
