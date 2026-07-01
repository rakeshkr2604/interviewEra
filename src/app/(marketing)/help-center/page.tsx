import type { Metadata } from 'next';
import { LifeBuoy, Mail } from 'lucide-react';
import { HelpCenterSearch } from '@/components/help/HelpCenterSearch';
import { MarketingPageHeader } from '@/components/layout/MarketingPageHeader';
import { breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { generateMetadata, schemaIds, siteConfig } from '@/lib/seo/metadata';

const PAGE_PATH = '/help-center';
const PAGE_DESCRIPTION =
  'InterviewEra Help Center — guides and answers for getting started, interview sessions, resume & ATS, scoring, billing, and account support.';

export const metadata: Metadata = generateMetadata({
  title: 'Help Center',
  documentTitleAbsolute: 'InterviewEra Help Center — Guides & Support',
  socialTitle: 'InterviewEra Help Center',
  description: PAGE_DESCRIPTION,
  path: PAGE_PATH,
  keywords: ['InterviewEra help center', 'InterviewEra support', 'mock interview help', 'interview practice guides'],
});

export default function HelpCenterPage() {
  const breadcrumbLd = breadcrumbListJsonLd(
    [
      { name: 'Home', path: '/' },
      { name: 'Help Center', path: PAGE_PATH },
    ],
    siteConfig.url,
  );
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'InterviewEra Help Center',
    description: PAGE_DESCRIPTION,
    url: `${siteConfig.url}${PAGE_PATH}`,
    inLanguage: 'en-IN',
    isPartOf: { '@id': `${siteConfig.url}#website` },
    about: { '@id': schemaIds.organization },
  } as const;

  return (
    <main id="main-content" className="px-5 pb-24 pt-16 sm:pt-20" style={{ color: 'var(--text-primary)' }}>
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <MarketingPageHeader
          eyebrow="Help Center"
          eyebrowIcon={LifeBuoy}
          title="How can we help?"
          subtitle="Guides and answers for setting up InterviewEra, running interview sessions, understanding your scores, and managing your account."
        />
      </div>

      {/* Search + categories (client-filtered, SSR-rendered) */}
      <HelpCenterSearch />

      {/* Contact */}
      <div
        className="mx-auto mt-16 max-w-2xl rounded-2xl border-2 px-6 py-8 text-center"
        style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)' }}
      >
        <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Can&rsquo;t find what you need?
        </p>
        <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Our team replies within one business day. More documentation is on the way.
        </p>
        <a
          href="mailto:support@interviewera.in"
          className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          style={{ background: 'var(--accent-primary)', boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 30%, transparent)' }}
        >
          <Mail className="size-4" aria-hidden />
          Contact Support
        </a>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    </main>
  );
}
