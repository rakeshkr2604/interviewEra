import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { ContactForm } from '@/components/contact/ContactForm';
import { ContactSidebar } from '@/components/contact/ContactSidebar';
import {
  IE_MARKETING_EYEBROW_PILL_CLASS,
  IE_MARKETING_EYEBROW_PILL_STYLE,
} from '@/lib/theme/component-classes';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { generateMetadata, schemaIds, siteConfig } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

const PAGE_PATH = '/contact';
const PAGE_DESCRIPTION =
  'Contact InterviewEra support — send a message about billing, account help, or product questions. We reply within one business day.';

const POLICY_LINKS = [
  { href: '/refund', label: 'Refund Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/privacy#cookies', label: 'Cookie Policy' },
] as const;

export const metadata: Metadata = generateMetadata({
  title: 'Contact',
  documentTitleAbsolute: 'Contact InterviewEra — Support & Help',
  socialTitle: 'Contact InterviewEra',
  description: PAGE_DESCRIPTION,
  path: PAGE_PATH,
  keywords: ['InterviewEra contact', 'InterviewEra support', 'mock interview help'],
});

export default function ContactPage() {
  const breadcrumbLd = breadcrumbListJsonLd(
    [
      { name: 'Home', path: '/' },
      { name: 'Contact', path: PAGE_PATH },
    ],
    siteConfig.url,
  );
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact InterviewEra',
    description: PAGE_DESCRIPTION,
    url: `${siteConfig.url}${PAGE_PATH}`,
    inLanguage: 'en-IN',
    isPartOf: { '@id': `${siteConfig.url}#website` },
    about: { '@id': schemaIds.organization },
  } as const;

  return (
    <main id="main-content" style={{ color: 'var(--text-primary)' }}>
      {/* Hero — matches /pricing dot-texture + gradient rhythm */}
      <section className="relative overflow-hidden pb-8 pt-2.5 sm:pb-10 md:pb-12">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 80%)',
            maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 80%)',
          }}
        />
        <div className={cn(LANDING_PAGE_CONTAINER, 'relative px-4 sm:px-5')}>
          <div className="mx-auto max-w-3xl text-center">
            <span
              className={IE_MARKETING_EYEBROW_PILL_CLASS}
              style={IE_MARKETING_EYEBROW_PILL_STYLE}
            >
              <Mail className="size-3.5" aria-hidden />
              Contact
            </span>
            <h1
              className="mt-5 font-[family-name:var(--font-bricolage)] text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-5xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Get in touch
            </h1>
            <p
              className="mx-auto mt-4 max-w-xl text-base leading-relaxed sm:text-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              Questions about billing, your account, or the product? Send us a message — we typically reply within one business day.
            </p>
            <p
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-success) 30%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
                color: 'var(--accent-success)',
              }}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              Reply within 1 business day
            </p>
          </div>
        </div>
      </section>

      {/* Two-column body */}
      <section className="pb-10 pt-2 sm:pb-12">
        <div className={cn(LANDING_PAGE_CONTAINER, 'px-4 sm:px-5')}>
          <div className="grid gap-8 lg:grid-cols-5 lg:items-stretch lg:gap-10 xl:gap-12">
            <div className="order-2 lg:order-1 lg:col-span-2">
              <ContactSidebar />
            </div>
            <div className="order-1 flex lg:order-2 lg:col-span-3">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      {/* Policy links — sits in the blank band just above the site footer line */}
      <nav
        className={cn(LANDING_PAGE_CONTAINER, 'px-4 pb-6 sm:px-5 sm:pb-8')}
        aria-label="Legal policies"
      >
        <div
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          {POLICY_LINKS.map(({ href, label }, i) => (
            <span key={href} className="inline-flex items-center gap-x-2">
              {i > 0 && <span aria-hidden>|</span>}
              <Link
                href={href}
                className="font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-primary)' }}
              >
                {label}
              </Link>
            </span>
          ))}
        </div>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    </main>
  );
}
